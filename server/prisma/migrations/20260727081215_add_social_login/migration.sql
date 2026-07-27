-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "appleId" TEXT,
    "googleId" TEXT,
    "name" TEXT NOT NULL,
    "avatarEmoji" TEXT NOT NULL DEFAULT '🌸',
    "avatarUri" TEXT,
    "relationshipStartDate" DATETIME,
    "loveLanguages" TEXT NOT NULL DEFAULT '[]',
    "interests" TEXT NOT NULL DEFAULT '[]',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "pushToken" TEXT,
    "birthdate" DATETIME,
    "occupation" TEXT,
    "habits" TEXT,
    "city" TEXT,
    "journalReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastJournalReminderSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coupleId" TEXT,
    CONSTRAINT "User_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatarEmoji", "avatarUri", "birthdate", "city", "coupleId", "createdAt", "email", "habits", "id", "interests", "journalReminderEnabled", "lastJournalReminderSentAt", "loveLanguages", "name", "occupation", "passwordHash", "pushToken", "relationshipStartDate", "timezone") SELECT "avatarEmoji", "avatarUri", "birthdate", "city", "coupleId", "createdAt", "email", "habits", "id", "interests", "journalReminderEnabled", "lastJournalReminderSentAt", "loveLanguages", "name", "occupation", "passwordHash", "pushToken", "relationshipStartDate", "timezone" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
