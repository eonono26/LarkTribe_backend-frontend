'use client';

import { useMemo, useState, useEffect, useContext, useCallback, createContext } from 'react';

import { auth, getToken, setTokens, clearTokens } from '@/lib/auth';

import type { AuthUser } from '@/lib/auth';

// ----------------------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const isAdminUser = (u?: AuthUser | null) => !!u && (u.role === 'admin' || !!u.is_staff);

type Status = 'loading' | 'anonymous' | 'forbidden' | 'admin';

type AdminAuthValue = {
  status: Status;
  user: AuthUser | null;
  /** Verifies the account is an admin BEFORE storing any tokens. */
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
};

const Ctx = createContext<AdminAuthValue | null>(null);

export function useAdminAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return v;
}

function parseLoginError(text: string): string {
  try {
    const d = JSON.parse(text);
    if (typeof d.detail === 'string') return d.detail;
  } catch { /* not json */ }
  return 'Could not sign in. Check your username and password.';
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  const load = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setStatus('anonymous');
      return;
    }
    try {
      const me = await auth.me();
      setUser(me);
      setStatus(isAdminUser(me) ? 'admin' : 'forbidden');
    } catch {
      clearTokens();
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    load();
    // Keep tabs in sync: signing in/out on the storefront in another tab updates the admin too.
    const onStorage = (e: StorageEvent) => { if (e.key === 'duka_access_token') load(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [load]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(parseLoginError(text));
    const tokens = JSON.parse(text) as { access: string; refresh: string };

    const meRes = await fetch(`${API_URL}/auth/me/`, { headers: { Authorization: `Bearer ${tokens.access}` } });
    if (!meRes.ok) throw new Error('Signed in, but could not load your profile. Please try again.');
    const me = (await meRes.json()) as AuthUser;
    if (!isAdminUser(me)) {
      throw new Error("This account doesn't have admin access. Use a staff account, or sign in to the store instead.");
    }
    // Same keys the storefront uses, so this one login also signs the admin in to the website.
    setTokens(tokens.access, tokens.refresh);
    setUser(me);
    setStatus('admin');
    return me;
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
