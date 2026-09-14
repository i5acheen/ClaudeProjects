"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { POLICY_QUESTIONS } from "@/lib/constants";

type Draft = {
  id: string;
  generatedText: string;
  status: "DRAFT" | "APPROVED";
  answers: Record<string, string>;
};

export default function PolicyDraftWorkspace({
  controlId,
  aiEnabled,
  initialDraft,
}: {
  controlId: string;
  aiEnabled: boolean;
  initialDraft: Draft | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(
    initialDraft?.answers ?? Object.fromEntries(POLICY_QUESTIONS.map((q) => [q.key, ""]))
  );
  const [draftText, setDraftText] = useState(initialDraft?.generatedText ?? "");
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id ?? null);
  const [status, setStatus] = useState<"DRAFT" | "APPROVED">(initialDraft?.status ?? "DRAFT");
  const [mode, setMode] = useState<"questionnaire" | "draft">(initialDraft ? "draft" : "questionnaire");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/policy-drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ controlId, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not generate a draft.");
        return;
      }
      setDraftText(data.draft.generatedText);
      setDraftId(data.draft.id);
      setStatus(data.draft.status);
      setMode("draft");
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraft(nextStatus?: "DRAFT" | "APPROVED") {
    if (!draftId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/policy-drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generatedText: draftText, ...(nextStatus ? { status: nextStatus } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      if (nextStatus) setStatus(nextStatus);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!aiEnabled && mode === "questionnaire") {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Policy drafting isn&apos;t configured for this deployment. Set{" "}
        <code className="rounded bg-slate-100 px-1">ANTHROPIC_API_KEY</code> in your{" "}
        <code className="rounded bg-slate-100 px-1">.env</code> file and restart the app to enable it.
      </div>
    );
  }

  if (mode === "questionnaire") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Answer a few questions about how this actually works today. Claude will turn it into a first-draft
          policy you can edit and approve.
        </p>
        {POLICY_QUESTIONS.map((q) => (
          <div key={q.key}>
            <label className="block text-sm font-medium text-slate-700">{q.label}</label>
            <textarea
              value={answers[q.key] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {generating ? "Drafting..." : "Generate draft"}
          </button>
          {initialDraft && (
            <button type="button" onClick={() => setMode("draft")} className="text-sm text-slate-500 hover:text-slate-900">
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            status === "APPROVED"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
              : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200"
          }`}
        >
          {status === "APPROVED" ? "Approved" : "Draft"}
        </span>
        {aiEnabled && (
          <button type="button" onClick={() => setMode("questionnaire")} className="text-sm text-brand-600 hover:underline">
            Re-answer questionnaire &amp; regenerate
          </button>
        )}
      </div>
      <textarea
        value={draftText}
        onChange={(e) => setDraftText(e.target.value)}
        rows={20}
        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => saveDraft()}
          disabled={saving}
          className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save edits"}
        </button>
        <button
          type="button"
          onClick={() => saveDraft("APPROVED")}
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Approve
        </button>
      </div>
    </div>
  );
}
