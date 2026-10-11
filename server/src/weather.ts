// Historical weather for a couple's report window, via Open-Meteo (free,
// no API key). Used only as supplementary display/context -- never a
// required part of a report, since a partner may not have set a city.
import { Lang } from './i18n';

export interface WeatherSummary {
  city: string;
  minTemp: number;
  maxTemp: number;
  condition: string;
  emoji: string;
}

const WEATHER_LABELS: Record<string, Record<Lang, string>> = {
  clear: { ru: 'ясно', en: 'clear', lv: 'skaidrs' },
  mainlyClear: { ru: 'преимущественно ясно', en: 'mainly clear', lv: 'pārsvarā skaidrs' },
  partlyCloudy: { ru: 'переменная облачность', en: 'partly cloudy', lv: 'mainīgs mākoņu daudzums' },
  cloudy: { ru: 'облачно', en: 'cloudy', lv: 'mākoņains' },
  fog: { ru: 'туман', en: 'fog', lv: 'migla' },
  drizzle: { ru: 'морось', en: 'drizzle', lv: 'smidzina' },
  rain: { ru: 'дождь', en: 'rain', lv: 'lietus' },
  heavyRain: { ru: 'сильный дождь', en: 'heavy rain', lv: 'stiprs lietus' },
  snow: { ru: 'снег', en: 'snow', lv: 'sniegs' },
  heavySnow: { ru: 'сильный снег', en: 'heavy snow', lv: 'stiprs sniegs' },
  showers: { ru: 'ливень', en: 'showers', lv: 'lietusgāze' },
  heavyShowers: { ru: 'сильный ливень', en: 'heavy showers', lv: 'stipra lietusgāze' },
  thunderstorm: { ru: 'гроза', en: 'thunderstorm', lv: 'pērkona negaiss' },
  variable: { ru: 'переменная погода', en: 'variable weather', lv: 'mainīgi laikapstākļi' },
};

const WEATHER_CODE_META: Record<number, { label: keyof typeof WEATHER_LABELS; emoji: string }> = {
  0: { label: 'clear', emoji: '☀️' },
  1: { label: 'mainlyClear', emoji: '🌤️' },
  2: { label: 'partlyCloudy', emoji: '⛅' },
  3: { label: 'cloudy', emoji: '☁️' },
  45: { label: 'fog', emoji: '🌫️' },
  48: { label: 'fog', emoji: '🌫️' },
  51: { label: 'drizzle', emoji: '🌦️' },
  53: { label: 'drizzle', emoji: '🌦️' },
  55: { label: 'drizzle', emoji: '🌦️' },
  61: { label: 'rain', emoji: '🌧️' },
  63: { label: 'rain', emoji: '🌧️' },
  65: { label: 'heavyRain', emoji: '🌧️' },
  71: { label: 'snow', emoji: '🌨️' },
  73: { label: 'snow', emoji: '🌨️' },
  75: { label: 'heavySnow', emoji: '❄️' },
  80: { label: 'showers', emoji: '🌧️' },
  81: { label: 'showers', emoji: '🌧️' },
  82: { label: 'heavyShowers', emoji: '⛈️' },
  95: { label: 'thunderstorm', emoji: '⛈️' },
};

async function geocode(city: string, lang: Lang): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${lang}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { latitude: number; longitude: number }[] };
    const first = data.results?.[0];
    return first ? { lat: first.latitude, lon: first.longitude } : null;
  } catch {
    return null;
  }
}

function toDateParam(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getWeatherSummary(
  city: string | null | undefined,
  start: Date,
  end: Date,
  lang: Lang
): Promise<WeatherSummary | null> {
  if (!city) return null;
  const loc = await geocode(city, lang);
  if (!loc) return null;

  try {
    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${loc.lat}&longitude=${loc.lon}` +
      `&start_date=${toDateParam(start)}&end_date=${toDateParam(end)}` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[]; weathercode?: number[] };
    };
    const maxes = data.daily?.temperature_2m_max ?? [];
    const mins = data.daily?.temperature_2m_min ?? [];
    const codes = data.daily?.weathercode ?? [];
    if (maxes.length === 0 || mins.length === 0) return null;

    const maxTemp = Math.round(Math.max(...maxes));
    const minTemp = Math.round(Math.min(...mins));

    const counts = new Map<number, number>();
    for (const c of codes) counts.set(c, (counts.get(c) ?? 0) + 1);
    let bestCode = codes[0] ?? 0;
    let bestCount = 0;
    for (const [code, count] of counts) {
      if (count > bestCount) {
        bestCode = code;
        bestCount = count;
      }
    }
    const meta = WEATHER_CODE_META[bestCode] ?? { label: 'variable', emoji: '🌡️' };

    return { city, minTemp, maxTemp, condition: WEATHER_LABELS[meta.label][lang], emoji: meta.emoji };
  } catch {
    return null;
  }
}

// Summaries are stored with their condition already rendered in the language
// the report was generated in; map it back to the canonical label so a
// partner reading in another language sees it in theirs.
export function localizeWeather(w: WeatherSummary | null, lang: Lang): WeatherSummary | null {
  if (!w) return w;
  for (const labels of Object.values(WEATHER_LABELS)) {
    if (Object.values(labels).includes(w.condition)) return { ...w, condition: labels[lang] };
  }
  return w;
}
