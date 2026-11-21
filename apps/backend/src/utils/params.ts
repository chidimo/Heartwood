import type { Request } from 'express';
import { z } from 'zod';
import { notFoundError } from './http-error';

const uuid = z.string().uuid();

/** A route's `:id` as a UUID. Anything else is "not found" (and never reaches the database). */
export const idParam = (req: Request, name = 'id'): string => {
  const parsed = uuid.safeParse(req.params[name]);
  if (!parsed.success) throw notFoundError();
  return parsed.data;
};
