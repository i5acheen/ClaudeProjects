import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { userDb } from "@/lib/db/server";
import { fmtDateTime } from "@/lib/dates";
import { stageKey } from "@/lib/stages";
import { CallPanel, DocumentRow, HospitalControl, NoteForm, StageControl } from "./client";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin", "coordinator");
  const { id } = await params;
  const t = await getTranslations();
  const db = await userDb();
  const { data: lead } = await db.from("leads").select("*, patients!inner(*), campaigns(name, meta_ad_id)").eq("id", id).maybeSingle();
  if (!lead) notFound();
  const patient = lead.patients as unknown as {
    id: string;
    full_name: string;
    phone_e164: string;
    age: number | null;
    district: string | null;
    taluka: string | null;
    preferred_language: string;
    consent_whatsapp: boolean;
    consent_at: string | null;
    consent_source: string | null;
    opted_out_at: string | null;
  };
  const campaign = lead.campaigns as unknown as { name: string; meta_ad_id: string | null } | null;

  const [facts, docs, events, tasks, notes, consents, hospitals, auditRows, conv, calls, staff] = await Promise.all([
    db.from("lead_facts").select("key, value, source, confidence, updated_at").eq("lead_id", id),
    db
      .from("documents")
      .select("id, kind, mime_type, created_at, verified_at")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false }),
    db.from("stage_events").select("from_stage, to_stage, actor_type, reason, created_at").eq("lead_id", id).order("created_at"),
    db.from("tasks").select("id, type, due_at, done_at").eq("lead_id", id).order("due_at"),
    db.from("notes").select("id, body, created_at").eq("lead_id", id).order("created_at", { ascending: false }),
    db.from("consents").select("purpose, granted, text_shown, source, created_at").eq("patient_id", patient.id).order("created_at"),
    db.from("hospitals").select("id, name").eq("is_active", true).order("name"),
    db
      .from("audit_log")
      .select("action, created_at, actor_user_id")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("conversations").select("id").eq("patient_id", patient.id).limit(1).maybeSingle(),
    db
      .from("calls")
      .select("id, user_id, started_at, outcome, duration_seconds, notes")
      .eq("lead_id", id)
      .order("started_at", { ascending: false })
      .limit(50),
    db.from("profiles").select("user_id, full_name, email"),
  ]);
  const staffName = new Map((staff.data ?? []).map((p) => [p.user_id, p.full_name || p.email || "—"]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{patient.full_name || "—"}</h1>
        <Badge tone="brand">{t(`stage.${stageKey(lead.stage)}`)}</Badge>
        {lead.needs_human && <Badge tone="danger">{t("inbox.needsHuman")}</Badge>}
        {patient.opted_out_at && <Badge tone="warn">Opted out</Badge>}
        {conv.data && (
          <Link className="ml-auto underline" href={`/inbox?c=${conv.data.id}`}>
            {t("nav.inbox")}
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-1 text-sm">
          <h2 className="font-medium">{t("lead.details")}</h2>
          {/* Full number shown on the profile to coordinators only (lists are masked). */}
          <div className="font-mono">{patient.phone_e164}</div>
          <div>
            Age: {patient.age ?? "—"} · {patient.taluka ?? ""} {patient.district ?? ""}
          </div>
          <div>
            Treatment: {lead.treatment ?? "—"} · Scheme: {lead.scheme}
          </div>
          <div>
            Source: {lead.source}
            {campaign ? ` · ${campaign.name} (${campaign.meta_ad_id})` : ""}
          </div>
          <div>Language: {patient.preferred_language}</div>
        </Card>
        <Card className="space-y-2 text-sm lg:col-span-2">
          <h2 className="font-medium">Stage</h2>
          <StageControl leadId={id} stage={lead.stage} />
          {lead.lost_reason && <p className="text-muted">Lost: {lead.lost_reason}</p>}
          <h2 className="pt-2 font-medium">{t("lead.hospital")}</h2>
          <HospitalControl leadId={id} hospitalId={lead.hospital_id} visitAt={lead.visit_at} hospitals={hospitals.data ?? []} />
        </Card>
      </div>

      <Card className="space-y-3 text-sm">
        <h2 className="font-medium">{t("calls.title")}</h2>
        {patient.phone_e164.startsWith("+") && <CallPanel leadId={id} phone={patient.phone_e164} />}
        {calls.data?.length ? (
          <ul data-testid="call-history">
            {calls.data.map((c) => (
              <li key={c.id} className="border-t border-border py-1">
                {fmtDateTime(c.started_at)} — <strong>{t(`calls.outcome_${c.outcome}`)}</strong>
                {c.duration_seconds ? ` · ${Math.round(c.duration_seconds / 60)} min` : ""} · {t("calls.by")}{" "}
                {staffName.get(c.user_id) ?? "—"}
                {c.notes ? <span className="text-muted"> — {c.notes}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{t("calls.none")}</p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-2 font-medium">{t("lead.facts")}</h2>
          <dl className="text-sm">
            {(facts.data ?? []).map((f) => (
              <div key={f.key} className="flex justify-between border-t border-border py-1">
                <dt className="text-muted">{f.key}</dt>
                <dd>
                  {f.value} <span className="text-xs text-muted">({f.source})</span>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-2 font-medium">{t("lead.documents")}</h2>
          <ul>
            {(docs.data ?? []).map((d) => (
              <DocumentRow key={d.id} id={d.id} kind={d.kind} verified={!!d.verified_at} />
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-2 font-medium">{t("lead.timeline")}</h2>
          <ol className="space-y-1 text-sm">
            {(events.data ?? []).map((e, i) => (
              <li key={i}>
                {fmtDateTime(e.created_at)} — {e.from_stage === null ? "" : `${t(`stage.${stageKey(e.from_stage)}`)} → `}
                {t(`stage.${stageKey(e.to_stage)}`)}{" "}
                <span className="text-muted">
                  ({e.actor_type}
                  {e.reason ? `: ${e.reason}` : ""})
                </span>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <h2 className="mb-2 font-medium">{t("lead.notes")}</h2>
          <NoteForm leadId={id} />
          <ul className="mt-2 space-y-1 text-sm">
            {(notes.data ?? []).map((n) => (
              <li key={n.id} className="border-t border-border py-1">
                <div className="text-xs text-muted">{fmtDateTime(n.created_at)}</div>
                {n.body}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="space-y-3">
          <div>
            <h2 className="mb-1 font-medium">{t("lead.tasks")}</h2>
            <ul className="text-sm">
              {(tasks.data ?? []).map((tk) => (
                <li key={tk.id}>
                  {tk.done_at ? "✓" : "○"} {tk.type} · {fmtDateTime(tk.due_at)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-1 font-medium">{t("lead.consent")}</h2>
            <ul className="text-sm">
              {(consents.data ?? []).map((c, i) => (
                <li key={i} className="border-t border-border py-1">
                  {c.granted ? "✓" : "✗"} {c.purpose} · {c.source} · {fmtDateTime(c.created_at)}
                  <div className="text-xs text-muted">“{c.text_shown}”</div>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-2 font-medium">{t("lead.audit")}</h2>
        <p className="text-xs text-muted">Visible to admins.</p>
        <ul className="text-sm">
          {(auditRows.data ?? []).map((a, i) => (
            <li key={i}>
              {fmtDateTime(a.created_at)} — {a.action}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
