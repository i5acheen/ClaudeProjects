import fs from "node:fs";
import type { PrismaClient } from "@prisma/client";
import { runSeed } from "@/lib/seed-data";

// Vercel's serverless filesystem is read-only except /tmp, so the SQLite db
// and uploaded evidence files can't live in the deployed bundle at runtime
// the way they do locally. Detect that and redirect both to /tmp, creating
// and seeding the schema lazily on cold start.
//
// This only matters for the "quick demo" deployment path — a real
// deployment of this app should use a hosted Postgres and blob storage
// instead, at which point none of this file is needed.
// Check multiple signals, not just VERCEL=1 — Vercel only auto-exposes its own
// System Environment Variables to the runtime when a project setting is on,
// but LAMBDA_TASK_ROOT/AWS_LAMBDA_FUNCTION_NAME are raw AWS Lambda variables
// present in every Lambda invocation regardless of that setting.
export const IS_SERVERLESS_READONLY = !!(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.AWS_LAMBDA_FUNCTION_NAME
);

export const RUNTIME_DB_PATH = IS_SERVERLESS_READONLY ? "/tmp/dev.db" : undefined;
export const RUNTIME_EVIDENCE_ROOT = IS_SERVERLESS_READONLY ? "/tmp/evidence" : undefined;

// Same statements Prisma's own migration applies (prisma/migrations/*/migration.sql),
// embedded so the deployed bundle doesn't need to ship or trace a separate file.
const MIGRATION_STATEMENTS = [
  `CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "auditDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  `CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
  `CREATE TABLE "Control" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "framework" TEXT NOT NULL DEFAULT 'SOC2',
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL
)`,
  `CREATE TABLE "ControlStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "controlId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MISSING',
    "ownerId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ControlStatus_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ControlStatus_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ControlStatus_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
)`,
  `CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "controlId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evidence_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evidence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
  `CREATE TABLE "PolicyDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "controlId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "questionnaireAnswers" TEXT NOT NULL,
    "generatedText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PolicyDraft_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PolicyDraft_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
  `CREATE UNIQUE INDEX "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX "Control_code_key" ON "Control"("code")`,
  `CREATE UNIQUE INDEX "ControlStatus_controlId_companyId_key" ON "ControlStatus"("controlId", "companyId")`,
  `CREATE UNIQUE INDEX "PolicyDraft_controlId_companyId_key" ON "PolicyDraft"("controlId", "companyId")`,
];

let initPromise: Promise<void> | null = null;

/** Creates the schema and seeds /tmp/dev.db on first use of a fresh serverless instance. No-op locally. */
export function ensureRuntimeDatabase(prisma: PrismaClient): Promise<void> {
  if (!IS_SERVERLESS_READONLY) return Promise.resolve();
  if (!initPromise) {
    initPromise = doInit(prisma).catch((err) => {
      // Don't cache a failed init — let the next request retry instead of
      // permanently wedging this warm instance.
      initPromise = null;
      console.error("ComplyTrail: runtime database init failed", err);
      throw err;
    });
  }
  return initPromise;
}

async function doInit(prisma: PrismaClient): Promise<void> {
  const evidenceRoot = RUNTIME_EVIDENCE_ROOT!;
  fs.mkdirSync(evidenceRoot, { recursive: true });

  const alreadyInitialized = await prisma.company
    .findFirst()
    .then(() => true)
    .catch(() => false);
  if (alreadyInitialized) return;

  for (const statement of MIGRATION_STATEMENTS) {
    await prisma.$executeRawUnsafe(statement);
  }
  await runSeed(prisma, evidenceRoot);
}
