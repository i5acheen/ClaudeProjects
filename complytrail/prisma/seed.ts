import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { runSeed } from "../src/lib/seed-data";

const prisma = new PrismaClient();
const evidenceRoot = path.join(__dirname, "..", "storage", "evidence");

runSeed(prisma, evidenceRoot)
  .then(() => {
    console.log("Seed complete.");
    console.log("Login with any of:");
    console.log("  priya@aurorarobotics.example / ComplyTrail123! (ADMIN)");
    console.log("  marcus@aurorarobotics.example / ComplyTrail123! (MEMBER)");
    console.log("  dana@aurorarobotics.example / ComplyTrail123! (MEMBER)");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
