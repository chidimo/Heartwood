import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/tokens';
import { unauthorized } from '../utils/http-error';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `authenticate`: the signed-in account's id. */
    accountId?: string;
  }
}

export const createAuthenticate =
  (secret: string) => (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const accountId = token ? verifyAccessToken(token, secret) : null;
    if (!accountId) return next(unauthorized());
    req.accountId = accountId;
    next();
  };

/** The signed-in account id. Only call inside a route mounted behind `authenticate`. */
export const requireAccountId = (req: Request): string => {
  if (!req.accountId) throw unauthorized();
  return req.accountId;
};
