import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger';
import { HttpError } from '../errors';

type ErrorShape = {
  error: {
    code: number;
    message: string;
    details?: unknown;
  };
};

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const status =
    err instanceof HttpError
      ? err.status
      : err instanceof ZodError
        ? 400
        : (err as any)?.status || (err as any)?.statusCode || 500;

  const message =
    err instanceof HttpError
      ? err.message
      : err instanceof ZodError
        ? 'Invalid request data'
        : (err as any)?.message || 'Internal Server Error';

  const details = err instanceof HttpError ? err.details : err instanceof ZodError ? err.issues : undefined;
  const payload: ErrorShape = {
    error: { code: status, message, details },
  };

  (req.log ?? logger).error({ err, requestId: req.requestId }, message);
  res.status(status).json(payload);
}
