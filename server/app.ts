import express from 'express';
import { createServer } from 'http';
import { createApiRouter } from './routes';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { setupVite, serveStatic } from './vite';
import { config, isDevelopment } from './config';
import { logger } from './logger';
import { storage } from './storage';
import { seedStorage } from './storage/seeds';

export async function startServer() {
  const app = express();
  app.set('env', config.NODE_ENV);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);

  app.use('/api', createApiRouter());

  const server = createServer(app);

  if (isDevelopment && config.STORAGE_TYPE === 'memory') {
    await seedStorage(storage);
  }

  if (isDevelopment) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  app.use(errorHandler);

  const port = config.PORT;
  server.listen(port, () => {
    logger.info(`Serving on port ${port}`);
  });

  return server;
}
