/*
  Warnings:

  - You are about to drop the column `todayMood` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `todayMoodAt` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarEmoji" TEXT NOT NULL DEFAULT '🌸',
    "avatarUri" TEXT,
    "relationshipStartDate" DATETIME,
    "loveLanguages" TEXT NOT NULL DEFAULT '[]',
    "interests" TEXT NOT NULL DEFAULT '[]',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "reportWeekday" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coupleId" TEXT,
    CONSTRAINT "User_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatarEmoji", "avatarUri", "coupleId", "createdAt", "email", "id", "interests", "loveLanguages", "name", "passwordHash", "relationshipStartDate", "reportWeekday", "timezone") SELECT "avatarEmoji", "avatarUri", "coupleId", "createdAt", "email", "id", "interests", "loveLanguages", "name", "passwordHash", "relationshipStartDate", "reportWeekday", "timezone" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
