"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { anonymisePatient, exportPatient } from "@/app/actions";
import { Button, Input } from "@/components/ui";

export function PrivacyActions({ patientId }: { patientId: string }) {
  const t = useTranslations("privacy");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");

  async function doExport() {
    const r = await exportPatient(patientId);
    if (!r.ok) return setMsg(r.error);
    const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `patient-${patientId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Exported (audited).");
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Button variant="secondary" onClick={doExport}>
        {t("export")}
      </Button>
      <Input
        aria-label={t("reason")}
        placeholder={t("reason")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-56"
      />
      <Input
        aria-label={t("confirm")}
        placeholder={t("confirm")}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-44"
      />
      <Button
        variant="danger"
        disabled={confirm !== "DELETE" || reason.length < 3}
        onClick={async () => {
          const r = await anonymisePatient({ patientId, reason, confirm });
          setMsg(r.ok ? "Anonymised (audited)." : r.error);
        }}
      >
        {t("anonymise")}
      </Button>
      {msg && (
        <p role="status" className="w-full text-sm">
          {msg}
        </p>
      )}
    </div>
  );
}
