import { useEffect, useState } from 'react';

/** The value after it has stopped changing for `delayMs`: keeps a search box from firing on every key. */
export const useDebouncedValue = <T>(value: T, delayMs = 300): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};
