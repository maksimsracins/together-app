import { api } from './http';
import { Entry, EmotionKey, EntryType } from '../types';

export interface EntryInput {
  type: EntryType;
  emotion: EmotionKey;
  text: string;
  tags: string[];
  hasPhoto?: boolean;
  hasAudio?: boolean;
}

export function listEntries(weekId?: string) {
  const qs = weekId ? `?weekId=${encodeURIComponent(weekId)}` : '';
  return api<Entry[]>(`/api/entries${qs}`);
}

export function listAllEntries() {
  return api<Entry[]>('/api/entries?all=true');
}

export function listPartnerEntries() {
  return api<Entry[]>('/api/entries/partner');
}

export function createEntry(input: EntryInput) {
  return api<Entry>('/api/entries', { method: 'POST', body: input });
}

export function updateEntry(id: string, input: EntryInput) {
  return api<Entry>(`/api/entries/${id}`, { method: 'PATCH', body: input });
}

export function deleteEntry(id: string) {
  return api<void>(`/api/entries/${id}`, { method: 'DELETE' });
}

export function setEntryReaction(id: string, emoji: string | null) {
  return api<{ id: string; reactionEmoji: string | null }>(`/api/entries/${id}/reaction`, {
    method: 'PATCH',
    body: { emoji },
  });
}
