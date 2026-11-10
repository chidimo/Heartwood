import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { HttpError } from '../utils/http-error';

/** Parses the request body with a Zod schema. Error messages name fields, never echo values. */
export const parseBody = <S extends ZodTypeAny>(schema: S, body: unknown): z.infer<S> => {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const fields = [...new Set(result.error.issues.map(i => i.path.join('.') || 'body'))];
  throw new HttpError(400, `Invalid ${fields.join(', ')}`);
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
