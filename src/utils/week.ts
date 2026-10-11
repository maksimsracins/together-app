import { intlLocale, t } from '../i18n';

export function daysUntilWeekday(targetWeekday: number, from: Date = new Date()) {
  const diff = (targetWeekday - from.getDay() + 7) % 7;
  return diff;
}

const WEEKDAY_ISO: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

// Reads the wall-clock date/time as it appears in `timeZone`, not the
// viewer's device zone -- report generation on the server keys off the
// couple's stored `reportTimezone`, so a countdown built from the device
// clock instead can drift by however many hours separate the two, showing
// "opens in 7 days" right as (or after) the real, timezone-correct report
// has already fired.
function zonedParts(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  // Some ICU builds render midnight as "24" under hour12: false.
  const hour = get('hour') === '24' ? '00' : get('hour');
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(hour),
    minute: Number(get('minute')),
    second: Number(get('second')),
    isoWeekday: WEEKDAY_ISO[get('weekday')] ?? 1,
  };
}

// Days remaining until the couple's next scheduled report, evaluated in the
// couple's own report timezone so both partners see the same countdown
// regardless of where each of their devices is.
export function daysUntilNextReport(weekday: number, hour: number, timezone: string, from: Date = new Date()): number {
  const { isoWeekday: currentIso, hour: currentHour } = zonedParts(timezone, from);
  let diff = weekday - currentIso;
  if (diff < 0) diff += 7;
  if (diff === 0 && currentHour >= hour) diff = 7;
  return diff;
}

// Exact next occurrence of the couple's report weekday/hour in their report
// timezone, resolved to a real instant for a live second-by-second countdown.
// Finds the offset between the device clock and that timezone's wall clock
// right now, builds the target in "wall clock" space, then undoes the offset
// to get back a real Date -- same trick date-fns-tz's toZonedTime uses.
export function nextReportDate(weekday: number, hour: number, timezone: string, from: Date = new Date()): Date {
  const p = zonedParts(timezone, from);
  const zonedNow = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second));
  const offsetMs = zonedNow.getTime() - from.getTime();

  let diffDays = weekday - p.isoWeekday;
  if (diffDays < 0) diffDays += 7;

  const zonedTarget = new Date(zonedNow);
  zonedTarget.setUTCDate(zonedNow.getUTCDate() + diffDays);
  zonedTarget.setUTCHours(hour, 0, 0, 0);
  if (zonedTarget.getTime() <= zonedNow.getTime()) zonedTarget.setUTCDate(zonedTarget.getUTCDate() + 7);

  return new Date(zonedTarget.getTime() - offsetMs);
}

export function formatDayLabel(date: Date) {
  return date.toLocaleDateString(intlLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
}

export function greeting(date: Date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return { text: t('greeting.night'), emoji: '🌙' };
  if (hour < 12) return { text: t('greeting.morning'), emoji: '☀️' };
  if (hour < 18) return { text: t('greeting.afternoon'), emoji: '🌤️' };
  return { text: t('greeting.evening'), emoji: '🌇' };
}
