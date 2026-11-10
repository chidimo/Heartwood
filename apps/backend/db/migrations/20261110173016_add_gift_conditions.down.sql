-- Migration: 20261110173016_add_gift_conditions
-- Created at: 2026-11-10T17:30:16.284Z

ALTER TABLE allocation
  DROP CONSTRAINT allocation_condition_fields,
  DROP COLUMN condition_holder_id,
  DROP COLUMN condition_fallback_id,
  DROP COLUMN condition_if_unmet,
  DROP COLUMN condition_text,
  DROP COLUMN condition_min_age,
  DROP COLUMN condition_kind;
