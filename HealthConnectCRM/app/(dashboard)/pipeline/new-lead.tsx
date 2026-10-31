"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLead } from "@/app/actions";
import { Button, Input, Label } from "@/components/ui";

export function NewLeadForm() {
  const t = useTranslations("pipeline");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(fd: FormData) {
    const r = await createLead({
      fullName: String(fd.get("name")),
      phone: String(fd.get("phone")),
      treatment: String(fd.get("treatment") || "") || undefined,
    });
    if (!r.ok) return setError(r.error);
    setOpen(false);
    router.push(`/leads/${r.leadId}`);
  }

  if (!open) return <Button onClick={() => setOpen(true)}>{t("newLead")}</Button>;
  return (
    <form action={submit} className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface p-3">
      <div>
        <Label htmlFor="nl-name">{t("name")}</Label>
        <Input id="nl-name" name="name" required />
      </div>
      <div>
        <Label htmlFor="nl-phone">{t("phone")}</Label>
        <Input id="nl-phone" name="phone" required inputMode="tel" />
      </div>
      <div>
        <Label htmlFor="nl-treat">{t("treatment")}</Label>
        <Input id="nl-treat" name="treatment" />
      </div>
      <Button type="submit">{t("create")}</Button>
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
