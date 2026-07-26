// Historical weather for a couple's report window, via Open-Meteo (free,
// no API key). Used only as supplementary display/context -- never a
// required part of a report, since a partner may not have set a city.
export interface WeatherSummary {
  city: string;
  minTemp: number;
  maxTemp: number;
  condition: string;
  emoji: string;
}

const WEATHER_CODE_META: Record<number, { label: string; emoji: string }> = {
  0: { label: 'ясно', emoji: '☀️' },
  1: { label: 'преимущественно ясно', emoji: '🌤️' },
  2: { label: 'переменная облачность', emoji: '⛅' },
  3: { label: 'облачно', emoji: '☁️' },
  45: { label: 'туман', emoji: '🌫️' },
  48: { label: 'туман', emoji: '🌫️' },
  51: { label: 'морось', emoji: '🌦️' },
  53: { label: 'морось', emoji: '🌦️' },
  55: { label: 'морось', emoji: '🌦️' },
  61: { label: 'дождь', emoji: '🌧️' },
  63: { label: 'дождь', emoji: '🌧️' },
  65: { label: 'сильный дождь', emoji: '🌧️' },
  71: { label: 'снег', emoji: '🌨️' },
  73: { label: 'снег', emoji: '🌨️' },
  75: { label: 'сильный снег', emoji: '❄️' },
  80: { label: 'ливень', emoji: '🌧️' },
  81: { label: 'ливень', emoji: '🌧️' },
  82: { label: 'сильный ливень', emoji: '⛈️' },
  95: { label: 'гроза', emoji: '⛈️' },
};

async function geocode(city: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru`;
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
  end: Date
): Promise<WeatherSummary | null> {
  if (!city) return null;
  const loc = await geocode(city);
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
    const meta = WEATHER_CODE_META[bestCode] ?? { label: 'переменная погода', emoji: '🌡️' };

    return { city, minTemp, maxTemp, condition: meta.label, emoji: meta.emoji };
  } catch {
    return null;
  }
}
