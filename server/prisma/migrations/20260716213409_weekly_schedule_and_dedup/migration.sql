-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Couple" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviteCode" TEXT NOT NULL,
    "reportWeekday" INTEGER NOT NULL DEFAULT 1,
    "reportHour" INTEGER NOT NULL DEFAULT 9,
    "reportTimezone" TEXT NOT NULL DEFAULT 'UTC',
    "reportScheduleChanges" TEXT NOT NULL DEFAULT '[]',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "partnerActivityNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Couple" ("createdAt", "id", "inviteCode", "notificationsEnabled") SELECT "createdAt", "id", "inviteCode", "notificationsEnabled" FROM "Couple";
DROP TABLE "Couple";
ALTER TABLE "new_Couple" RENAME TO "Couple";
CREATE UNIQUE INDEX "Couple_inviteCode_key" ON "Couple"("inviteCode");
CREATE TABLE "new_Entry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "emotion" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "hasPhoto" BOOLEAN NOT NULL DEFAULT false,
    "hasAudio" BOOLEAN NOT NULL DEFAULT false,
    "weekId" TEXT NOT NULL,
    "reactionEmoji" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "coupleId" TEXT,
    "includedInReportId" TEXT,
    CONSTRAINT "Entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Entry_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Entry_includedInReportId_fkey" FOREIGN KEY ("includedInReportId") REFERENCES "WeeklyReport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Entry" ("coupleId", "createdAt", "emotion", "hasAudio", "hasPhoto", "id", "reactionEmoji", "tags", "text", "type", "updatedAt", "userId", "weekId") SELECT "coupleId", "createdAt", "emotion", "hasAudio", "hasPhoto", "id", "reactionEmoji", "tags", "text", "type", "updatedAt", "userId", "weekId" FROM "Entry";
DROP TABLE "Entry";
ALTER TABLE "new_Entry" RENAME TO "Entry";
CREATE INDEX "Entry_userId_weekId_idx" ON "Entry"("userId", "weekId");
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
    "pushToken" TEXT,
    "birthdate" DATETIME,
    "occupation" TEXT,
    "habits" TEXT,
    "journalReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastJournalReminderSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coupleId" TEXT,
    CONSTRAINT "User_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatarEmoji", "avatarUri", "birthdate", "coupleId", "createdAt", "email", "habits", "id", "interests", "loveLanguages", "name", "occupation", "passwordHash", "pushToken", "relationshipStartDate", "timezone") SELECT "avatarEmoji", "avatarUri", "birthdate", "coupleId", "createdAt", "email", "habits", "id", "interests", "loveLanguages", "name", "occupation", "passwordHash", "pushToken", "relationshipStartDate", "timezone" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
