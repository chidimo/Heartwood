import type { Request, Response, NextFunction } from 'express';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const status = (err as { status?: number }).status ?? 500;
  // Log the stack for unexpected errors only; never the request body (docs/standards/security.md).
  if (status >= 500) console.error(err);
  // A 5xx message can carry internals (SQL, hostnames), so clients get a generic one.
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
}
