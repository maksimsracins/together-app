import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { TOUR_STEPS } from './steps';

export interface TourRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Remembered per account, so a partner signing in on the same phone still
// gets their own walkthrough.
const doneKey = (userId: string) => `together_tour_done_${userId}`;

interface TourState {
  active: boolean;
  index: number;
  // Window-space frame of the current step's target, once it has measured.
  rect: TourRect | null;
  userId: string | null;
  start: (userId: string) => void;
  startIfFirstTime: (userId: string) => Promise<void>;
  next: () => void;
  finish: () => void;
  setRect: (rect: TourRect) => void;
}

export const useTourStore = create<TourState>((set, get) => ({
  active: false,
  index: 0,
  rect: null,
  userId: null,

  start: (userId) => set({ active: true, index: 0, rect: null, userId }),

  startIfFirstTime: async (userId) => {
    const done = await SecureStore.getItemAsync(doneKey(userId)).catch(() => null);
    if (!done && !get().active) get().start(userId);
  },

  next: () => {
    const { index } = get();
    if (index >= TOUR_STEPS.length - 1) {
      get().finish();
      return;
    }
    set({ index: index + 1, rect: null });
  },

  finish: () => {
    const { userId } = get();
    if (userId) SecureStore.setItemAsync(doneKey(userId), '1').catch(() => {});
    set({ active: false, index: 0, rect: null });
  },

  setRect: (rect) => set({ rect }),
}));

export function useActiveTourTarget() {
  return useTourStore((s) => (s.active ? TOUR_STEPS[s.index].target ?? null : null));
}
