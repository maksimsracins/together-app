import { startOfWeek, endOfWeek, getISOWeek, getISOWeekYear, format, set, subWeeks } from 'date-fns';
import { ru } from 'date-fns/locale';

const WEEK_CLOSE_HOUR = 20; // the week's report becomes available Sunday at this hour

export function weekIdFor(date: Date = new Date()): string {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`;
}

export function weekLabelFor(date: Date = new Date()): string {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return `${format(start, 'd MMMM', { locale: ru })} — ${format(end, 'd MMMM', { locale: ru })}`;
}

// The moment the week containing `date` closes (Sunday 20:00) and its report unlocks.
export function weekCloseThreshold(date: Date = new Date()): Date {
  const sunday = endOfWeek(date, { weekStartsOn: 1 });
  return set(sunday, { hours: WEEK_CLOSE_HOUR, minutes: 0, seconds: 0, milliseconds: 0 });
}

// The most recent week that has actually closed — the only week whose report can
// be generated. This is never the week currently in progress, regardless of a
// user's `reportWeekday` preference (which is just a reminder setting, not a gate).
export function latestClosedWeek(now: Date = new Date()): { weekId: string; weekLabel: string } {
  const reference = now >= weekCloseThreshold(now) ? now : subWeeks(now, 1);
  return { weekId: weekIdFor(reference), weekLabel: weekLabelFor(reference) };
}
