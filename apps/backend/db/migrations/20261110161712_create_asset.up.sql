-- Migration: 20261110161712_create_asset
-- Created at: 2026-11-10T16:17:12.294Z

CREATE TABLE asset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES account (id),
  type TEXT NOT NULL CHECK (
    type IN (
      'cash',
      'property',
      'vehicle',
      'business_shares',
      'digital',
      'other'
    )
  ),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
  -- Institution or place, by name only. Never an account number (docs/standards/security.md).
  institution TEXT CHECK (char_length(institution) <= 200),
  rough_value NUMERIC(18, 2) CHECK (rough_value >= 0),
  notes TEXT CHECK (char_length(notes) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES account (id)
);

CREATE INDEX asset_owner_live_idx ON asset (owner_id)
WHERE
  deleted_at IS NULL;
