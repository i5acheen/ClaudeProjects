"use client";

import { Suspense } from "react";
import { SetupForm } from "@/components/settings/SetupForm";
import { LoadingBook } from "@/components/journal/BookGate";

export default function SetupPage() {
  return (
    <Suspense fallback={<LoadingBook />}>
      <SetupForm />
    </Suspense>
  );
}
