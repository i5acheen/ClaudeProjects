"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const TYPES = [
  { value: "FILE", label: "File" },
  { value: "LINK", label: "Link" },
  { value: "NOTE", label: "Note" },
] as const;

type EvidenceType = (typeof TYPES)[number]["value"];

export default function EvidenceUploadForm({ controlId }: { controlId: string }) {
  const router = useRouter();
  const [type, setType] = useState<EvidenceType>("FILE");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (type === "FILE" && !file) {
      setError("Choose a file.");
      return;
    }
    if (type !== "FILE" && content.trim().length === 0) {
      setError(type === "LINK" ? "Enter a link." : "Enter a note.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("controlId", controlId);
      formData.set("type", type);
      if (type === "FILE" && file) {
        formData.set("file", file);
      } else {
        formData.set("content", content);
      }
      const res = await fetch("/api/evidence", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not upload evidence.");
        return;
      }
      setContent("");
      setFile(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex gap-2">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              type === t.value ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {type === "FILE" && (
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
      )}
      {type === "LINK" && (
        <input
          type="url"
          placeholder="https://..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      )}
      {type === "NOTE" && (
        <textarea
          placeholder="Describe the evidence..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {saving ? "Uploading..." : "Attach evidence"}
      </button>
    </form>
  );
}
