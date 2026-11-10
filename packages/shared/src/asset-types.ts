import { z } from 'zod';

// Matches the asset types in docs/exploration.md §7. Placeholder: the real model is
// planned in docs/plans/ and depends on open question Q9 (what we store per asset).
export const ASSET_TYPES = [
  'cash',
  'property',
  'vehicle',
  'business_shares',
  'digital',
  'other',
] as const;

export const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = 'NGN';
export const currencySchema = z.enum(CURRENCIES);

export const assetTypeSchema = z.enum(ASSET_TYPES);
export type AssetType = z.infer<typeof assetTypeSchema>;
