import { storage } from '../../storage/storage';
import { clearTokens, getTokens, loadTokens, saveTokens } from '../token-store';

jest.mock('../../storage/storage', () => {
  const data = new Map<string, string>();
  return {
    storage: {
      get: jest.fn(async (key: string) => data.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => void data.set(key, value)),
      remove: jest.fn(async (key: string) => void data.delete(key)),
    },
  };
});

beforeEach(() => clearTokens());

describe('token store', () => {
  it('saves to secure storage and keeps a synchronous copy', async () => {
    await saveTokens({ accessToken: 'a', refreshToken: 'r' });
    expect(getTokens()).toEqual({ accessToken: 'a', refreshToken: 'r' });
    expect(storage.set).toHaveBeenCalledWith('heartwood.accessToken', 'a');
    expect(storage.set).toHaveBeenCalledWith('heartwood.refreshToken', 'r');
  });

  it('loads what was saved, from storage rather than memory', async () => {
    await saveTokens({ accessToken: 'a', refreshToken: 'r' });
    await clearTokens();
    await saveTokens({ accessToken: 'a2', refreshToken: 'r2' });
    expect(await loadTokens()).toEqual({ accessToken: 'a2', refreshToken: 'r2' });
  });

  it('returns null when only one of the two tokens is present', async () => {
    await saveTokens({ accessToken: 'a', refreshToken: 'r' });
    await storage.remove('heartwood.refreshToken');
    expect(await loadTokens()).toBeNull();
  });

  it('clears both memory and storage', async () => {
    await saveTokens({ accessToken: 'a', refreshToken: 'r' });
    await clearTokens();
    expect(getTokens()).toBeNull();
    expect(await loadTokens()).toBeNull();
  });
});
