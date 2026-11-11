import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const signAccessToken = (accountId: string, secret: string): string =>
  jwt.sign({}, secret, { subject: accountId, expiresIn: ACCESS_TTL_SECONDS, algorithm: 'HS256' });

/** The account id from a valid access token, or null for anything invalid or expired. */
export const verifyAccessToken = (token: string, secret: string): string | null => {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
};

/** A random refresh token and its hash. Only the hash is stored. */
export const newRefreshToken = () => {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashRefreshToken(token) };
};

export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
