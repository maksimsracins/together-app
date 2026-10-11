import { Emotion, EntryTypeMeta } from '../types';
import { t } from '../i18n';
import { StringKey } from '../i18n/strings';

// Labels are getters so they always read in the current app language.
export const ENTRY_TYPES: EntryTypeMeta[] = (
  [
    { key: 'worry', emoji: '🌧️' },
    { key: 'joy', emoji: '🌼' },
    { key: 'gratitude', emoji: '🌷' },
    { key: 'wish', emoji: '🌙' },
    { key: 'thought', emoji: '💭' },
  ] as const
).map((e) => ({
  ...e,
  get label() {
    return t(`entryType.${e.key}`);
  },
}));

export const EMOTIONS: Emotion[] = (
  [
    { key: 'joy', emoji: '😀' },
    { key: 'sadness', emoji: '😔' },
    { key: 'irritation', emoji: '😡' },
    { key: 'anxiety', emoji: '😰' },
    { key: 'love', emoji: '❤️' },
    { key: 'hurt', emoji: '😞' },
    { key: 'calm', emoji: '😌' },
    { key: 'doubt', emoji: '😕' },
    { key: 'gratitude', emoji: '😊' },
  ] as const
).map((e) => ({
  ...e,
  get label() {
    return t(`emotion.${e.key}`);
  },
}));

// Stored on the user as these stable keys; shown via loveLanguageLabel().
export const LOVE_LANGUAGES = ['words', 'time', 'gifts', 'service', 'touch'] as const;

const LOVE_LANGUAGE_EMOJI: Record<(typeof LOVE_LANGUAGES)[number], string> = {
  words: '💬',
  time: '⏳',
  gifts: '🎁',
  service: '🧹',
  touch: '🤍',
};

export function loveLanguageLabel(key: string) {
  return (LOVE_LANGUAGES as readonly string[]).includes(key) ? t(`love.${key}` as StringKey) : key;
}

export function loveLanguageInfo() {
  return LOVE_LANGUAGES.map((key) => ({
    key,
    label: t(`love.${key}`),
    emoji: LOVE_LANGUAGE_EMOJI[key],
    description: t(`love.${key}.desc`),
  }));
}

export const AVATAR_EMOJIS = ['🌸', '🌊', '🌿', '🌙', '⭐️', '☕️', '🎨', '🎧', '🦊', '🐣'];

export const entryTypeMeta = (key: string) =>
  ENTRY_TYPES.find((t) => t.key === key) ?? ENTRY_TYPES[0];

export const emotionMeta = (key: string) =>
  EMOTIONS.find((e) => e.key === key) ?? EMOTIONS[0];
