import path from "node:path";

export const EVIDENCE_ROOT = path.join(process.cwd(), "storage", "evidence");
export const MAX_EVIDENCE_FILE_BYTES = 10 * 1024 * 1024; // 10MB
