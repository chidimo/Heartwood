-- Migration: 20261110230000_add_asset_currency
-- Created at: 2026-11-10T23:00:00.000Z

ALTER TABLE asset
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'NGN' CHECK (char_length(currency) = 3);
