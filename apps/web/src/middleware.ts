import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// In-memory session cache for JWT validation (5-minute TTL)
// Reduces repeated JWT verification overhead on dashboard navigation
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface SessionCacheEntry {
  isValid: boolean;
  expiresAt: number;
  payload?: any;
}
const sessionCache = new Map<string, SessionCacheEntry>();

function cleanExpiredSessionCache(now = Date.now()) {
  for (const [token, entry] of sessionCache.entries()) {
    if (entry.expiresAt < now) {
      sessionCache.delete(token);
    }
  }
}

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.NEXT_PUBLIC_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

async function validateTokenWithApi(token: string): Promise<{ isValid: boolean; payload?: any }> {
  try {
    const response = await fetch(`${API_URL}/auth/validate`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { isValid: false };
    }

    const json = await response.json();
    const data = json.data || json;

    return {
      isValid: data.valid === true,
      payload: data.user,
    };
  } catch {
    return { isValid: false };
  }
}

async function validateToken(token: string): Promise<{ isValid: boolean; payload?: any }> {
  cleanExpiredSessionCache();

  // Check cache first
  const cached = sessionCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return { isValid: cached.isValid, payload: cached.payload };
  }

  try {
    const secret = getJwtSecret();
    if (!secret) {
      const result = await validateTokenWithApi(token);
      sessionCache.set(token, {
        isValid: result.isValid,
        expiresAt: Date.now() + (result.isValid ? SESSION_CACHE_TTL : 60 * 1000),
        payload: result.payload,
      });
      return result;
    }

    const { payload } = await jwtVerify(token, secret);

    // Check expiration
    const expTime = payload.exp ? payload.exp * 1000 : 0;
    const isValid = expTime > 0 && expTime >= Date.now();

    // Cache the result
    sessionCache.set(token, {
      isValid,
      expiresAt: Date.now() + SESSION_CACHE_TTL,
      payload: isValid ? payload : undefined,
    });

    return { isValid, payload: isValid ? payload : undefined };
  } catch (err) {
    // Cache invalid tokens briefly to prevent repeated verification attempts
    sessionCache.set(token, {
      isValid: false,
      expiresAt: Date.now() + 60 * 1000, // 1 minute for invalid tokens
    });
    return { isValid: false };
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const isAuthPage =
    request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register';
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  let isValidToken = false;

  if (token) {
    const result = await validateToken(token);
    isValidToken = result.isValid;
  }

  if (isDashboard && !isValidToken) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (token) {
      response.cookies.delete('token'); // Invalid token, remove it
      sessionCache.delete(token); // Clear from cache
    }
    return response;
  }

  if (isAuthPage && isValidToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
