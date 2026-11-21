import * as SecureStore from 'expo-secure-store';
import { storage } from '../storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const secure = SecureStore as jest.Mocked<typeof SecureStore>;

beforeEach(() => jest.clearAllMocks());

describe('storage', () => {
  it('reads and writes through the secure store', async () => {
    secure.getItemAsync.mockResolvedValue('v');
    expect(await storage.get('k')).toBe('v');
    await storage.set('k', 'v');
    expect(secure.setItemAsync).toHaveBeenCalledWith('k', 'v');
  });

  it('gates an item behind authentication when asked', async () => {
    await storage.set('k', 'v', { authenticate: 'Unlock Heartwood' });
    expect(secure.setItemAsync).toHaveBeenCalledWith('k', 'v', {
      requireAuthentication: true,
      authenticationPrompt: 'Unlock Heartwood',
    });
  });

  it('round-trips JSON and returns null for unreadable values', async () => {
    secure.getItemAsync.mockResolvedValueOnce('{"a":1}');
    expect(await storage.getJson('k')).toEqual({ a: 1 });
    secure.getItemAsync.mockResolvedValueOnce('not json');
    expect(await storage.getJson('k')).toBeNull();
    secure.getItemAsync.mockResolvedValueOnce(null);
    expect(await storage.getJson('k')).toBeNull();
  });

  it('removes through the secure store', async () => {
    await storage.remove('k');
    expect(secure.deleteItemAsync).toHaveBeenCalledWith('k');
  });
});
