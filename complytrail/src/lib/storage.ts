import path from "node:path";
import { IS_SERVERLESS_READONLY, RUNTIME_EVIDENCE_ROOT } from "@/lib/runtime-init";

export const EVIDENCE_ROOT = IS_SERVERLESS_READONLY
  ? RUNTIME_EVIDENCE_ROOT!
  : path.join(process.cwd(), "storage", "evidence");
export const MAX_EVIDENCE_FILE_BYTES = 10 * 1024 * 1024; // 10MB
