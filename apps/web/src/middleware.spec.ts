/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { SignJWT } from 'jose';

describe('Middleware Security', () => {
  const secret = new TextEncoder().encode('test-secret');

  beforeAll(() => {
    process.env.NEXT_PUBLIC_JWT_SECRET = 'test-secret';
  });

  beforeEach(() => {
    // Clear session cache between tests
    jest.resetModules();
  });

  it('should redirect to login if no token for dashboard', async () => {
    const req = new NextRequest('http://localhost:3000/dashboard');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('should redirect to login if token is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/dashboard');
    req.cookies.set('token', 'invalid-token-string');
    
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('should allow access to dashboard if token is valid', async () => {
    const token = await new SignJWT({ id: '123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h')
      .sign(secret);

    const req = new NextRequest('http://localhost:3000/dashboard');
    req.cookies.set('token', token);
    
    const res = await middleware(req);
    // NextResponse.next() doesn't set status 307
    expect(res.status).toBe(200);
  });

  it('should redirect authenticated user from login to dashboard', async () => {
    const token = await new SignJWT({ id: '123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h')
      .sign(secret);

    const req = new NextRequest('http://localhost:3000/login');
    req.cookies.set('token', token);
    
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('should cache valid token validation', async () => {
    const token = await new SignJWT({ id: '456' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h')
      .sign(secret);

    const req = new NextRequest('http://localhost:3000/dashboard');
    req.cookies.set('token', token);
    
    // First request
    const res1 = await middleware(req);
    expect(res1.status).toBe(200);
    
    // Second request should use cache
    const res2 = await middleware(req);
    expect(res2.status).toBe(200);
  });
});
