export function daysUntilWeekday(targetWeekday: number, from: Date = new Date()) {
  const diff = (targetWeekday - from.getDay() + 7) % 7;
  return diff;
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
