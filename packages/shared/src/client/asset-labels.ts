import type { AssetType, Currency } from '../asset-types';

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cash: 'Cash and bank',
  property: 'Property',
  vehicle: 'Vehicle',
  business_shares: 'Business or shares',
  digital: 'Digital',
  other: 'Other',
};

const formatters = new Map<string, Intl.NumberFormat>();

// Whole amounts show no decimals; anything with cents always shows both digits.
const formatterFor = (currency: string, whole: boolean) => {
  const key = `${currency}:${whole}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    });
    formatters.set(key, formatter);
  }
  return formatter;
};

export const formatValue = (value: number | null, currency: string = 'NGN'): string =>
  value === null ? 'Value not set' : formatterFor(currency, Number.isInteger(value)).format(value);

export const CURRENCY_LABELS: Record<Currency, string> = {
  NGN: 'Naira (₦)',
  USD: 'US dollar ($)',
  GBP: 'Pound (£)',
  EUR: 'Euro (€)',
};
