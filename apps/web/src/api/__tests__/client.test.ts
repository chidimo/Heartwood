import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiFetch,
  ApiError,
  refreshSession,
  setSignedOutHandler,
  tokens,
  Unreachable,
} from '../client';

const json = (status: number, body: unknown) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status });

const pair = (n: number) => ({
  accessToken: `access-${n}`,
  refreshToken: `refresh-${n}`,
  account: { id: 'a', name: 'A', email: 'a@example.com' },
});

beforeEach(() => {
  localStorage.clear();
  tokens.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  setSignedOutHandler(null);
});

describe('apiFetch', () => {
  it('sends the access token and returns the JSON body', async () => {
    tokens.save({ accessToken: 'tok', refreshToken: 'r' });
    const fetchMock = vi.fn().mockResolvedValue(json(200, { ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await apiFetch('/assets')).toEqual({ ok: 1 });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  it("throws ApiError with the server's message", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(400, { error: 'Bad thing' })));
    await expect(apiFetch('/assets', { auth: false })).rejects.toMatchObject({
      message: 'Bad thing',
      status: 400,
    });
  });

  it('reports an unreachable server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(apiFetch('/assets', { auth: false })).rejects.toBeInstanceOf(Unreachable);
  });

  it('on a 401 refreshes once, then retries with the new token', async () => {
    tokens.save({ accessToken: 'old', refreshToken: 'refresh-1' });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401, { error: 'expired' }))
      .mockResolvedValueOnce(json(200, pair(2)))
      .mockResolvedValueOnce(json(200, { done: true }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await apiFetch('/assets')).toEqual({ done: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer access-2');
    expect(localStorage.getItem('heartwood.refreshToken')).toBe('refresh-2');
  });

  it('signs out when the refresh is refused', async () => {
    tokens.save({ accessToken: 'old', refreshToken: 'refresh-1' });
    const onSignedOut = vi.fn();
    setSignedOutHandler(onSignedOut);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json(401, { error: 'expired' }))
        .mockResolvedValueOnce(json(401, { error: 'revoked' }))
    );

    await expect(apiFetch('/assets')).rejects.toBeInstanceOf(ApiError);
    expect(onSignedOut).toHaveBeenCalledTimes(1);
    expect(tokens.hasRefresh()).toBe(false);
  });
});

describe('refreshSession', () => {
  it('runs one request for parallel callers (a reused refresh token would sign the person out)', async () => {
    tokens.save({ accessToken: 'old', refreshToken: 'refresh-1' });
    const fetchMock = vi.fn().mockResolvedValue(json(200, pair(2)));
    vi.stubGlobal('fetch', fetchMock);

    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    expect(results).toEqual([true, true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('is false with no stored refresh token, without calling the server', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await refreshSession()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
