import { create } from 'zustand';
import { EmotionKey, Entry, EntryType, WeeklyReport } from '../types';
import * as entriesService from '../services/entries';
import * as reportService from '../services/report';
import * as couplesService from '../services/couples';
import { CoupleSettings } from '../services/couples';

interface NewEntryInput {
  type: EntryType;
  emotion: EmotionKey;
  text: string;
  tags: string[];
  hasPhoto?: boolean;
  hasAudio?: boolean;
}

type ReportStatus = 'idle' | 'loading' | 'error' | 'ready';
type EntriesStatus = 'idle' | 'loading' | 'error' | 'ready';

interface AppState {
  entries: Entry[];
  entriesStatus: EntriesStatus;

  // Partner entries that have already surfaced in some past report — unlike
  // `entries` (your own, current week), these are read-only and permanent
  // once unlocked, so they don't get lost once a newer report supersedes the
  // one that first revealed them.
  partnerEntries: Entry[];
  partnerEntriesStatus: EntriesStatus;

  weeklyReport: WeeklyReport | null;
  reportStatus: ReportStatus;
  reportError: string | null;
  reportSource: 'none' | 'ai';
  reportGeneratedAt: string | null;

  // One shared object per couple, not per-device -- kept in sync the same way
  // as the report, so a setting either partner changes shows up for the
  // other without needing to leave and reopen the app.
  coupleSettings: CoupleSettings | null;

  loadEntries: () => Promise<void>;
  loadPartnerEntries: () => Promise<void>;
  addEntry: (input: NewEntryInput) => Promise<void>;
  updateEntry: (id: string, input: NewEntryInput) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  setEntryReaction: (entryId: string, emoji: string | null) => Promise<void>;
  loadLatestReport: () => Promise<void>;
  generateReport: () => Promise<void>;
  loadCoupleSettings: () => Promise<void>;
  reset: () => void;
}

function buildWeeklyReport(envelope: reportService.ReportEnvelope): WeeklyReport {
  const r = envelope.report;
  return {
    weekLabel: envelope.weekLabel,
    myEntries: r.myEntries,
    partnerEntries: r.partnerEntries,
    narrative: r.narrative,
    narrativeDeep: r.narrativeDeep,
  };
}

const initialState = {
  entries: [] as Entry[],
  entriesStatus: 'idle' as EntriesStatus,
  partnerEntries: [] as Entry[],
  partnerEntriesStatus: 'idle' as EntriesStatus,
  weeklyReport: null as WeeklyReport | null,
  reportStatus: 'idle' as ReportStatus,
  reportError: null as string | null,
  reportSource: 'none' as 'none' | 'ai',
  reportGeneratedAt: null as string | null,
  coupleSettings: null as CoupleSettings | null,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  loadEntries: async () => {
    set({ entriesStatus: 'loading' });
    try {
      const entries = await entriesService.listEntries();
      set({ entries, entriesStatus: 'ready' });
    } catch {
      set({ entriesStatus: 'error' });
    }
  },

  loadPartnerEntries: async () => {
    set({ partnerEntriesStatus: 'loading' });
    try {
      const partnerEntries = await entriesService.listPartnerEntries();
      set({ partnerEntries, partnerEntriesStatus: 'ready' });
    } catch {
      set({ partnerEntriesStatus: 'error' });
    }
  },

  addEntry: async (input) => {
    const entry = await entriesService.createEntry(input);
    set((state) => ({ entries: [entry, ...state.entries] }));
  },

  updateEntry: async (id, input) => {
    const entry = await entriesService.updateEntry(id, input);
    set((state) => ({ entries: state.entries.map((e) => (e.id === id ? entry : e)) }));
  },

  deleteEntry: async (id) => {
    await entriesService.deleteEntry(id);
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
  },

  setEntryReaction: async (entryId, emoji) => {
    const updated = await entriesService.setEntryReaction(entryId, emoji);
    set((state) => {
      if (!state.weeklyReport) return {};
      const applyReaction = (list: typeof state.weeklyReport.myEntries) =>
        list.map((e) => (e.id === entryId ? { ...e, reactionEmoji: updated.reactionEmoji } : e));
      return {
        weeklyReport: {
          ...state.weeklyReport,
          myEntries: applyReaction(state.weeklyReport.myEntries),
          partnerEntries: applyReaction(state.weeklyReport.partnerEntries),
        },
      };
    });
  },

  loadLatestReport: async () => {
    try {
      const envelope = await reportService.getLatestReport();
      if (!envelope) return;
      const weeklyReport = buildWeeklyReport(envelope);
      set({
        weeklyReport,
        reportSource: 'ai',
        reportStatus: 'ready',
        reportGeneratedAt: envelope.generatedAt,
      });
      get().loadPartnerEntries();
    } catch {
      // no report yet, or offline — keep the "not generated" empty state
    }
  },

  generateReport: async () => {
    set({ reportStatus: 'loading', reportError: null });
    try {
      const envelope = await reportService.generateReport();
      const weeklyReport = buildWeeklyReport(envelope);
      set({
        weeklyReport,
        reportStatus: 'ready',
        reportSource: 'ai',
        reportGeneratedAt: envelope.generatedAt,
      });
      get().loadPartnerEntries();
    } catch (err) {
      set({ reportStatus: 'error', reportError: err instanceof Error ? err.message : 'Не удалось сгенерировать отчёт' });
    }
  },

  loadCoupleSettings: async () => {
    try {
      const coupleSettings = await couplesService.getCoupleSettings();
      set({ coupleSettings });
    } catch {
      // offline or not paired yet — keep whatever we last had
    }
  },

  reset: () => set({ ...initialState }),
}));
