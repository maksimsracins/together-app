-- AlterTable
ALTER TABLE "User" ADD COLUMN "languageChanges" TEXT NOT NULL DEFAULT '[]';
UPDATE "User" SET "languageChanges" = json_build_array(to_char("languageChangedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))::text WHERE "languageChangedAt" IS NOT NULL;
ALTER TABLE "User" DROP COLUMN "languageChangedAt";
ALTER TABLE "User" ADD COLUMN "passwordResetCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "passwordResetAttempts" INTEGER NOT NULL DEFAULT 0;
