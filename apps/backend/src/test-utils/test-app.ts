import request from 'supertest';
import type { DbClient } from '@heartwood/database';
import type { AuthResponse } from '@heartwood/shared';
import { createApp } from '../app';

export const TEST_AUTH_SECRET = 'test-secret-that-is-at-least-32-characters-long';

/** The app wired for tests: a fixed secret and a login limit high enough not to interfere. */
export const createTestApp = (db: DbClient, authLimit = 1000) =>
  createApp({ db, authSecret: TEST_AUTH_SECRET, authLimit });

let counter = 0;

/** Registers a fresh account and returns its tokens. Each call makes a different account. */
export const registerTestUser = async (
  app: ReturnType<typeof createTestApp>,
  overrides: { name?: string; email?: string; password?: string } = {}
) => {
  counter += 1;
  const body = {
    name: `Test User ${counter}`,
    email: `user${counter}@example.com`,
    password: 'correct-horse-battery',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register failed: ${res.status}`);
  const auth = res.body as AuthResponse;
  return { ...auth, credentials: body, bearer: `Bearer ${auth.accessToken}` };
};
