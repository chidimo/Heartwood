import type { Request, Response, NextFunction } from 'express';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  const status = (err as any).output?.statusCode ?? (err as { status?: number }).status ?? 500;
  res.status(status).json({
    error: err.message ?? 'Internal server error',
  });
}
