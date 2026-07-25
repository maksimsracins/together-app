-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Couple" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviteCode" TEXT NOT NULL,
    "reportIntervalDays" INTEGER NOT NULL DEFAULT 7,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Couple" ("createdAt", "id", "inviteCode", "notificationsEnabled", "reportIntervalDays") SELECT "createdAt", "id", "inviteCode", "notificationsEnabled", "reportIntervalDays" FROM "Couple";
DROP TABLE "Couple";
ALTER TABLE "new_Couple" RENAME TO "Couple";
CREATE UNIQUE INDEX "Couple_inviteCode_key" ON "Couple"("inviteCode");
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
