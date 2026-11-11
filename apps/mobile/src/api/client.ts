import type { AuthResponse } from '@heartwood/shared';
import { clearTokens, getTokens, saveTokens } from '../auth/token-store';
import { API_BASE } from '../config';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** The request never got an answer (offline, refused, blocked). */
export class Unreachable extends ApiError {
  constructor() {
    super("Can't reach Heartwood. Check your connection and try again.", 0);
  }
}

/** A message safe to show a person: the server's, or the fallback for anything else. */
export const errorMessage = (error: unknown, fallback = 'Something went wrong.'): string =>
  error instanceof ApiError ? error.message : fallback;

let onSignedOut: (() => void) | null = null;
/** Called when the session can't be refreshed any more (the app then shows the sign-in screen). */
export const setSignedOutHandler = (handler: (() => void) | null) => {
  onSignedOut = handler;
};

const send = async (path: string, init: RequestInit, token: string | null): Promise<Response> => {
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new Unreachable();
  }
};

const readBody = async <T>(res: Response): Promise<T> => {
  const body: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error;
    throw new ApiError(message ?? `Request failed (${res.status})`, res.status);
  }
  return body as T;
};

let refreshing: Promise<boolean> | null = null;

// One refresh at a time: requests that all expire together share it. The server rotates refresh
// tokens and treats a reused one as theft, so two parallel refreshes would sign the person out.
const refreshSession = (): Promise<boolean> => {
  refreshing ??= (async () => {
    const tokens = getTokens();
    if (!tokens) return false;
    try {
      const res = await send(
        '/auth/refresh',
        { method: 'POST', body: JSON.stringify({ refreshToken: tokens.refreshToken }) },
        null
      );
      if (!res.ok) return false;
      const body = (await res.json()) as AuthResponse;
      await saveTokens({ accessToken: body.accessToken, refreshToken: body.refreshToken });
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
};

interface Options extends RequestInit {
  /** Send the access token and refresh once on a 401. Default true; pass false for sign-in, register. */
  auth?: boolean;
}

/** JSON request to the backend. Throws ApiError (with the server's message) on a non-2xx. */
export const apiFetch = async <T>(
  path: string,
  { auth = true, ...init }: Options = {}
): Promise<T> => {
  const first = await send(path, init, auth ? (getTokens()?.accessToken ?? null) : null);
  if (!auth || first.status !== 401) return readBody<T>(first);

  if (!(await refreshSession())) {
    await clearTokens();
    onSignedOut?.();
    return readBody<T>(first);
  }
  return readBody<T>(await send(path, init, getTokens()?.accessToken ?? null));
};

export const postJson = <T>(path: string, body: unknown, options: Options = {}) =>
  apiFetch<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) });
