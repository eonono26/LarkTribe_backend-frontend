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
  role: "customer" | "vendor" | "admin" | "driver";
  date_joined: string;
  preferred_currency?: string;
  preferred_language?: string;
  profile_picture?: string | null;
  profile_picture_url?: string | null;
  is_phone_verified?: boolean;
  is_staff?: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
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
  const isFormData = options.body instanceof FormData;
  
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });
  
  if (!res.ok) {
    // Handle token expiration
    if (res.status === 401) {
      // Try to refresh token
      try {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const refreshRes = await fetch(`${API_URL}/auth/token/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refreshToken }),
          });
          
          if (refreshRes.ok) {
            const { access } = await refreshRes.json();
            setTokens(access);
            // Retry original request with new token
            const retryRes = await fetch(`${API_URL}${path}`, {
              ...options,
              headers: {
                ...(isFormData ? {} : { "Content-Type": "application/json" }),
                Authorization: `Bearer ${access}`,
                ...options.headers,
              },
              cache: "no-store",
            });
            
            if (!retryRes.ok) {
              const body = await retryRes.text();
              throw new Error(`API ${retryRes.status}: ${body}`);
            }
            if (retryRes.status === 204) return undefined;
            return retryRes.json();
          }
        }
        // If refresh fails, clear tokens and throw
        clearTokens();
        throw new Error("Session expired. Please login again.");
      } catch (refreshError) {
        clearTokens();
        throw new Error("Session expired. Please login again.");
      }
    }
    
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
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || "Invalid credentials");
    }
    const data = await res.json();
    setTokens(data.access, data.refresh);
    return data;
  },
  
  async register(payload: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    role?: "customer" | "vendor" | "driver";
    profile_picture?: File | null;
  }) {
    // Use FormData if there's a profile picture
    if (payload.profile_picture) {
      const formData = new FormData();
      formData.append('username', payload.username);
      formData.append('email', payload.email);
      formData.append('password', payload.password);
      if (payload.first_name) formData.append('first_name', payload.first_name);
      if (payload.last_name) formData.append('last_name', payload.last_name);
      if (payload.phone) formData.append('phone', payload.phone);
      if (payload.role) formData.append('role', payload.role);
      formData.append('profile_picture', payload.profile_picture);
      
      const res = await fetch(`${API_URL}/auth/register/`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Registration failed");
      }
      return res.json();
    }
    
    // Otherwise use JSON
    const res = await fetch(`${API_URL}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || "Registration failed");
    }
    return res.json();
  },
  
  async socialLogin(provider: "google" | "apple", idToken: string) {
    const res = await fetch(`${API_URL}/auth/social/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, id_token: idToken }),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || "Social login failed");
    }
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
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || "Failed to send OTP");
    }
    return res.json() as Promise<{ detail: string; debug_code?: string }>;
  },
  
  async verifyPhoneOTP(phone: string, code: string) {
    const res = await fetch(`${API_URL}/auth/phone/verify-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || "Invalid or expired code.");
    }
    const data = await res.json();
    setTokens(data.access, data.refresh);
    return data;
  },
  
  async refreshToken() {
    const refresh = getRefreshToken();
    if (!refresh) throw new Error("No refresh token available");
    
    const res = await fetch(`${API_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    
    if (!res.ok) {
      clearTokens();
      throw new Error("Failed to refresh token");
    }
    
    const data = await res.json();
    setTokens(data.access);
    return data;
  },
  
  logout() {
    clearTokens();
  },
  
  me(): Promise<AuthUser> {
    return authedFetch("/auth/me/");
  },
  
  updateMe(payload: Partial<AuthUser> | FormData): Promise<AuthUser> {
    const isFormData = payload instanceof FormData;
    return authedFetch("/auth/me/", { 
      method: "PATCH", 
      body: isFormData ? payload : JSON.stringify(payload),
    });
  },
  
  // Profile picture management
  async uploadProfilePicture(file: File): Promise<AuthUser> {
    const formData = new FormData();
    formData.append('profile_picture', file);
    return authedFetch("/auth/profile-picture/", {
      method: "POST",
      body: formData,
    });
  },
  
  async deleteProfilePicture(): Promise<AuthUser> {
    return authedFetch("/auth/profile-picture/", {
      method: "DELETE",
    });
  },
};