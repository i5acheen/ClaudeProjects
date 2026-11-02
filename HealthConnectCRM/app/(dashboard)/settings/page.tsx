import { getTranslations } from "next-intl/server";
import { Badge, Card } from "@/components/ui";
import { PROMPT_VERSION } from "@/lib/ai/prompts/sahayak";
import { requireRole } from "@/lib/auth/session";
import { parseOrgSettings } from "@/lib/crm/org";
import { userDb } from "@/lib/db/server";
import { KbForm, SettingsForm } from "./forms";

export default async function SettingsPage() {
  const s = await requireRole("admin");
  const t = await getTranslations("settings");
  const db = await userDb();
  const [{ data: org }, { data: kb }, { data: templates }] = await Promise.all([
    db.from("orgs").select("settings").eq("id", s.profile.org_id).single(),
    db.from("kb_articles").select("id, title, body, language, is_published").order("created_at"),
    db.from("wa_templates").select("id, name, language, category, status").order("name"),
  ]);
  const settings = parseOrgSettings(org?.settings);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h1 className="mb-3 text-xl font-semibold">{t("bot")} & data</h1>
        <SettingsForm
          botEnabled={settings.bot.enabled}
          documentDays={settings.retention.document_days}
          anonymiseDays={settings.retention.anonymise_days}
          mappings={JSON.stringify(settings.meta_field_mappings, null, 2)}
          formIds={settings.meta_form_ids.join(", ")}
        />
        <p className="mt-3 text-xs text-muted">
          WhatsApp assistant mode:{" "}
          {(process.env.AI_PROVIDER ?? "none") === "none"
            ? "rules only — emergency reply (108), handover on request, document acknowledgement; all other messages go to coordinators"
            : `AI (${process.env.AI_PROVIDER}), prompt ${PROMPT_VERSION}`}
        </p>
      </Card>
      <div className="space-y-4">
        <Card>
          <h2 className="mb-2 font-medium">{t("kb")}</h2>
          {(kb ?? []).map((a) => (
            <KbForm key={a.id} article={a} />
          ))}
          <KbForm />
        </Card>
        <Card>
          <h2 className="mb-2 font-medium">{t("templates")}</h2>
          <p className="mb-2 text-xs text-muted">Synced nightly from WhatsApp Manager.</p>
          <ul className="text-sm">
            {(templates ?? []).map((tp) => (
              <li key={tp.id} className="flex gap-2 border-t border-border py-1">
                <span className="font-mono">{tp.name}</span>
                <span>{tp.language}</span>
                <span className="text-muted">{tp.category}</span>
                <Badge tone={tp.status === "APPROVED" ? "brand" : "warn"}>{tp.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
