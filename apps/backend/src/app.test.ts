import request from 'supertest';
import type { DbClient } from '@heartwood/database';
import { createTestApp } from './test-utils/test-app';

describe('GET /api/health', () => {
  it('reports ok without touching the database', async () => {
    const app = createTestApp({} as DbClient);
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
