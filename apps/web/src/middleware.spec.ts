/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { middleware } from './middleware';

jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
}));

describe('Middleware Security', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_JWT_SECRET = 'test-secret';
  });

  beforeEach(() => {
    // Clear session cache between tests
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should redirect to login if no token for dashboard', async () => {
    const req = new NextRequest('http://localhost:3000/dashboard');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('should redirect to login if token is invalid', async () => {
    (jwtVerify as jest.Mock).mockRejectedValueOnce(new Error('invalid-token'));
    const req = new NextRequest('http://localhost:3000/dashboard');
    req.cookies.set('token', 'invalid-token-string');
    
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('should allow access to dashboard if token is valid', async () => {
    (jwtVerify as jest.Mock).mockResolvedValueOnce({
      payload: { id: '123', exp: Math.floor(Date.now() / 1000) + 60 * 60 },
    });

    const req = new NextRequest('http://localhost:3000/dashboard');
    req.cookies.set('token', 'valid-token');
    
    const res = await middleware(req);
    // NextResponse.next() doesn't set status 307
    expect(res.status).toBe(200);
  });

  it('should redirect authenticated user from login to dashboard', async () => {
    (jwtVerify as jest.Mock).mockResolvedValueOnce({
      payload: { id: '123', exp: Math.floor(Date.now() / 1000) + 60 * 60 },
    });

    const req = new NextRequest('http://localhost:3000/login');
    req.cookies.set('token', 'valid-token');
    
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('should cache valid token validation', async () => {
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: { id: '456', exp: Math.floor(Date.now() / 1000) + 60 * 60 },
    });

    const req = new NextRequest('http://localhost:3000/dashboard');
    req.cookies.set('token', 'cached-valid-token');
    
    // First request
    const res1 = await middleware(req);
    expect(res1.status).toBe(200);
    
    // Second request should use cache
    const res2 = await middleware(req);
    expect(res2.status).toBe(200);
    expect(jwtVerify).toHaveBeenCalledTimes(1);
  });
});
