import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_AUTH_ATTEMPTS = 10;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  const suppliedRequestId = req.header('x-request-id')?.trim();
  const requestId = suppliedRequestId && REQUEST_ID_PATTERN.test(suppliedRequestId) ? suppliedRequestId : randomUUID();
  req.headers['x-request-id'] = requestId;

  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  const isAuthEndpoint = req.path.startsWith('/api/v1/auth/');
  if (!isAuthEndpoint) return next();

  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > MAX_AUTH_ATTEMPTS) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many authentication requests.' } });
  }
  return next();
}
