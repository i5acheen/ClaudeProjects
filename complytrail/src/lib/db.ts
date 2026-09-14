import { PrismaClient } from "@prisma/client";
import { ensureRuntimeDatabase, RUNTIME_DB_PATH } from "@/lib/runtime-init";

function createClient() {
  const basePrisma = new PrismaClient(
    RUNTIME_DB_PATH ? { datasources: { db: { url: `file:${RUNTIME_DB_PATH}` } } } : undefined
  );

  // On a read-only-filesystem host (see runtime-init.ts) this lazily creates
  // and seeds /tmp/dev.db before the first real query; everywhere else it's
  // an immediately-resolved no-op.
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          await ensureRuntimeDatabase(basePrisma);
          return query(args);
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
