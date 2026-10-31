"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { sendReply, sendTemplate, takeOver, updateLead } from "@/app/actions";
import { Button, Select, Textarea } from "@/components/ui";

type Template = { id: string; name: string; language: string; body_preview: string | null; variables: string[] };

const QUICK = ["नमस्कार जी, मी समन्वयक बोलत आहे.", "कृपया आधार कार्ड आणि रेशन कार्डचे फोटो पाठवा.", "धन्यवाद जी, आम्ही लवकरच संपर्क करू."];

export function Composer(props: {
  conversationId: string;
  leadId: string | null;
  windowOpen: boolean;
  botEnabled: boolean;
  templates: Template[];
}) {
  const t = useTranslations("inbox");
  const [text, setText] = useState("");
  const [note, setNote] = useState(false);
  const [tplId, setTplId] = useState(props.templates[0]?.id ?? "");
  const [params, setParams] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const mustTemplate = !props.windowOpen && !note;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      setError(r.ok ? null : (r.error ?? "error"));
      if (r.ok) setText("");
    });

  return (
    <div className="space-y-2 border-t border-border p-3">
      {props.leadId && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={pending} onClick={() => run(() => takeOver(props.leadId!))}>
            {t("takeOver")}
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            aria-pressed={props.botEnabled}
            onClick={() => run(() => updateLead({ leadId: props.leadId!, botEnabled: !props.botEnabled }))}
          >
            {props.botEnabled ? t("botOn") : t("botOff")}
          </Button>
        </div>
      )}
      {mustTemplate ? (
        <div className="space-y-2">
          <p className="text-sm text-warn" role="note">
            {t("windowClosed")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Select aria-label={t("template")} value={tplId} onChange={(e) => setTplId(e.target.value)}>
              {props.templates.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.name} ({tp.language})
                </option>
              ))}
            </Select>
            <input
              aria-label="Template parameters (comma separated)"
              className="min-h-10 flex-1 rounded-md border border-border px-2 text-sm"
              placeholder="param1, param2"
              value={params}
              onChange={(e) => setParams(e.target.value)}
            />
            <Button
              disabled={pending || !tplId}
              onClick={() =>
                run(() =>
                  sendTemplate({
                    conversationId: props.conversationId,
                    leadId: props.leadId,
                    templateId: tplId,
                    params: params ? params.split(",").map((p) => p.trim()) : [],
                  }),
                )
              }
            >
              {t("send")}
            </Button>
          </div>
          <p className="text-xs text-muted">{props.templates.find((x) => x.id === tplId)?.body_preview}</p>
        </div>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => sendReply({ conversationId: props.conversationId, leadId: props.leadId, text, internalNote: note }));
          }}
        >
          <div className="flex flex-wrap gap-1">
            {QUICK.map((q) => (
              <button
                type="button"
                key={q}
                className="rounded-full border border-border px-2 py-1 text-xs hover:bg-bg"
                onClick={() => setText(q)}
              >
                {q}
              </button>
            ))}
          </div>
          <Textarea
            aria-label={t("placeholder")}
            rows={3}
            placeholder={t("placeholder")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={note ? "bg-amber-50" : ""}
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={note} onChange={(e) => setNote(e.target.checked)} /> {t("note")}
            </label>
            <Button type="submit" className="ml-auto" disabled={pending || !text.trim()}>
              {t("send")}
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
