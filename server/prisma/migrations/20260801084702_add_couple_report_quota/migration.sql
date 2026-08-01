-- AlterTable
ALTER TABLE "Couple" ADD COLUMN     "freeReportsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false;
