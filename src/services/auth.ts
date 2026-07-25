import { api, setToken } from './http';
import { AppUser } from '../types';

interface AuthResponse {
  token: string;
  user: AppUser;
}

export async function signup(email: string, password: string, name: string): Promise<AppUser> {
  const res = await api<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: { email, password, name },
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

export async function logout() {
  await setToken(null);
}
