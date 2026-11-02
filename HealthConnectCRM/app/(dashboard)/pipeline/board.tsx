"use client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { moveStage } from "@/app/actions";
import { Badge } from "@/components/ui";
import type { PipelineLead } from "@/lib/leads-query";
import { maskPhone } from "@/lib/phone";
import { LOST, STAGES, stageKey } from "@/lib/stages";

const COLUMNS = [...STAGES.map((s) => s.id), LOST] as number[];

/** Kanban with native drag-and-drop plus a keyboard/phone friendly "Move to" select on every card. */
export function Board({ leads }: { leads: PipelineLead[] }) {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [optimistic, apply] = useOptimistic(leads, (state, m: { id: string; stage: number }) =>
    state.map((l) => (l.id === m.id ? { ...l, stage: m.stage } : l)),
  );

  function move(id: string, to: number) {
    const lead = optimistic.find((l) => l.id === id);
    if (!lead || lead.stage === to) return;
    let reason: string | undefined;
    if (to === LOST) {
      reason = window.prompt(t("pipeline.lostReason")) ?? undefined;
      if (!reason) return;
    }
    start(async () => {
      apply({ id, stage: to });
      const r = await moveStage({ leadId: id, toStage: to, reason });
      setError(r.ok ? null : r.error);
    });
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-2 rounded border border-red-300 bg-red-50 p-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-3 overflow-x-auto pb-2" aria-busy={pending}>
        {COLUMNS.map((col) => {
          const items = optimistic.filter((l) => l.stage === col);
          return (
            <section
              key={col}
              aria-label={t(`stage.${stageKey(col)}`)}
              className="w-72 shrink-0 rounded-lg border border-border bg-bg p-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => move(e.dataTransfer.getData("text/lead-id"), col)}
              data-testid={`column-${stageKey(col)}`}
            >
              <h2 className="mb-2 flex justify-between text-sm font-semibold">
                <span>{t(`stage.${stageKey(col)}`)}</span>
                <span className="text-muted">{items.length}</span>
              </h2>
              <ul className="space-y-2">
                {items.map((l) => (
                  <li
                    key={l.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/lead-id", l.id)}
                    className="rounded-md border border-border bg-surface p-2 text-sm shadow-sm"
                    data-testid="lead-card"
                  >
                    <Link href={`/leads/${l.id}`} className="font-medium underline-offset-2 hover:underline">
                      {l.patient.full_name || "—"}
                    </Link>
                    <div className="text-xs text-muted">
                      {maskPhone(l.patient.phone_e164)} · {l.treatment ?? "—"}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {l.needs_human && <Badge tone="danger">{t("inbox.needsHuman")}</Badge>}
                      {!l.bot_enabled && <Badge>{t("inbox.botOff")}</Badge>}
                    </div>
                    <label className="mt-2 block text-xs text-muted">
                      {t("pipeline.moveTo")}{" "}
                      <select
                        autoComplete="off"
                        aria-label={`${t("pipeline.moveTo")} — ${l.patient.full_name}`}
                        className="rounded border border-border bg-surface px-1 py-0.5 text-xs"
                        value={l.stage}
                        onChange={(e) => move(l.id, Number(e.target.value))}
                      >
                        {COLUMNS.map((c) => (
                          <option key={c} value={c}>
                            {t(`stage.${stageKey(c)}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
