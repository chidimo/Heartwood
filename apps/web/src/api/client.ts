import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4300/api',
});

// Pull a message out of the backend's error payload; fall back for network failures,
// where the raw axios message ("Network Error") isn't useful to show a user.
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: string } | undefined)?.error;
    if (message) return message;
  }
  return fallback;
};
