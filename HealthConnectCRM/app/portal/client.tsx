"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { moveStage } from "@/app/actions";
import { Button, Input } from "@/components/ui";

export function MarkAdmitted({ leadId }: { leadId: string }) {
  const t = useTranslations("portal");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input aria-label={t("admittedOn")} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await moveStage({ leadId, toStage: 5, reason: "admitted (hospital portal)", admittedAt: `${date}T12:00:00+05:30` });
            setError(r.ok ? null : r.error);
          })
        }
      >
        {t("markAdmitted")}
      </Button>
      {error && (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
