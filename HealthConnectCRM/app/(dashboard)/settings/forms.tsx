"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { saveKbArticle, saveSettings } from "@/app/actions";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

export function SettingsForm(props: {
  botEnabled: boolean;
  documentDays: number;
  anonymiseDays: number;
  mappings: string;
  formIds: string;
}) {
  const t = useTranslations("settings");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  async function submit(fd: FormData) {
    let fieldMappings: Record<string, Record<string, string>> | undefined;
    try {
      fieldMappings = JSON.parse(String(fd.get("mappings") || "{}"));
    } catch {
      return setMsg("Field mapping must be valid JSON");
    }
    start(async () => {
      const r = await saveSettings({
        botEnabled: fd.get("botEnabled") === "on",
        documentDays: Number(fd.get("documentDays")),
        anonymiseDays: Number(fd.get("anonymiseDays")),
        fieldMappings: fieldMappings as never,
        metaFormIds: String(fd.get("formIds") || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      });
      setMsg(r.ok ? "Saved" : r.error);
    });
  }
  return (
    <form action={submit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="font-medium">{t("bot")}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="botEnabled" defaultChecked={props.botEnabled} data-testid="bot-global-toggle" /> {t("botEnabled")}
        </label>
        <p className="text-xs text-muted">
          Turning this off stops every automatic bot reply immediately; patients&apos; messages still arrive in the Inbox. See
          docs/RUNBOOK.md §6.
        </p>
      </fieldset>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="font-medium">{t("retention")}</legend>
        <div>
          <Label htmlFor="dd">Delete documents after admission/lost (days)</Label>
          <Input id="dd" name="documentDays" type="number" min={7} defaultValue={props.documentDays} />
        </div>
        <div>
          <Label htmlFor="ad">Anonymise patient after (days)</Label>
          <Input id="ad" name="anonymiseDays" type="number" min={30} defaultValue={props.anonymiseDays} />
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="font-medium">{t("mapping")}</legend>
        <Label htmlFor="fi">Meta form IDs to backfill (comma separated; empty = all active forms)</Label>
        <Input id="fi" name="formIds" defaultValue={props.formIds} />
        <Label htmlFor="mp">{`{ "<form id>": { "<question key>": "full_name|phone|district|taluka|treatment|has_scheme_card|age|language|ignore" } }`}</Label>
        <Textarea id="mp" name="mappings" rows={6} className="font-mono text-xs" defaultValue={props.mappings} />
      </fieldset>
      <Button type="submit" disabled={pending}>
        {t("save")}
      </Button>
      {msg && (
        <p role="status" className="text-sm">
          {msg}
        </p>
      )}
    </form>
  );
}

export function KbForm({
  article,
}: {
  article?: { id: string; title: string; body: string; language: "mr" | "hi" | "en"; is_published: boolean };
}) {
  const [msg, setMsg] = useState<string | null>(null);
  async function submit(fd: FormData) {
    const r = await saveKbArticle({
      id: article?.id,
      title: String(fd.get("title")),
      body: String(fd.get("body")),
      language: String(fd.get("language")) as "mr",
      isPublished: fd.get("pub") === "on",
    });
    setMsg(r.ok ? "Saved" : r.error);
  }
  return (
    <form action={submit} className="space-y-2 border-t border-border pt-2">
      <Input aria-label="Title" name="title" defaultValue={article?.title} required placeholder="Title" />
      <Textarea aria-label="Body" name="body" rows={3} defaultValue={article?.body} required />
      <div className="flex items-center gap-2">
        <Select aria-label="Language" name="language" defaultValue={article?.language ?? "mr"}>
          <option value="mr">मराठी</option>
          <option value="hi">हिंदी</option>
          <option value="en">English</option>
        </Select>
        <label className="text-sm">
          <input type="checkbox" name="pub" defaultChecked={article?.is_published ?? true} /> Published
        </label>
        <Button type="submit" className="ml-auto">
          {article ? "Update" : "Add"}
        </Button>
      </div>
      {msg && (
        <p role="status" className="text-sm">
          {msg}
        </p>
      )}
    </form>
  );
}
