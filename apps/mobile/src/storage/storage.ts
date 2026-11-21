import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

type Options = {
  /**
   * Gate this item behind the phone's fingerprint / face / passcode; the string is the prompt's reason.
   * The web build has no such gate, so protected items are never stored there (reads give null).
   */
  authenticate?: string;
};

const secureOptions = ({ authenticate }: Options) => ({
  requireAuthentication: true,
  authenticationPrompt: authenticate,
});

/**
 * Where the app keeps anything that must survive a restart. Import this, never `expo-secure-store`
 * or AsyncStorage directly: the keychain / keystore on phones, `localStorage` on the web build
 * (local development only).
 *
 *   await storage.set('heartwood.accessToken', token);
 *   const draft = await storage.getJson<Draft>('heartwood.draft');
 */
export const storage = {
  async get(key: string, options: Options = {}): Promise<string | null> {
    if (isWeb) return options.authenticate ? null : (globalThis.localStorage?.getItem(key) ?? null);
    if (options.authenticate) return SecureStore.getItemAsync(key, secureOptions(options));
    return SecureStore.getItemAsync(key);
  },

  async set(key: string, value: string, options: Options = {}): Promise<void> {
    if (isWeb) {
      if (!options.authenticate) globalThis.localStorage?.setItem(key, value);
      return;
    }
    if (options.authenticate) await SecureStore.setItemAsync(key, value, secureOptions(options));
    else await SecureStore.setItemAsync(key, value);
  },

  async remove(key: string): Promise<void> {
    if (isWeb) globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },

  /** A stored JSON value, or null when it's missing, unreadable, or the read was cancelled. */
  async getJson<T>(key: string, options: Options = {}): Promise<T | null> {
    try {
      const raw = await storage.get(key, options);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  setJson: (key: string, value: unknown, options: Options = {}): Promise<void> =>
    storage.set(key, JSON.stringify(value), options),
};
