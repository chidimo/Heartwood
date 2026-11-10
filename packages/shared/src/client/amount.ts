const group = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Live formatting while typing: digits, one point, at most 2 decimals, thousands commas. "1250.5" → "1,250.5". */
export const cleanAmountInput = (text: string): string => {
  const [whole = '', ...rest] = text.replace(/[^\d.]/g, '').split('.');
  const digits = whole.replace(/^0+(?=\d)/, '');
  if (rest.length === 0) return group(digits);
  return `${group(digits || '0')}.${rest.join('').slice(0, 2)}`;
};

/** Settled formatting on blur: always 2 decimals. "1,250.5" → "1,250.50"; empty stays empty. */
export const padAmountInput = (text: string): string => {
  const cleaned = cleanAmountInput(text);
  if (!cleaned) return '';
  const [whole = '0', decimals = ''] = cleaned.split('.');
  return `${whole || '0'}.${decimals.padEnd(2, '0')}`;
};

export const amountToInput = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : padAmountInput(value.toFixed(2));

/** The number behind the text, or null when empty. */
export const parseAmount = (text: string): number | null => {
  const cleaned = text.replace(/,/g, '').trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
};
