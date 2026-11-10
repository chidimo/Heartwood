import express from 'express';
import cors from 'cors';
import type { DbClient } from '@heartwood/database';

import morganMiddleware from './middleware/morgan.middleware';
import { errorHandler } from './middleware/error-handler';
import { createHealthRoutes } from './routes/health';

interface AppDeps {
  db: DbClient;
}

export function createApp({ db }: AppDeps) {
  const app = express();
  const frontendUrls = process.env.ALLOWED_URLS?.split(',').map(url => url.trim()) || [];

  app.use(
    cors({
      origin: ['http://localhost:5175', ...frontendUrls].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json());
  app.use(morganMiddleware);

  app.use('/api/health', createHealthRoutes(db));

  app.use(errorHandler);
  return app;
}
