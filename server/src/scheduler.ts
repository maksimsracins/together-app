import { differenceInHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { db } from './db';
import { runReportGeneration } from './routes/report';
import { sendPushNotification } from './push';

const CHECK_INTERVAL_MS = Number(process.env.REPORT_SCHEDULER_INTERVAL_MS) || 30 * 60 * 1000;

// JS getDay() is 0=Sun..6=Sat; our schema stores ISO weekday 1=Mon..7=Sun.
function isoWeekdayIn(date: Date, timezone: string): number {
  const zoned = toZonedTime(date, timezone);
  const jsDay = zoned.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function hourIn(date: Date, timezone: string): number {
  return toZonedTime(date, timezone).getHours();
}

async function checkDueReports() {
  const couples = await db.couple.findMany({
    include: {
      members: { orderBy: { createdAt: 'asc' } },
      reports: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  const now = new Date();

  for (const couple of couples) {
    const [memberA, memberB] = couple.members;
    if (!memberA) continue;

    if (isoWeekdayIn(now, couple.reportTimezone) !== couple.reportWeekday) continue;
    if (hourIn(now, couple.reportTimezone) !== couple.reportHour) continue;

    const lastReport = couple.reports[0];
    // Guard against firing twice within the same hour window across 30-min ticks.
    if (lastReport && differenceInHours(now, lastReport.createdAt) < 20) continue;

    try {
      const result = await runReportGeneration({ couple, me: memberA, partner: memberB ?? null, isA: true });
      if (result.status !== 'ok') continue; // nothing new yet — retry next tick

      if (couple.notificationsEnabled) {
        const recipients = [memberA, memberB].filter((m): m is typeof memberA => !!m?.pushToken);
        await Promise.all(
          recipients.map((m) => sendPushNotification(m.pushToken!, 'Together', 'Ваш новый отчёт готов 💞', { type: 'report_ready' }))
        );
      }
    } catch (err) {
      console.error(`Report scheduler failed for couple ${couple.id}`, err);
    }
  }
}

async function checkJournalReminders() {
  const couples = await db.couple.findMany({
    include: {
      members: { orderBy: { createdAt: 'asc' } },
      reports: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  const now = new Date();

  for (const couple of couples) {
    const reminderWeekday = couple.reportWeekday === 1 ? 7 : couple.reportWeekday - 1;
    if (isoWeekdayIn(now, couple.reportTimezone) !== reminderWeekday) continue;
    if (hourIn(now, couple.reportTimezone) !== couple.reportHour) continue;

    const windowStart = couple.reports[0]?.createdAt ?? couple.createdAt;

    for (const member of couple.members) {
      if (!member.journalReminderEnabled || !member.pushToken) continue;
      if (member.lastJournalReminderSentAt && differenceInHours(now, member.lastJournalReminderSentAt) < 20) continue;

      const hasEntry = await db.entry.count({ where: { userId: member.id, createdAt: { gte: windowStart } } });
      if (hasEntry > 0) continue;

      try {
        await sendPushNotification(
          member.pushToken,
          'Together',
          'Вы ещё не делились впечатлениями на этой неделе — поделитесь, пока не поздно 🌿',
          { type: 'journal_reminder' }
        );
        await db.user.update({ where: { id: member.id }, data: { lastJournalReminderSentAt: now } });
      } catch (err) {
        console.error(`Journal reminder failed for user ${member.id}`, err);
      }
    }
  }
}

export function startReportScheduler() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set — report scheduler disabled');
    return;
  }
  const tick = () => {
    checkDueReports().catch((err) => console.error('Report scheduler tick failed', err));
    checkJournalReminders().catch((err) => console.error('Journal reminder tick failed', err));
  };
  tick();
  setInterval(tick, CHECK_INTERVAL_MS);
}
