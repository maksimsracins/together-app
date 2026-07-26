export function daysUntilWeekday(targetWeekday: number, from: Date = new Date()) {
  const diff = (targetWeekday - from.getDay() + 7) % 7;
  return diff;
}

// Approximates days remaining until the couple's next scheduled report using
// the viewer's device clock -- the actual generation happens in the couple's
// stored timezone, so this is a friendly estimate, not a precise countdown.
export function daysUntilNextReport(weekday: number, hour: number): number {
  const now = new Date();
  const currentIso = now.getDay() === 0 ? 7 : now.getDay();
  let diff = weekday - currentIso;
  if (diff < 0) diff += 7;
  if (diff === 0 && now.getHours() >= hour) diff = 7;
  return diff;
}

// Exact next occurrence of the couple's report weekday/hour, for a live
// second-by-second countdown -- same viewer's-clock approximation as
// daysUntilNextReport, just resolved to a concrete Date instead of a day count.
export function nextReportDate(weekday: number, hour: number, from: Date = new Date()): Date {
  const currentIso = from.getDay() === 0 ? 7 : from.getDay();
  let diffDays = weekday - currentIso;
  if (diffDays < 0) diffDays += 7;
  const target = new Date(from);
  target.setDate(from.getDate() + diffDays);
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() <= from.getTime()) target.setDate(target.getDate() + 7);
  return target;
}

export function pluralDays(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
}

export function formatDayLabel(date: Date) {
  return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function greeting(date: Date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return { text: 'Доброй ночи', emoji: '🌙' };
  if (hour < 12) return { text: 'Доброе утро', emoji: '☀️' };
  if (hour < 18) return { text: 'Добрый день', emoji: '🌤️' };
  return { text: 'Добрый вечер', emoji: '🌇' };
}
