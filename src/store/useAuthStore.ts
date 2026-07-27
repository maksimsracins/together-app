import { create } from 'zustand';
import { AppUser } from '../types';
import { getToken } from '../services/http';
import * as authService from '../services/auth';
import * as usersService from '../services/users';
import * as couplesService from '../services/couples';
import { useAppStore } from './useAppStore';
import { useNotificationsStore } from './useNotificationsStore';

type Status = 'bootstrapping' | 'guest' | 'authed';

interface AuthState {
  status: Status;
  user: AppUser | null;
  partner: AppUser | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithApple: (identityToken: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPartner: () => Promise<void>;
  refreshMe: () => Promise<void>;
  updateProfile: (patch: usersService.ProfilePatch) => Promise<void>;
  leaveCouple: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'bootstrapping',
  user: null,
  partner: null,
  error: null,

  bootstrap: async () => {
    const token = await getToken();
    if (!token) {
      set({ status: 'guest' });
      return;
    }
    try {
      const user = await usersService.getMe();
      const partner = user.coupleId ? await usersService.getPartner().catch(() => null) : null;
      set({ status: 'authed', user, partner });
    } catch {
      await authService.logout();
      set({ status: 'guest', user: null, partner: null });
    }
  },

  signup: async (email, password, name) => {
    set({ error: null });
    const user = await authService.signup(email, password, name);
    set({ status: 'authed', user, partner: null });
  },

  login: async (email, password) => {
    set({ error: null });
    const user = await authService.login(email, password);
    const partner = user.coupleId ? await usersService.getPartner().catch(() => null) : null;
    set({ status: 'authed', user, partner });
  },

  loginWithApple: async (identityToken, fullName) => {
    set({ error: null });
    const user = await authService.loginWithApple(identityToken, fullName);
    const partner = user.coupleId ? await usersService.getPartner().catch(() => null) : null;
    set({ status: 'authed', user, partner });
  },

  logout: async () => {
    await authService.logout();
    set({ status: 'guest', user: null, partner: null });
    useAppStore.getState().reset();
    useNotificationsStore.getState().reset();
  },

  refreshPartner: async () => {
    const partner = await usersService.getPartner().catch(() => null);
    set({ partner });
  },

  refreshMe: async () => {
    const user = await usersService.getMe();
    set({ user });
    if (user.coupleId) {
      get().refreshPartner();
    } else {
      set({ partner: null });
    }
  },

  updateProfile: async (patch) => {
    const user = await usersService.updateMe(patch);
    set({ user });
  },

  leaveCouple: async () => {
    await couplesService.leaveCouple();
    const user = await usersService.getMe();
    set({ user, partner: null });
  },
}));
