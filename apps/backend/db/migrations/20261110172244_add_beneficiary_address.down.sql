-- Migration: 20261110172244_add_beneficiary_address
-- Created at: 2026-11-10T17:22:44.336Z

ALTER TABLE beneficiary
  DROP COLUMN address;
