"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { browserDb } from "@/lib/db/browser";

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    // shouldCreateUser: false — only admin-invited users can sign in.
    const { error } = await browserDb().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setBusy(false);
    if (error) setMessage(t("error"));
    else {
      setStep("code");
      setMessage(t("sent"));
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await browserDb().auth.verifyOtp({ email, token: code, type: "email" });
    setBusy(false);
    if (error) setMessage(t("error"));
    else router.replace("/");
  }

  async function google() {
    await browserDb().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-3">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" disabled={busy} className="w-full">
              {t("sendCode")}
            </Button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <Label htmlFor="code">{t("code")}</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button type="submit" disabled={busy} className="w-full">
              {t("verify")}
            </Button>
          </form>
        )}
        <Button variant="secondary" className="w-full" onClick={google}>
          {t("google")}
        </Button>
        {message && (
          <p role="status" className="text-sm text-muted">
            {message}
          </p>
        )}
      </Card>
    </main>
  );
}
