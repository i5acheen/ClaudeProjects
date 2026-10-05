"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TrustCenterToggle({
  initialEnabled,
  trustSlug,
}: {
  initialEnabled: boolean;
  trustSlug: string;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined" ? `${window.location.origin}/trust/${trustSlug}` : `/trust/${trustSlug}`;

  async function toggle() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trustCenterEnabled: !enabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save.");
        return;
      }
      setEnabled(!enabled);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — nothing to do, the link is still visible to copy by hand.
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            enabled ? "bg-brand-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm text-slate-700">
          {enabled ? "Public Trust Center is live" : "Public Trust Center is off"}
        </span>
      </div>
      {enabled && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={url}
            className="w-full max-w-md rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-sm text-slate-600"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={copyLink}
            className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
