const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const TOKEN_KEY = "duka_access_token";
const REFRESH_KEY = "duka_refresh_token";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "customer" | "vendor" | "admin";
  date_joined: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(access: string, refresh?: string) {
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export async function authedFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined;
  return res.json();
}

export const auth = {
  async login(username: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error("Invalid credentials");
    const data = await res.json();
    setTokens(data.access, data.refresh);
    return data;
  },
  async register(payload: {
    username: string; email: string; password: string; first_name?: string; last_name?: string; phone?: string;
  }) {
    const res = await fetch(`${API_URL}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async socialLogin(provider: "google" | "apple", idToken: string) {
    const res = await fetch(`${API_URL}/auth/social/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, id_token: idToken }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    setTokens(data.access, data.refresh);
    return data;
  },
  async requestPhoneOTP(phone: string) {
    const res = await fetch(`${API_URL}/auth/phone/request-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ detail: string; debug_code?: string }>;
  },
  async verifyPhoneOTP(phone: string, code: string) {
    const res = await fetch(`${API_URL}/auth/phone/verify-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    if (!res.ok) throw new Error("Invalid or expired code.");
    const data = await res.json();
    setTokens(data.access, data.refresh);
    return data;
  },
  logout() {
    clearTokens();
  },
  me(): Promise<AuthUser> {
    return authedFetch("/auth/me/");
  },
  updateMe(payload: Partial<Pick<AuthUser, "first_name" | "last_name" | "email" | "phone">>): Promise<AuthUser> {
    return authedFetch("/auth/me/", { method: "PATCH", body: JSON.stringify(payload) });
  },
};
