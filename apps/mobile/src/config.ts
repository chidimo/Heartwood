import { Platform } from 'react-native';
import Constants from 'expo-constants';

const LOCAL = /\/\/(localhost|127\.0\.0\.1)/;

// "http://localhost:4300" -> the machine Metro runs on (physical phone) or 10.0.2.2 (Android emulator).
export const resolveApiUrl = (raw: string, os: string, hostUri?: string | null): string => {
  const url = raw.replace(/\/$/, '');
  if (!LOCAL.test(url) || os === 'web') return url;
  const host = hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') return url.replace(LOCAL, `//${host}`);
  return os === 'android' ? url.replace(LOCAL, '//10.0.2.2') : url;
};

// Backend base URL (see .env.example). Public: never put a secret in an EXPO_PUBLIC_* value.
export const API_URL = resolveApiUrl(
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4300',
  Platform.OS,
  Constants.expoConfig?.hostUri
);
export const API_BASE = `${API_URL}/api`;
