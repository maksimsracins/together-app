-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "appleId" TEXT,
    "googleId" TEXT,
    "name" TEXT NOT NULL,
    "avatarEmoji" TEXT NOT NULL DEFAULT '🌸',
    "avatarUri" TEXT,
    "relationshipStartDate" TIMESTAMP(3),
    "loveLanguages" TEXT NOT NULL DEFAULT '[]',
    "interests" TEXT NOT NULL DEFAULT '[]',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "pushToken" TEXT,
    "birthdate" TIMESTAMP(3),
    "occupation" TEXT,
    "habits" TEXT,
    "city" TEXT,
    "journalReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastJournalReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coupleId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Couple" (
    "id" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "reportWeekday" INTEGER NOT NULL DEFAULT 1,
    "reportHour" INTEGER NOT NULL DEFAULT 9,
    "reportTimezone" TEXT NOT NULL DEFAULT 'UTC',
    "reportScheduleChanges" TEXT NOT NULL DEFAULT '[]',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "partnerActivityNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Couple_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "emotion" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "hasPhoto" BOOLEAN NOT NULL DEFAULT false,
    "hasAudio" BOOLEAN NOT NULL DEFAULT false,
    "photoUri" TEXT,
    "weekId" TEXT NOT NULL,
    "reactionEmoji" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "coupleId" TEXT,
    "includedInReportId" TEXT,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "weekLabel" TEXT NOT NULL,
    "reportJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coupleId" TEXT NOT NULL,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Couple_inviteCode_key" ON "Couple"("inviteCode");

-- CreateIndex
CREATE INDEX "Entry_userId_weekId_idx" ON "Entry"("userId", "weekId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WeeklyReport_coupleId_idx" ON "WeeklyReport"("coupleId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_includedInReportId_fkey" FOREIGN KEY ("includedInReportId") REFERENCES "WeeklyReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
