import type { AuthTokens } from '@heartwood/shared';
import { storage } from '../storage/storage';

const ACCESS_KEY = 'heartwood.accessToken';
const REFRESH_KEY = 'heartwood.refreshToken';

type Stored = Pick<AuthTokens, 'accessToken' | 'refreshToken'>;

// Kept in memory too, so requests don't wait on the keychain for every call.
let cache: Stored | null = null;

export const getTokens = (): Stored | null => cache;

export const loadTokens = async (): Promise<Stored | null> => {
  const [accessToken, refreshToken] = await Promise.all([
    storage.get(ACCESS_KEY),
    storage.get(REFRESH_KEY),
  ]);
  cache = accessToken && refreshToken ? { accessToken, refreshToken } : null;
  return cache;
};

export const saveTokens = async (tokens: Stored): Promise<void> => {
  cache = tokens;
  await Promise.all([
    storage.set(ACCESS_KEY, tokens.accessToken),
    storage.set(REFRESH_KEY, tokens.refreshToken),
  ]);
};

export const clearTokens = async (): Promise<void> => {
  cache = null;
  await Promise.all([storage.remove(ACCESS_KEY), storage.remove(REFRESH_KEY)]);
};
