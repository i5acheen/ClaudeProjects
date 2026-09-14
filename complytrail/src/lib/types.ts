// SQLite has no native enum type, so these fields are plain strings in the
// Prisma schema. These are the allowed values, enforced at write time by
// zod in each API route.
export type Role = "ADMIN" | "MEMBER";
export type ControlCategory = "ONBOARDING" | "OFFBOARDING" | "ACCESS_REVIEW" | "TRAINING" | "POLICY";
export type ControlStatusValue = "MISSING" | "IN_PROGRESS" | "EVIDENCE_ATTACHED";
export type EvidenceType = "FILE" | "LINK" | "NOTE";
export type PolicyDraftStatus = "DRAFT" | "APPROVED";
