import { api, setToken } from './http';
import { AppUser } from '../types';
import { currentLang } from '../i18n';

interface AuthResponse {
  token: string;
  user: AppUser;
}

export async function signup(email: string, password: string, name: string): Promise<AppUser> {
  const res = await api<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: { email, password, name, language: currentLang() },
    auth: false,
  });
  await setToken(res.token);
  return res.user;
}

export async function login(email: string, password: string): Promise<AppUser> {
  const res = await api<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  await setToken(res.token);
  return res.user;
}

export async function loginWithApple(identityToken: string, fullName?: string): Promise<AppUser> {
  const res = await api<AuthResponse>('/api/auth/apple', {
    method: 'POST',
    body: { identityToken, fullName, language: currentLang() },
    auth: false,
  });
  await setToken(res.token);
  return res.user;
}

export async function logout() {
  await setToken(null);
}

export function requestPasswordReset(email: string) {
  return api<void>('/api/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
}

export async function resetPassword(email: string, code: string, password: string): Promise<AppUser> {
  const res = await api<AuthResponse>('/api/auth/reset-password', {
    method: 'POST',
    body: { email, code, password },
    auth: false,
  });
  await setToken(res.token);
  return res.user;
}
