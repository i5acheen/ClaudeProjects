"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { addNote, documentUrl, logCall, moveStage, updateLead, verifyDocument } from "@/app/actions";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { LOST, STAGES, stageKey } from "@/lib/stages";

function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setSaved(false);
      const r = await fn();
      setError(r.ok ? null : (r.error ?? "error"));
      setSaved(r.ok);
      if (r.ok) after?.();
    });
  return { error, saved, pending, run };
}

export function StageControl({ leadId, stage }: { leadId: string; stage: number }) {
  const t = useTranslations();
  const { error, pending, run } = useAction();
  const [to, setTo] = useState(stage);
  const [reason, setReason] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select aria-label={t("pipeline.moveTo")} value={to} onChange={(e) => setTo(Number(e.target.value))}>
        {[...STAGES.map((s) => s.id), LOST].map((s) => (
          <option key={s} value={s}>
            {t(`stage.${stageKey(s)}`)}
          </option>
        ))}
      </Select>
      <Input aria-label="Reason" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} className="w-48" />
      <Button disabled={pending || to === stage} onClick={() => run(() => moveStage({ leadId, toStage: to, reason: reason || undefined }))}>
        {t("pipeline.moveTo")}
      </Button>
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function HospitalControl({
  leadId,
  hospitalId,
  visitAt,
  hospitals,
}: {
  leadId: string;
  hospitalId: string | null;
  visitAt: string | null;
  hospitals: { id: string; name: string }[];
}) {
  const t = useTranslations("lead");
  const { error, saved, pending, run } = useAction();
  const [h, setH] = useState(hospitalId ?? "");
  const [v, setV] = useState(visitAt ? visitAt.slice(0, 16) : "");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select aria-label={t("hospital")} value={h} onChange={(e) => setH(e.target.value)}>
        <option value="">—</option>
        {hospitals.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </Select>
      <Input aria-label={t("visitAt")} type="datetime-local" value={v} onChange={(e) => setV(e.target.value)} className="w-56" />
      <Button
        disabled={pending}
        onClick={() =>
          run(() => updateLead({ leadId, hospitalId: h || null, visitAt: v ? new Date(`${v}:00+05:30`).toISOString() : null }))
        }
      >
        {t("assignHospital")}
      </Button>
      {saved && !pending && (
        <span role="status" className="text-sm text-brand">
          ✓ {t("saved")}
        </span>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function NoteForm({ leadId }: { leadId: string }) {
  const t = useTranslations("lead");
  const { error, pending, run } = useAction();
  const [body, setBody] = useState("");
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => addNote({ leadId, body }),
          () => setBody(""),
        );
      }}
    >
      <Textarea aria-label={t("addNote")} rows={2} value={body} onChange={(e) => setBody(e.target.value)} />
      <Button type="submit" disabled={pending || !body.trim()}>
        {t("addNote")}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

const KINDS = ["aadhaar", "ration_card", "scheme_card", "prescription", "report", "other"] as const;

export function DocumentRow({ id, kind, verified }: { id: string; kind: string; verified: boolean }) {
  const t = useTranslations("lead");
  const { error, pending, run } = useAction();
  const [k, setK] = useState(kind);
  async function open() {
    const r = await documentUrl(id);
    if (r.ok) window.open(r.url, "_blank", "noopener,noreferrer");
  }
  return (
    <li className="flex flex-wrap items-center gap-2 border-t border-border py-2 text-sm">
      <Button variant="secondary" onClick={open}>
        {t("open")}
      </Button>
      <Select aria-label="Document type" value={k} onChange={(e) => setK(e.target.value)}>
        {KINDS.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </Select>
      {verified ? (
        <span className="text-brand">✓ {t("verified")}</span>
      ) : (
        <Button disabled={pending} onClick={() => run(() => verifyDocument({ documentId: id, kind: k }))}>
          {t("verify")}
        </Button>
      )}
      {error && (
        <span role="alert" className="text-danger">
          {error}
        </span>
      )}
    </li>
  );
}

const OUTCOMES = ["connected", "no_answer", "busy", "switched_off", "wrong_number", "callback_requested"] as const;

/** Call from your own mobile (tel: link), then log the outcome. The log shows up in the admin Team page. */
export function CallPanel({ leadId, phone }: { leadId: string; phone: string }) {
  const t = useTranslations("calls");
  const { error, saved, pending, run } = useAction();
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]>("connected");
  const [minutes, setMinutes] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-2">
      <a
        href={`tel:${phone}`}
        onClick={() => setStartedAt(new Date().toISOString())}
        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-text"
        data-testid="call-button"
      >
        📞 {t("call")} {phone}
      </a>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () =>
              logCall({
                leadId,
                outcome,
                durationMinutes: outcome === "connected" && minutes ? Number(minutes) : null,
                notes: notes || undefined,
                startedAt: startedAt ?? undefined,
              }),
            () => {
              setNotes("");
              setMinutes("");
              setStartedAt(null);
            },
          );
        }}
      >
        <Select aria-label={t("outcome")} value={outcome} onChange={(e) => setOutcome(e.target.value as (typeof OUTCOMES)[number])}>
          {OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {t(`outcome_${o}`)}
            </option>
          ))}
        </Select>
        {outcome === "connected" && (
          <Input
            aria-label={t("minutes")}
            type="number"
            min={0}
            max={240}
            step={1}
            placeholder={t("minutes")}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-28"
          />
        )}
        <Input aria-label={t("notes")} placeholder={t("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-64" />
        <Button type="submit" disabled={pending}>
          {t("log")}
        </Button>
        {saved && !pending && (
          <span role="status" className="text-sm text-brand">
            ✓ {t("logged")}
          </span>
        )}
        {error && (
          <p role="alert" className="w-full text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
