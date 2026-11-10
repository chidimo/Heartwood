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

/** JSON request to the backend. Throws ApiError (with the server's message) on a non-2xx. */
export const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new Unreachable();
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error;
    throw new ApiError(message ?? `Request failed (${res.status})`, res.status);
  }
  return body as T;
};
