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

const formatterFor = (currency: string) => {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    formatters.set(currency, formatter);
  }
  return formatter;
};

export const formatValue = (value: number | null, currency: string = 'NGN'): string =>
  value === null ? 'Value not set' : formatterFor(currency).format(value);

export const CURRENCY_LABELS: Record<Currency, string> = {
  NGN: 'Naira (₦)',
  USD: 'US dollar ($)',
  GBP: 'Pound (£)',
  EUR: 'Euro (€)',
};
