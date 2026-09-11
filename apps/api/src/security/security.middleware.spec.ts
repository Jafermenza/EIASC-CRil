import type { NextFunction, Request, Response } from 'express';
import { jest } from '@jest/globals';
import { securityMiddleware } from './security.middleware';

describe('securityMiddleware', () => {
  function response() {
    const headers = new Map<string, string>();
    return { headers, setHeader(name: string, value: string) { headers.set(name, value); }, getHeader(name: string) { return headers.get(name); }, status(code: number) { return { statusCode: code, json: jest.fn() }; }, } as unknown as Response & { headers: Map<string, string> };
  }
  function request(path: string, ip = '10.0.0.1') { return { path, ip, header: jest.fn().mockReturnValue(undefined) } as unknown as Request; }

  it('sets baseline security headers and request id', () => {
    const req = request('/api/v1/health'); const res = response(); const next = jest.fn() as NextFunction;
    securityMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.getHeader('X-Content-Type-Options')).toBe('nosniff');
    expect(res.getHeader('X-Frame-Options')).toBe('DENY');
    expect(res.getHeader('Referrer-Policy')).toBe('no-referrer');
    expect(res.getHeader('X-Request-ID')).toBeTruthy();
  });

  it('rate-limits repeated authentication requests from the same source', () => {
    const next = jest.fn() as NextFunction;
    for (let i = 0; i < 10; i += 1) { const res = response(); securityMiddleware(request('/api/v1/auth/login', '10.0.0.99'), res, next); }
    const blocked = response();
    securityMiddleware(request('/api/v1/auth/login', '10.0.0.99'), blocked, next);
    expect(blocked.getHeader('Retry-After')).toBeTruthy();
  });
});
