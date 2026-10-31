import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { Badge } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { userDb } from "@/lib/db/server";
import { fmtDateTime } from "@/lib/dates";
import { maskPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { Composer } from "./composer";

const TICKS: Record<string, string> = { queued: "🕓", sent: "✓", delivered: "✓✓", read: "✓✓ read", failed: "⚠ failed", received: "" };

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireRole("admin", "coordinator");
  const sp = await searchParams;
  const t = await getTranslations();
  const db = await userDb();
  const filter = sp.f ?? "all";

  let q = db
    .from("conversations")
    .select(
      "id, window_expires_at, unread_count, updated_at, patients!inner(id, full_name, phone_e164, deleted_at, leads(id, needs_human, bot_enabled, assigned_to, closed_at))",
    )
    .is("patients.deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (filter === "unread") q = q.gt("unread_count", 0);
  const { data: convs } = await q;
  type Lead = { id: string; needs_human: boolean; bot_enabled: boolean; assigned_to: string | null; closed_at: string | null };
  type Row = {
    id: string;
    window_expires_at: string | null;
    unread_count: number;
    updated_at: string;
    patient: { full_name: string; phone_e164: string };
    lead: Lead | null;
  };
  const rows: Row[] = (convs ?? [])
    .map((c) => {
      const p = c.patients as unknown as { full_name: string; phone_e164: string; leads: Lead[] };
      return { ...c, patient: p, lead: p.leads.find((l) => !l.closed_at) ?? p.leads[0] ?? null };
    })
    .filter((r) =>
      filter === "human"
        ? r.lead?.needs_human
        : filter === "mine"
          ? r.lead?.assigned_to === s.userId
          : filter === "bot"
            ? r.lead?.bot_enabled
            : true,
    );

  const selected = rows.find((r) => r.id === sp.c) ?? null;
  const [{ data: messages }, { data: templates }] = selected
    ? await Promise.all([
        db
          .from("messages")
          .select("id, direction, sender, type, body, template_name, status, created_at, is_internal_note, media_id")
          .eq("conversation_id", selected.id)
          .order("created_at")
          .limit(300),
        db.from("wa_templates").select("id, name, language, body_preview, variables").eq("status", "APPROVED").eq("is_enabled", true),
      ])
    : [{ data: [] }, { data: [] }];
  if (selected && selected.unread_count > 0) await db.from("conversations").update({ unread_count: 0 }).eq("id", selected.id);
  const windowOpen = !!selected?.window_expires_at && new Date(selected.window_expires_at) > new Date();
  const tabs: [string, string][] = [
    ["all", t("inbox.all")],
    ["human", t("inbox.needsHuman")],
    ["unread", "Unread"],
    ["mine", t("inbox.mine")],
    ["bot", t("inbox.botActive")],
  ];

  return (
    <div className="grid h-[calc(100vh-7rem)] gap-3 md:grid-cols-[320px_1fr]">
      <RealtimeRefresh tables={["messages", "conversations", "leads"]} channel="inbox" />
      <aside className={cn("flex flex-col overflow-hidden rounded-lg border border-border bg-surface", selected && "hidden md:flex")}>
        <nav aria-label="Inbox filters" className="flex flex-wrap gap-1 border-b border-border p-2">
          {tabs.map(([k, label]) => (
            <Link
              key={k}
              href={`/inbox?f=${k}`}
              aria-current={filter === k}
              className={cn("rounded px-2 py-1 text-xs", filter === k ? "bg-brand text-brand-text" : "hover:bg-bg")}
            >
              {label}
            </Link>
          ))}
        </nav>
        <ul className="flex-1 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/inbox?f=${filter}&c=${r.id}`}
                className={cn("block border-b border-border p-3 text-sm hover:bg-bg", r.id === selected?.id && "bg-bg")}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{r.patient.full_name || maskPhone(r.patient.phone_e164)}</span>
                  {r.unread_count > 0 && <Badge tone="brand">{r.unread_count}</Badge>}
                </div>
                <div className="flex gap-1 text-xs text-muted">
                  {maskPhone(r.patient.phone_e164)} {r.lead?.needs_human && <Badge tone="danger">{t("inbox.needsHuman")}</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <section
        className={cn("flex flex-col overflow-hidden rounded-lg border border-border bg-surface", !selected && "hidden md:flex")}
        aria-label="Conversation"
      >
        {!selected ? (
          <p className="m-auto text-muted">{t("inbox.noConversation")}</p>
        ) : (
          <>
            <header className="flex items-center gap-2 border-b border-border p-3">
              <Link href={`/inbox?f=${filter}`} className="md:hidden" aria-label="Back">
                ←
              </Link>
              <span className="font-medium">{selected.patient.full_name || "—"}</span>
              {selected.lead && (
                <Link className="ml-auto text-sm underline" href={`/leads/${selected.lead.id}`}>
                  Profile
                </Link>
              )}
            </header>
            <ol className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
              {(messages ?? []).map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    m.is_internal_note
                      ? "mx-auto border border-dashed border-amber-400 bg-amber-50"
                      : m.direction === "in"
                        ? "bg-bg"
                        : "ml-auto bg-emerald-50",
                  )}
                >
                  <div className="mb-0.5 text-[11px] text-muted">
                    {m.is_internal_note ? "note" : m.sender}
                    {m.template_name ? ` · ${m.template_name}` : ""}
                  </div>
                  <div className="whitespace-pre-wrap">{m.body ?? `[${m.type}]`}</div>
                  <div className="mt-0.5 text-right text-[11px] text-muted">
                    {fmtDateTime(m.created_at)} {m.direction === "out" && !m.is_internal_note ? TICKS[m.status] : ""}
                  </div>
                </li>
              ))}
            </ol>
            <Composer
              conversationId={selected.id}
              leadId={selected.lead?.id ?? null}
              windowOpen={windowOpen}
              botEnabled={selected.lead?.bot_enabled ?? false}
              templates={templates ?? []}
            />
          </>
        )}
      </section>
    </div>
  );
}
