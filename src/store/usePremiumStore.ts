import { create } from 'zustand';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import {
  getCurrentOffering,
  getIsPremium,
  isEntitledFromCustomerInfo,
  isPurchasesConfigured,
  purchasePackage as purchasePackageService,
  restorePurchases as restorePurchasesService,
} from '../services/purchases';

interface PremiumState {
  isPremium: boolean;
  offering: PurchasesOffering | null;
  loading: boolean;
  purchasing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadOffering: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  reset: () => void;
}

const initialState = {
  isPremium: false,
  offering: null as PurchasesOffering | null,
  loading: false,
  purchasing: false,
  error: null as string | null,
};

let listenerAttached = false;

export const usePremiumStore = create<PremiumState>((set, get) => {
  // One listener for the whole app lifetime -- keeps isPremium in sync the
  // moment a renewal, cancellation, or a purchase made on another device
  // changes the customer's entitlements, without polling.
  if (!listenerAttached && isPurchasesConfigured()) {
    listenerAttached = true;
    Purchases.addCustomerInfoUpdateListener((info) => {
      set({ isPremium: isEntitledFromCustomerInfo(info) });
    });
  }

  return {
    ...initialState,

    refresh: async () => {
      set({ loading: true });
      try {
        const isPremium = await getIsPremium();
        set({ isPremium, loading: false });
      } catch {
        set({ loading: false });
      }
    },

    loadOffering: async () => {
      try {
        const offering = await getCurrentOffering();
        set({ offering });
      } catch {
        // Offline, or offerings not configured yet in RevenueCat -- the
        // paywall shows its own "couldn't load plans" state for this.
      }
    },

    purchase: async (pkg) => {
      set({ purchasing: true, error: null });
      try {
        const isPremium = await purchasePackageService(pkg);
        set({ isPremium, purchasing: false });
        return isPremium;
      } catch (err: unknown) {
        const userCancelled = (err as { userCancelled?: boolean } | null)?.userCancelled;
        set({
          purchasing: false,
          error: userCancelled ? null : 'Не удалось оформить подписку. Попробуйте ещё раз.',
        });
        return false;
      }
    },

    restore: async () => {
      set({ purchasing: true, error: null });
      try {
        const isPremium = await restorePurchasesService();
        set({ isPremium, purchasing: false });
        if (!isPremium) set({ error: 'Активная подписка не найдена для этого Apple ID.' });
        return isPremium;
      } catch {
        set({ purchasing: false, error: 'Не удалось восстановить покупки.' });
        return false;
      }
    },

    reset: () => set({ ...initialState }),
  };
});
