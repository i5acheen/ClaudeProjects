"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { saveHospital } from "@/app/actions";
import { Button, Input, Label } from "@/components/ui";

export function HospitalForm() {
  const t = useTranslations("hospitals");
  const [error, setError] = useState<string | null>(null);
  async function submit(fd: FormData) {
    const schemes = ["MJPJAY", "PM-JAY"].filter((s) => fd.get(s)) as ("MJPJAY" | "PM-JAY")[];
    const r = await saveHospital({
      name: String(fd.get("name")),
      district: String(fd.get("district") || "") || undefined,
      schemes,
      specialties: String(fd.get("specialties") || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      contactName: String(fd.get("contactName") || "") || undefined,
      contactPhone: String(fd.get("contactPhone") || "") || undefined,
      isActive: true,
    });
    setError(r.ok ? null : r.error);
  }
  return (
    <form action={submit} className="grid gap-2 sm:grid-cols-3">
      <div>
        <Label htmlFor="h-name">Name</Label>
        <Input id="h-name" name="name" required />
      </div>
      <div>
        <Label htmlFor="h-district">District</Label>
        <Input id="h-district" name="district" />
      </div>
      <div>
        <Label htmlFor="h-spec">{t("specialties")}</Label>
        <Input id="h-spec" name="specialties" placeholder="vascular, spine, thyroid" />
      </div>
      <div>
        <Label htmlFor="h-cn">{t("contact")}</Label>
        <Input id="h-cn" name="contactName" />
      </div>
      <div>
        <Label htmlFor="h-cp">Phone</Label>
        <Input id="h-cp" name="contactPhone" />
      </div>
      <fieldset className="flex items-end gap-3 text-sm">
        <legend className="sr-only">{t("schemes")}</legend>
        <label>
          <input type="checkbox" name="MJPJAY" defaultChecked /> MJPJAY
        </label>
        <label>
          <input type="checkbox" name="PM-JAY" defaultChecked /> PM-JAY
        </label>
      </fieldset>
      <Button type="submit" className="sm:col-span-3 sm:w-40">
        {t("add")}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger sm:col-span-3">
          {error}
        </p>
      )}
    </form>
  );
}
