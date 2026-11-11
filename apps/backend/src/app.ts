import express from 'express';
import cors from 'cors';
import type { DbClient } from '@heartwood/database';

import { morganMiddleware } from './middleware/morgan.middleware';
import { errorHandler } from './middleware/error-handler';
import { createAuthRoutes } from './routes/auth';
import { createHealthRoutes } from './routes/health';
import { createInventoryRoutes } from './routes/inventory';

interface AppDeps {
  db: DbClient;
  authSecret: string;
  /** Login/register attempts per 15 minutes per IP (default 10). */
  authLimit?: number;
}

export function createApp({ db, authSecret, authLimit }: AppDeps) {
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
  app.use('/api/auth', createAuthRoutes(db, { authSecret, authLimit }));
  app.use('/api', createInventoryRoutes(db, authSecret));

  app.use(errorHandler);
  return app;
}
