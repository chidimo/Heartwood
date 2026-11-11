-- Migration: 20261111130000_add_asset_search_index
-- Created at: 2026-11-11T13:00:00.000Z

-- Trigram indexes for the asset search (docs/standards/interactions.md Rule 7). pg_trgm is installed by
-- the beneficiary migration. Only live assets are indexed, since a search never looks at deleted ones.
CREATE INDEX asset_description_trgm_idx ON asset USING gin (description gin_trgm_ops)
WHERE
  deleted_at IS NULL;

CREATE INDEX asset_institution_trgm_idx ON asset USING gin (institution gin_trgm_ops)
WHERE
  deleted_at IS NULL;
