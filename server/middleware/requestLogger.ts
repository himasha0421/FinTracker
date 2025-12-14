import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { createRequestLogger } from '../logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
  req.requestId = requestId;
  req.log = createRequestLogger({ requestId, method: req.method, path: req.path });

  const start = Date.now();
  res.on('finish', () => {
    req.log?.info({
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
}
