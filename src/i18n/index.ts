import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { enUS, lv as lvLocale, ru as ruLocale } from 'date-fns/locale';
import { STRINGS, StringKey } from './strings';

export const LANGUAGES = ['en', 'lv', 'ru'] as const;
export type Lang = (typeof LANGUAGES)[number];
export const DEFAULT_LANG: Lang = 'en';

// Each language's name in itself, for the picker.
export const LANGUAGE_NAMES: Record<Lang, string> = { en: 'English', lv: 'Latviešu', ru: 'Русский' };

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

const STORAGE_KEY = 'together_language';

// The language lives on the account, but is also remembered on the device so
// the signed-out screens (and the first frame after launch) use it too.
async function readStoredLang(): Promise<string | null> {
  if (Platform.OS === 'web') return window.localStorage.getItem(STORAGE_KEY);
  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function writeStoredLang(lang: Lang) {
  if (Platform.OS === 'web') window.localStorage.setItem(STORAGE_KEY, lang);
  else await SecureStore.setItemAsync(STORAGE_KEY, lang);
}

interface LanguageState {
  lang: Lang;
  hydrate: () => Promise<void>;
  setLang: (lang: string) => void;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  lang: DEFAULT_LANG,
  hydrate: async () => {
    const stored = await readStoredLang().catch(() => null);
    if (isLang(stored)) set({ lang: stored });
  },
  setLang: (lang) => {
    if (!isLang(lang) || lang === get().lang) return;
    set({ lang });
    writeStoredLang(lang).catch(() => {});
  },
}));

export function currentLang(): Lang {
  return useLanguageStore.getState().lang;
}

export type TParams = Record<string, string | number>;

export function translate(lang: Lang, key: StringKey, params?: TParams): string {
  const text = STRINGS[key][lang];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match
  );
}

// For code outside React render (stores, alerts in callbacks, catalog getters).
export function t(key: StringKey, params?: TParams): string {
  return translate(currentLang(), key, params);
}

export type TFunction = (key: StringKey, params?: TParams) => string;

// Re-renders the calling component when the language changes.
export function useT(): TFunction {
  const lang = useLanguageStore((s) => s.lang);
  return (key, params) => translate(lang, key, params);
}

export function useLang(): Lang {
  return useLanguageStore((s) => s.lang);
}

const DATE_FNS_LOCALES = { en: enUS, lv: lvLocale, ru: ruLocale };
const INTL_LOCALES: Record<Lang, string> = { en: 'en-GB', lv: 'lv-LV', ru: 'ru-RU' };

export function dateLocale(lang: Lang = currentLang()) {
  return DATE_FNS_LOCALES[lang];
}

export function intlLocale(lang: Lang = currentLang()) {
  return INTL_LOCALES[lang];
}

// Picks the plural form for n. `forms` is "one|other" for English,
// "zero|one|other" for Latvian and "one|few|many" for Russian (see strings).
export function plural(key: StringKey, n: number, lang: Lang = currentLang()): string {
  const forms = translate(lang, key).split('|');
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (lang === 'ru') {
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
  }
  if (lang === 'lv') {
    if (n === 0) return forms[0];
    if (mod10 === 1 && mod100 !== 11) return forms[1];
    return forms[2];
  }
  return n === 1 ? forms[0] : forms[1];
}
