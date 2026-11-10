import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { HttpError } from '../utils/http-error';

/**
 * Parses the request body with a Zod schema. The error names the invalid fields. It adds a reason only
 * for our own `refine` messages (code "custom"), which are static strings we wrote; Zod's built-in
 * messages can echo the rejected value, so they are never shown.
 */
export const parseBody = <S extends ZodTypeAny>(schema: S, body: unknown): z.infer<S> => {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const parts = new Map<string, string | null>();
  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || 'body';
    const reason = issue.code === 'custom' ? issue.message : null;
    if (!parts.has(field) || reason) parts.set(field, reason);
  }
  const message = [...parts].map(([field, reason]) => (reason ? `${field}: ${reason}` : field));
  throw new HttpError(400, `Invalid ${message.join('; ')}`);
};

export const validateBody =
  (schema: ZodTypeAny) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = parseBody(schema, req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
