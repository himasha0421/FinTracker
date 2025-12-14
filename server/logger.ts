import pino from 'pino';
import { config, isDevelopment } from './config';

export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  base: undefined,
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
        },
      }
    : undefined,
});

export function createRequestLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
