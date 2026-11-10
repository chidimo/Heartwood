import type { AuthResponse } from '@heartwood/shared';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** The request never got an answer (offline, refused, blocked). */
export class Unreachable extends ApiError {
  constructor() {
    super("Can't reach Heartwood. Check your connection and try again.", 0);
  }
}

/** A message safe to show a person: the server's, or the fallback for anything else. */
export const getErrorMessage = (error: unknown, fallback = 'Something went wrong.'): string =>
  error instanceof ApiError ? error.message : fallback;

export const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4300/api').replace(
  /\/$/,
  ''
);

// Tokens. The access token lives in memory only. The refresh token is kept in localStorage so a reload
// keeps the person signed in; the trade-off (readable by any script on this origin) is why the web
// client must never load third-party scripts, and is recorded in docs/standards/security.md.
const REFRESH_KEY = 'heartwood.refreshToken';
let accessToken: string | null = null;

const readRefresh = (): string | null => {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
};
const writeRefresh = (token: string | null) => {
  try {
    if (token) localStorage.setItem(REFRESH_KEY, token);
    else localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Storage blocked: the session just won't survive a reload.
  }
};

export const tokens = {
  save: (next: { accessToken: string; refreshToken: string }) => {
    accessToken = next.accessToken;
    writeRefresh(next.refreshToken);
  },
  clear: () => {
    accessToken = null;
    writeRefresh(null);
  },
  hasRefresh: () => readRefresh() !== null,
  access: () => accessToken,
};

let onSignedOut: (() => void) | null = null;
/** Called when the session can't be refreshed any more (the app then shows the sign-in page). */
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

/**
 * Trades the stored refresh token for a new pair. One at a time: the server rotates refresh tokens and
 * treats a reused one as theft, so two parallel refreshes would sign the person out.
 */
export const refreshSession = (): Promise<boolean> => {
  refreshing ??= (async () => {
    const refreshToken = readRefresh();
    if (!refreshToken) return false;
    try {
      const res = await send(
        '/auth/refresh',
        { method: 'POST', body: JSON.stringify({ refreshToken }) },
        null
      );
      if (!res.ok) return false;
      const body = (await res.json()) as AuthResponse;
      tokens.save({ accessToken: body.accessToken, refreshToken: body.refreshToken });
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
  /** Send the access token and refresh once on a 401. Default true; pass false for sign-in and register. */
  auth?: boolean;
}

/** JSON request to the backend. Throws ApiError (with the server's message) on a non-2xx. */
export const apiFetch = async <T>(
  path: string,
  { auth = true, ...init }: Options = {}
): Promise<T> => {
  const first = await send(path, init, auth ? tokens.access() : null);
  if (!auth || first.status !== 401) return readBody<T>(first);

  if (!(await refreshSession())) {
    tokens.clear();
    onSignedOut?.();
    return readBody<T>(first);
  }
  return readBody<T>(await send(path, init, tokens.access()));
};

export const postJson = <T>(path: string, body: unknown, options: Options = {}) =>
  apiFetch<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) });
