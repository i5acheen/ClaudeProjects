-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "auditDate" DATETIME,
    "trustCenterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "trustSlug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Company" ("auditDate", "createdAt", "id", "name", "trustSlug") SELECT "auditDate", "createdAt", "id", "name", lower(hex(randomblob(12))) FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE UNIQUE INDEX "Company_trustSlug_key" ON "Company"("trustSlug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
