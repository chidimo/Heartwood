import { Router } from 'express';
import { sql } from 'kysely';
import type { DbClient } from '@heartwood/database';
import { ok } from '../utils/response';

export function createHealthRoutes(db: DbClient) {
  const router = Router();

  // Liveness: no database call.
  router.get('/', (_req, res) => {
    ok(res, { status: 'ok' });
  });

  // Readiness: proves the database is reachable.
  router.get('/db', async (_req, res, next) => {
    try {
      await sql`select 1`.execute(db);
      ok(res, { status: 'ok' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
