import { Emotion, EntryTypeMeta } from '../types';

export const ENTRY_TYPES: EntryTypeMeta[] = [
  { key: 'worry', emoji: '🌧️', label: 'Переживание' },
  { key: 'joy', emoji: '🌼', label: 'Радость' },
  { key: 'gratitude', emoji: '🌷', label: 'Благодарность' },
  { key: 'wish', emoji: '🌙', label: 'Пожелание' },
  { key: 'thought', emoji: '💭', label: 'Мысль' },
];

export const EMOTIONS: Emotion[] = [
  { key: 'joy', emoji: '😀', label: 'Радость' },
  { key: 'sadness', emoji: '😔', label: 'Грусть' },
  { key: 'irritation', emoji: '😡', label: 'Раздражение' },
  { key: 'anxiety', emoji: '😰', label: 'Тревога' },
  { key: 'love', emoji: '❤️', label: 'Любовь' },
  { key: 'hurt', emoji: '😞', label: 'Обида' },
  { key: 'calm', emoji: '😌', label: 'Спокойствие' },
  { key: 'doubt', emoji: '😕', label: 'Неуверенность' },
  { key: 'gratitude', emoji: '😊', label: 'Благодарность' },
];

export const LOVE_LANGUAGES = [
  'Слова поддержки',
  'Совместное время',
  'Подарки',
  'Помощь по дому',
  'Прикосновения',
];

export const LOVE_LANGUAGE_INFO: { label: string; emoji: string; description: string }[] = [
  {
    label: 'Слова поддержки',
    emoji: '💬',
    description: 'Тёплые слова, искренние комплименты и поддержка вслух значат для вас больше, чем что-либо ещё.',
  },
  {
    label: 'Совместное время',
    emoji: '⏳',
    description: 'Внимание партнёра и время, проведённое вместе без отвлечений, — вот что наполняет вас любовью.',
  },
  {
    label: 'Подарки',
    emoji: '🎁',
    description: 'Небольшой знак внимания, сделанный от души, говорит вам «я думал(а) о тебе».',
  },
  {
    label: 'Помощь по дому',
    emoji: '🧹',
    description: 'Когда партнёр берёт на себя дела и помогает по хозяйству, вы чувствуете заботу и поддержку.',
  },
  {
    label: 'Прикосновения',
    emoji: '🤍',
    description: 'Объятия, прикосновения и физическая близость — для вас важнейший способ почувствовать связь.',
  },
];

export const AVATAR_EMOJIS = ['🌸', '🌊', '🌿', '🌙', '⭐️', '☕️', '🎨', '🎧', '🦊', '🐣'];

export const entryTypeMeta = (key: string) =>
  ENTRY_TYPES.find((t) => t.key === key) ?? ENTRY_TYPES[0];

export const emotionMeta = (key: string) =>
  EMOTIONS.find((e) => e.key === key) ?? EMOTIONS[0];
