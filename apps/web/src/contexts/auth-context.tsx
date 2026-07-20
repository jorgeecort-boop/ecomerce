'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { API_URL, api } from '@ecomerce/utils';

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

// ── Safe localStorage wrapper ──────────────────────────────────────────
const safeLocalStorage = {
  getItem: (key: string) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  },
  removeItem: (key: string) => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

// ── Cookie helpers ──────────────────────────────────────────────────────────
function setTokenCookie(token: string) {
  try { document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`; } catch { /* ignore */ }
}
function clearTokenCookie() {
  try { document.cookie = 'token=; path=/; max-age=0; SameSite=Lax'; } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Logout ────────────────────────────────────────────────────────────────
  const doLogout = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setUser(null);
    setToken(null);
    safeLocalStorage.removeItem('token');
    safeLocalStorage.removeItem('refreshToken');
    safeLocalStorage.removeItem('user');
    clearTokenCookie();
  }, []);

  // ── Auto-refresh: schedule a refresh 1 minute before token expiry ───────
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    // Access token is 15m = 900s. Refresh at 13m = 780s.
    refreshTimerRef.current = setTimeout(
      async () => {
        const rt = safeLocalStorage.getItem('refreshToken');
        if (!rt) return;

        try {
          const res = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
          });

          if (res.ok) {
            const data = await res.json();
            const tokens = data.data || data;
            setToken(tokens.accessToken);
            safeLocalStorage.setItem('token', tokens.accessToken);
            safeLocalStorage.setItem('refreshToken', tokens.refreshToken);
            setTokenCookie(tokens.accessToken);
            scheduleRefresh(); // schedule next refresh
          } else {
            doLogout();
          }
        } catch {
          refreshTimerRef.current = setTimeout(scheduleRefresh, 60_000);
        }
      },
      13 * 60 * 1000
    );
  }, [doLogout]);

  // ── Save tokens helper ──────────────────────────────────────────────────
  const saveAuth = useCallback(
    (data: { accessToken: string; refreshToken: string; user: { id: string; email: string } }) => {
      setToken(data.accessToken);
      setUser(data.user);
      safeLocalStorage.setItem('token', data.accessToken);
      safeLocalStorage.setItem('refreshToken', data.refreshToken);
      safeLocalStorage.setItem('user', JSON.stringify(data.user));
      setTokenCookie(data.accessToken);
      scheduleRefresh();
    },
    [scheduleRefresh]
  );

  // ── Init: restore session on mount ──────────────────────────────────────
  useEffect(() => {
    try {
      const storedToken = safeLocalStorage.getItem('token');
      const storedUser = safeLocalStorage.getItem('user');

      if (storedToken && storedUser && storedUser !== 'undefined') {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          setTokenCookie(storedToken);
          scheduleRefresh();
        } catch {
          doLogout();
        }
      }
    } catch {
      // localStorage threw entirely; proceed without session
    } finally {
      setIsLoading(false);
    }

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh, doLogout]);

  // ── Login (with retry for Render cold starts) ──────────────────────────
  const login = async (email: string, password: string) => {
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({ message: 'Login failed' }));
          const message = error.message || 'Login failed';

          const isServerUnavailable =
            res.status === 502 || res.status === 503 || res.status === 504;
          if (isServerUnavailable && attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
            continue;
          }

          throw new Error(message);
        }

        const json = await res.json();
        saveAuth(json.data || json);

        // Merge guest cart if exists
        try {
          const sessionId = safeLocalStorage.getItem('cartSessionId');
          if (sessionId) {
            const tokens = json.data || json;
            api.cart.merge(tokens.accessToken || tokens.token, sessionId).catch(() => {});
            safeLocalStorage.removeItem('cartSessionId');
          }
        } catch {}

        return;
      } catch (err: any) {
        const isNetworkError =
          err.name === 'TypeError' &&
          (err.message === 'Failed to fetch' || err.message.includes('NetworkError'));

        if (isNetworkError && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }

        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
          throw new Error(
            `Cannot connect to API at ${API_URL}. Please check if the server is running.`
          );
        }
        throw err;
      }
    }

    throw new Error('Login failed after multiple attempts');
  };

  // ── Register (with retry for Render cold starts) ──────────────────────
  const register = async (email: string, password: string, name?: string) => {
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({ message: 'Registration failed' }));
          const message = error.message || 'Registration failed';

          const isServerUnavailable =
            res.status === 502 || res.status === 503 || res.status === 504;
          if (isServerUnavailable && attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
            continue;
          }

          throw new Error(message);
        }

        const json = await res.json();
        saveAuth(json.data || json);

        // Merge guest cart if exists
        try {
          const sessionId = safeLocalStorage.getItem('cartSessionId');
          if (sessionId) {
            const tokens = json.data || json;
            api.cart.merge(tokens.accessToken || tokens.token, sessionId).catch(() => {});
            safeLocalStorage.removeItem('cartSessionId');
          }
        } catch {}

        return;
      } catch (err: any) {
        const isNetworkError =
          err.name === 'TypeError' &&
          (err.message === 'Failed to fetch' || err.message.includes('NetworkError'));

        if (isNetworkError && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }

        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
          throw new Error(
            `Cannot connect to API at ${API_URL}. Please check if the server is running.`
          );
        }
        throw err;
      }
    }

    throw new Error('Registration failed after multiple attempts');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout: doLogout }}>
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
