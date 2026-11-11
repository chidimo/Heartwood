import type { Response } from 'express';

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json(data);
}

export function created<T>(res: Response, data: T) {
  return ok(res, data, 201);
}

export function noContent(res: Response) {
  return res.status(204).send();
}

export function notFound(res: Response, message = 'Not found') {
  return res.status(404).json({ error: message });
}

export function badRequest(res: Response, message: string) {
  return res.status(400).json({ error: message });
}

export function forbidden(res: Response, message = 'Forbidden') {
  return res.status(403).json({ error: message });
}
