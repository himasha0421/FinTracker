import pino from 'pino';
import { config, isDevelopment } from './config';

function getArgValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function isMcpStdioProcess(): boolean {
  const isMcpEntry = process.argv.some(arg => /[\\/](mcp)[\\/]/.test(arg));
  if (!isMcpEntry) return false;

  const transport = (getArgValue('--transport') ?? process.env.MCP_TRANSPORT ?? 'stdio')
    .trim()
    .toLowerCase();
  return transport === 'stdio';
}

const useStderr = isMcpStdioProcess();

const loggerOptions: pino.LoggerOptions = {
  level: isDevelopment ? 'debug' : 'info',
  base: undefined,
  transport: isDevelopment && !useStderr
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
        },
      }
    : undefined,
};

const destination = useStderr ? pino.destination({ dest: 2, sync: true }) : undefined;

export const logger = destination ? pino(loggerOptions, destination) : pino(loggerOptions);

export function createRequestLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
