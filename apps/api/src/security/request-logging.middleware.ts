import { NextFunction, Request, Response } from 'express';

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
    const requestId = res.getHeader('X-Request-ID')?.toString() ?? '-';
    console.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'eiasc-api',
      requestId,
      method: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    }));
  });
  next();
}
