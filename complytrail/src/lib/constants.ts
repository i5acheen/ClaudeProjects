import type { ControlCategory, ControlStatusValue } from "@/lib/types";

export const CATEGORY_LABELS: Record<ControlCategory, string> = {
  ONBOARDING: "Onboarding",
  OFFBOARDING: "Offboarding",
  ACCESS_REVIEW: "Access Review",
  TRAINING: "Training",
  POLICY: "Policy",
};

export const CATEGORY_ORDER: ControlCategory[] = [
  "ONBOARDING",
  "OFFBOARDING",
  "ACCESS_REVIEW",
  "TRAINING",
  "POLICY",
];

export const STATUS_LABELS: Record<ControlStatusValue, string> = {
  MISSING: "Missing",
  IN_PROGRESS: "In Progress",
  EVIDENCE_ATTACHED: "Evidence Attached",
};

export const STATUS_STYLES: Record<ControlStatusValue, string> = {
  MISSING: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  EVIDENCE_ATTACHED: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
};

export const POLICY_QUESTIONS: { key: string; label: string }[] = [
  {
    key: "accessGrant",
    label: "How does someone get access to company systems when they join — who requests it and who approves it?",
  },
  {
    key: "backgroundCheck",
    label: "What happens to make sure a background check (or ID verification) is done before someone starts?",
  },
  {
    key: "offboardingTrigger",
    label: "Walk through what happens on someone's last day — who gets notified, and by whom?",
  },
  {
    key: "accessRevocation",
    label: "How quickly after someone leaves does their access actually get removed, and who's responsible?",
  },
  {
    key: "training",
    label: "How do employees learn about security expectations today (training, docs, onboarding chat, etc.)?",
  },
  {
    key: "accessReview",
    label: "How often, if ever, do you review who has access to important systems?",
  },
  {
    key: "exceptions",
    label: "Anything unusual about your setup (remote-first, contractors, multiple offices) a policy should account for?",
  },
];
