-- Migration: 20261111130000_add_asset_search_index
-- Created at: 2026-11-11T13:00:00.000Z

DROP INDEX asset_institution_trgm_idx;

DROP INDEX asset_description_trgm_idx;
