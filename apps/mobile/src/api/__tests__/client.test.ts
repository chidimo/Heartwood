jest.mock('../../storage/storage', () => {
  const data = new Map<string, string>();
  return {
    storage: {
      get: async (key: string) => data.get(key) ?? null,
      set: async (key: string, value: string) => void data.set(key, value),
      remove: async (key: string) => void data.delete(key),
    },
  };
});

import { ApiError, Unreachable, apiFetch, errorMessage } from '../client';

const respond = (status: number, body: unknown) =>
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

afterEach(() => jest.restoreAllMocks());

describe('apiFetch', () => {
  it('returns the parsed body on success', async () => {
    respond(200, { status: 'ok' });
    await expect(apiFetch('/health')).resolves.toEqual({ status: 'ok' });
  });

  it("throws ApiError carrying the server's message", async () => {
    respond(404, { error: 'Not found' });
    await expect(apiFetch('/x')).rejects.toMatchObject({ message: 'Not found', status: 404 });
  });

  it('throws Unreachable when the request gets no answer', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
    await expect(apiFetch('/x')).rejects.toBeInstanceOf(Unreachable);
  });
});

describe('errorMessage', () => {
  it('shows ApiError messages and hides everything else behind the fallback', () => {
    expect(errorMessage(new ApiError('Nope', 400))).toBe('Nope');
    expect(errorMessage(new Error('stack trace noise'), 'Fallback')).toBe('Fallback');
  });
});

describe('apiFetch with a session', () => {
  const { setSignedOutHandler } = jest.requireActual('../client') as typeof import('../client');
  const tokens = jest.requireActual(
    '../../auth/token-store'
  ) as typeof import('../../auth/token-store');

  // Routes a fake backend: /health-like paths succeed only with the "fresh" token.
  const backend = (opts: { refreshOk?: boolean } = {}) => {
    const calls: { path: string; auth: string | null }[] = [];
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input).replace(/^.*\/api/, '');
      const auth = new Headers(init?.headers).get('Authorization');
      calls.push({ path, auth });
      const json = (status: number, body: unknown) =>
        ({ ok: status < 300, status, json: async () => body }) as Response;
      if (path === '/auth/refresh') {
        return opts.refreshOk === false
          ? json(401, { error: 'Session expired' })
          : json(200, { accessToken: 'fresh', refreshToken: 'r2', expiresIn: 900 });
      }
      return auth === 'Bearer fresh'
        ? json(200, { ok: true })
        : json(401, { error: 'Unauthorized' });
    });
    return calls;
  };

  beforeEach(async () => {
    await tokens.saveTokens({ accessToken: 'stale', refreshToken: 'r1' });
  });
  afterEach(async () => {
    setSignedOutHandler(null);
    await tokens.clearTokens();
  });

  it('sends the access token', async () => {
    await tokens.saveTokens({ accessToken: 'fresh', refreshToken: 'r1' });
    const calls = backend();
    await apiFetch('/assets');
    expect(calls[0].auth).toBe('Bearer fresh');
  });

  it('does not send a token when auth is false', async () => {
    const calls = backend();
    await apiFetch('/auth/login', { auth: false }).catch(() => undefined);
    expect(calls[0].auth).toBeNull();
  });

  it('refreshes once on a 401, stores the new tokens, and retries', async () => {
    const calls = backend();
    await expect(apiFetch('/assets')).resolves.toEqual({ ok: true });
    expect(calls.map(c => c.path)).toEqual(['/assets', '/auth/refresh', '/assets']);
    expect(tokens.getTokens()).toEqual({ accessToken: 'fresh', refreshToken: 'r2' });
  });

  it('shares one refresh between requests that expire together', async () => {
    const calls = backend();
    await Promise.all([apiFetch('/assets'), apiFetch('/beneficiaries'), apiFetch('/executors')]);
    expect(calls.filter(c => c.path === '/auth/refresh')).toHaveLength(1);
  });

  it('signs the person out when the refresh fails', async () => {
    backend({ refreshOk: false });
    const signedOut = jest.fn();
    setSignedOutHandler(signedOut);
    await expect(apiFetch('/assets')).rejects.toMatchObject({ status: 401 });
    expect(signedOut).toHaveBeenCalledTimes(1);
    expect(tokens.getTokens()).toBeNull();
  });
});
