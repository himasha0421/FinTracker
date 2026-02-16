import express, { type Request, type Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from '../logger';
import { registerFinancialTools } from './financialTools/index.js';

type TransportMode = 'stdio' | 'sse';

function getArgValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function resolveTransportMode(): TransportMode {
  const raw = (getArgValue('--transport') ?? process.env.MCP_TRANSPORT ?? 'stdio')
    .trim()
    .toLowerCase();

  if (raw === 'stdio' || raw === 'sse') {
    return raw;
  }

  throw new Error(`Invalid transport mode: ${raw}. Use "stdio" or "sse".`);
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid port value: ${value}`);
  }
  return parsed;
}

function createServer(): McpServer {
  const server = new McpServer(
    {
      name: 'financial-tracker-mcp',
      version: '1.0.0',
    },
    {
      instructions:
        'Use these tools to inspect accounts, transactions, goals, and investments. Prefer scoped date ranges, and call filter-option discovery tools first when valid IDs or text filter values are uncertain.',
    }
  );

  registerFinancialTools(server);
  return server;
}

function getBearerToken(req: Request): string | undefined {
  const raw = req.headers.authorization;
  if (!raw) return undefined;
  const [scheme, token] = raw.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token;
}

function requireAuthToken(req: Request, res: Response, token?: string): boolean {
  if (!token) return true;
  const bearer = getBearerToken(req);
  if (bearer === token) return true;

  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

async function runStdioServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('MCP server running on stdio transport');
}

async function runSseServer() {
  const server = createServer();
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const host = process.env.MCP_HOST ?? '0.0.0.0';
  const port = parsePort(getArgValue('--port') ?? process.env.MCP_PORT, 3001);
  const ssePath = process.env.MCP_SSE_PATH ?? '/sse';
  const messagePath = process.env.MCP_MESSAGE_PATH ?? '/messages';
  const authToken = process.env.MCP_AUTH_TOKEN;

  const transports: Record<string, SSEServerTransport> = {};

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, transport: 'sse' });
  });

  app.get(ssePath, async (req, res) => {
    try {
      if (!requireAuthToken(req, res, authToken)) return;

      const transport = new SSEServerTransport(messagePath, res);
      transports[transport.sessionId] = transport;

      res.on('close', () => {
        delete transports[transport.sessionId];
      });

      await server.connect(transport);
    } catch (error) {
      logger.error({ err: error }, 'Failed to establish SSE transport');
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to establish SSE transport' });
      }
    }
  });

  app.post(messagePath, async (req, res) => {
    try {
      if (!requireAuthToken(req, res, authToken)) return;

      const sessionIdValue = req.query.sessionId;
      let sessionId: string | undefined;
      if (typeof sessionIdValue === 'string') {
        sessionId = sessionIdValue;
      } else if (Array.isArray(sessionIdValue)) {
        const first = sessionIdValue[0];
        if (typeof first === 'string') {
          sessionId = first;
        }
      }

      if (!sessionId) {
        res.status(400).json({ error: 'sessionId query param is required' });
        return;
      }

      const transport = transports[sessionId];
      if (!transport) {
        res.status(404).json({ error: 'No active transport for sessionId' });
        return;
      }

      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      logger.error({ err: error }, 'Failed to process MCP message');
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to process MCP message' });
      }
    }
  });

  app.listen(port, host, () => {
    logger.info(
      `MCP SSE server listening on http://${host}:${port}${ssePath} with messages at ${messagePath}`
    );
    if (authToken) {
      logger.info('MCP auth token enforcement is enabled');
    } else {
      logger.warn('MCP auth token is not set; SSE endpoints are unauthenticated');
    }
  });
}

async function main() {
  const mode = resolveTransportMode();
  if (mode === 'sse') {
    await runSseServer();
    return;
  }

  await runStdioServer();
}

main().catch(error => {
  logger.error({ err: error }, 'Failed to start MCP server');
  process.exit(1);
});
