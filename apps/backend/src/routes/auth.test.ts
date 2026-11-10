import request from 'supertest';
import { createApp } from '../app';
import { hashRefreshToken } from '../lib/tokens';
import { TEST_AUTH_SECRET, createTestApp, registerTestUser } from '../test-utils/test-app';
import { useTestDb } from '../test-utils/useTestDb';

describe('auth', () => {
  const db = useTestDb();
  const app = createTestApp(db);

  describe('POST /api/auth/register', () => {
    it('creates an account, returns tokens, and never returns the password hash', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Ada Obi', email: 'Ada@Example.com', password: 'a-long-enough-password' });
      expect(res.status).toBe(201);
      expect(res.body.account).toMatchObject({ name: 'Ada Obi', email: 'ada@example.com' });
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
      expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    });

    it('stores a bcrypt hash, not the password, and only the hash of the refresh token', async () => {
      const user = await registerTestUser(app, { password: 'plain-text-secret-1' });
      const row = await db.selectFrom('account').selectAll().executeTakeFirstOrThrow();
      expect(row.password_hash).not.toContain('plain-text-secret-1');
      expect(row.password_hash).toMatch(/^\$2[aby]\$/);
      const stored = await db.selectFrom('refresh_token').selectAll().executeTakeFirstOrThrow();
      expect(stored.token_hash).toBe(hashRefreshToken(user.refreshToken));
      expect(stored.token_hash).not.toBe(user.refreshToken);
    });

    it('rejects a duplicate email regardless of case', async () => {
      await registerTestUser(app, { email: 'dup@example.com' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Other', email: 'DUP@example.com', password: 'another-long-password' });
      expect(res.status).toBe(409);
    });

    it('rejects a short password and names the field without echoing the value', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Ada', email: 'ada@example.com', password: 'short' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid password');
    });

    it('rejects a missing body', async () => {
      const res = await request(app).post('/api/auth/register');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('signs in with the right password', async () => {
      const { credentials } = await registerTestUser(app);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: credentials.email, password: credentials.password });
      expect(res.status).toBe(200);
      expect(res.body.account.email).toBe(credentials.email);
    });

    it('gives the same error for a wrong password and an unknown email', async () => {
      const { credentials } = await registerTestUser(app);
      const wrong = await request(app)
        .post('/api/auth/login')
        .send({ email: credentials.email, password: 'wrong-password-1' });
      const unknown = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong-password-1' });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body).toEqual(unknown.body);
    });

    it('is rate limited per IP', async () => {
      const limited = createTestApp(db, 3);
      const attempt = () =>
        request(limited).post('/api/auth/login').send({ email: 'a@example.com', password: 'x' });
      for (let i = 0; i < 3; i += 1) expect((await attempt()).status).toBe(401);
      expect((await attempt()).status).toBe(429);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the signed-in account', async () => {
      const user = await registerTestUser(app);
      const res = await request(app).get('/api/auth/me').set('Authorization', user.bearer);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(user.account);
    });

    it('rejects a missing, malformed, or wrongly signed token', async () => {
      const user = await registerTestUser(app);
      expect((await request(app).get('/api/auth/me')).status).toBe(401);
      const garbage = await request(app).get('/api/auth/me').set('Authorization', 'Bearer nope');
      expect(garbage.status).toBe(401);
      const otherApp = createApp({ db, authSecret: 'a-different-secret-that-is-32-chars-long' });
      const wrongKey = await request(otherApp)
        .get('/api/auth/me')
        .set('Authorization', user.bearer);
      expect(wrongKey.status).toBe(401);
      expect(TEST_AUTH_SECRET).not.toBe('a-different-secret-that-is-32-chars-long');
    });

    it('rejects the token of a deleted account', async () => {
      const user = await registerTestUser(app);
      await db.updateTable('account').set({ deleted_at: new Date() }).execute();
      const res = await request(app).get('/api/auth/me').set('Authorization', user.bearer);
      expect(res.status).toBe(401);
    });
  });

  describe('refresh tokens', () => {
    it('rotates: the new pair works and the old token is single-use', async () => {
      const user = await registerTestUser(app);
      const first = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: user.refreshToken });
      expect(first.status).toBe(200);
      expect(first.body.refreshToken).not.toBe(user.refreshToken);
      const reuse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: user.refreshToken });
      expect(reuse.status).toBe(401);
    });

    it('reusing a spent token revokes the whole session family', async () => {
      const user = await registerTestUser(app);
      const first = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: user.refreshToken });
      await request(app).post('/api/auth/refresh').send({ refreshToken: user.refreshToken });
      const second = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: first.body.refreshToken });
      expect(second.status).toBe(401);
    });

    it('rejects an expired token', async () => {
      const user = await registerTestUser(app);
      await db
        .updateTable('refresh_token')
        .set({ expires_at: new Date(Date.now() - 1000) })
        .execute();
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: user.refreshToken });
      expect(res.status).toBe(401);
    });

    it('rejects an unknown token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'x'.repeat(43) });
      expect(res.status).toBe(401);
    });

    it('logout revokes the refresh token', async () => {
      const user = await registerTestUser(app);
      const out = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: user.refreshToken });
      expect(out.status).toBe(204);
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: user.refreshToken });
      expect(res.status).toBe(401);
    });
  });
});
