-- Existing accounts were backfilled to 'ru' by the previous migration; new
-- accounts default to English.
ALTER TABLE "User" ALTER COLUMN "language" SET DEFAULT 'en';
ALTER TABLE "User" ADD COLUMN "languageChangedAt" TIMESTAMP(3);

-- Every report generated so far was written in Russian.
ALTER TABLE "WeeklyReport" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'ru';

-- CreateTable
CREATE TABLE "ReportTranslation" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "reportJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportId" TEXT NOT NULL,

    CONSTRAINT "ReportTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportTranslation_reportId_language_key" ON "ReportTranslation"("reportId", "language");

-- AddForeignKey
ALTER TABLE "ReportTranslation" ADD CONSTRAINT "ReportTranslation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "WeeklyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
