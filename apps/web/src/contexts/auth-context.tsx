'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ── Cookie helpers ──────────────────────────────────────────────────────────
function setTokenCookie(token: string) {
  document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`;
}
function clearTokenCookie() {
  document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Save tokens helper ──────────────────────────────────────────────────
  const saveAuth = useCallback(
    (data: { accessToken: string; refreshToken: string; user: { id: string; email: string } }) => {
      setToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setTokenCookie(data.accessToken);
      scheduleRefresh();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Auto-refresh: schedule a refresh 1 minute before token expiry ───────
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    // Access token is 15m = 900s. Refresh at 13m = 780s.
    refreshTimerRef.current = setTimeout(async () => {
      const rt = localStorage.getItem('refreshToken');
      if (!rt) return;

      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        });

        if (res.ok) {
          const data = await res.json();
          // Save without re-triggering scheduleRefresh inside saveAuth
          setToken(data.accessToken);
          localStorage.setItem('token', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          setTokenCookie(data.accessToken);
          scheduleRefresh(); // schedule next refresh
        } else {
          // Refresh failed — user must re-login
          doLogout();
        }
      } catch {
        // Network error — don't log out, just try again later
        refreshTimerRef.current = setTimeout(scheduleRefresh, 60_000);
      }
    }, 13 * 60 * 1000); // 13 minutes
  }, []);

  const doLogout = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    clearTokenCookie();
  }, []);

  // ── Init: restore session on mount ──────────────────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setTokenCookie(storedToken);
      scheduleRefresh();
    }
    setIsLoading(false);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Login failed');
    }

    const data = await res.json();
    saveAuth(data);
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const register = async (email: string, password: string, name?: string) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(error.message || 'Registration failed');
    }

    const data = await res.json();
    saveAuth(data);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout: doLogout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
