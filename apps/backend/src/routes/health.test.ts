import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import request from 'supertest';
import type { DB } from '@heartwood/database';
import { createApp } from '../app';
import { useTestDb } from '../test-utils/useTestDb';

describe('GET /api/health/db', () => {
  const db = useTestDb();

  it('reports ok when the database is reachable', async () => {
    const res = await request(createApp({ db })).get('/api/health/db');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 500 with an error message when the database is unreachable', async () => {
    const unreachable = new Kysely<DB>({
      dialect: new PostgresDialect({
        pool: new Pool({ connectionString: 'postgresql://x:x@127.0.0.1:1/x' }),
      }),
    });
    const res = await request(createApp({ db: unreachable })).get('/api/health/db');
    expect(res.status).toBe(500);
    expect(typeof res.body.error).toBe('string');
    await unreachable.destroy();
  });
});
