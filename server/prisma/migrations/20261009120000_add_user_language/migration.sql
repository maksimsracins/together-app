-- AlterTable
-- Every account that exists today was created by the Russian-only app, so
-- the column default doubles as the backfill.
ALTER TABLE "User" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'ru';

-- Love languages used to be stored as their Russian display labels; they're
-- now stable keys the client translates at render time.
UPDATE "User" SET "loveLanguages" =
  replace(replace(replace(replace(replace("loveLanguages",
    '"Слова поддержки"', '"words"'),
    '"Совместное время"', '"time"'),
    '"Подарки"', '"gifts"'),
    '"Помощь по дому"', '"service"'),
    '"Прикосновения"', '"touch"');
