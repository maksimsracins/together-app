-- AlterTable
ALTER TABLE "User" ADD COLUMN "birthPlace" TEXT;
ALTER TABLE "User" ADD COLUMN "birthTime" TEXT;
ALTER TABLE "User" ADD COLUMN "birthdate" DATETIME;
ALTER TABLE "User" ADD COLUMN "habits" TEXT;
ALTER TABLE "User" ADD COLUMN "occupation" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Couple" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviteCode" TEXT NOT NULL,
    "reportIntervalDays" INTEGER NOT NULL DEFAULT 7,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "zodiacAnalysisEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Couple" ("createdAt", "id", "inviteCode", "notificationsEnabled", "reportIntervalDays") SELECT "createdAt", "id", "inviteCode", "notificationsEnabled", "reportIntervalDays" FROM "Couple";
DROP TABLE "Couple";
ALTER TABLE "new_Couple" RENAME TO "Couple";
CREATE UNIQUE INDEX "Couple_inviteCode_key" ON "Couple"("inviteCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
