import type { AssetType } from '../asset-types';

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cash: 'Cash and bank',
  property: 'Property',
  vehicle: 'Vehicle',
  business_shares: 'Business or shares',
  digital: 'Digital',
  other: 'Other',
};

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export const formatValue = (value: number | null): string =>
  value === null ? 'Value not set' : naira.format(value);
