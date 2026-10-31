"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";

/** Button bound to a server action returning { ok, error }. */
export function ActionButton({
  action,
  children,
  variant = "secondary",
}: {
  action: () => Promise<{ ok: boolean; error?: string }>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant={variant}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await action();
            setError(r.ok ? null : (r.error ?? "error"));
          })
        }
      >
        {children}
      </Button>
      {error && (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
