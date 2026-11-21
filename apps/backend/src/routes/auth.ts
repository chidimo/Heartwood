import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { DbClient } from '@heartwood/database';
import { loginSchema, profileUpdateSchema, refreshSchema, registerSchema } from '@heartwood/shared';
import { createAuthenticate, requireAccountId } from '../middleware/authenticate';
import { parseBody } from '../middleware/validate';
import {
  getAccount,
  loginAccount,
  logoutSession,
  refreshSession,
  registerAccount,
  updateProfile,
} from '../modules/account/account.service';
import { created, noContent, ok } from '../utils/response';

interface Options {
  authSecret: string;
  /** Attempts per window per IP on login and register. Tests raise this. */
  authLimit?: number;
}

export function createAuthRoutes(db: DbClient, { authSecret, authLimit = 10 }: Options) {
  const router = Router();
  const authenticate = createAuthenticate(authSecret);
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: authLimit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Try again later.' },
  });

  router.post('/register', limiter, async (req, res, next) => {
    try {
      created(res, await registerAccount(db, parseBody(registerSchema, req.body), authSecret));
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', limiter, async (req, res, next) => {
    try {
      ok(res, await loginAccount(db, parseBody(loginSchema, req.body), authSecret));
    } catch (error) {
      next(error);
    }
  });

  router.post('/refresh', async (req, res, next) => {
    try {
      const { refreshToken } = parseBody(refreshSchema, req.body);
      ok(res, await refreshSession(db, refreshToken, authSecret));
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      await logoutSession(db, parseBody(refreshSchema, req.body).refreshToken);
      noContent(res);
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', authenticate, async (req, res, next) => {
    try {
      ok(res, await getAccount(db, requireAccountId(req)));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/me', authenticate, async (req, res, next) => {
    try {
      ok(
        res,
        await updateProfile(db, requireAccountId(req), parseBody(profileUpdateSchema, req.body))
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
