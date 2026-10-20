"use client";

import { ErrorScreen } from "@/components/app/ErrorScreen";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorScreen error={error} reset={reset} />;
}
