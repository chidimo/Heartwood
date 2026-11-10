-- Migration: 20261110173016_add_gift_conditions
-- Created at: 2026-11-10T17:30:16.284Z

-- A condition on one gift (an allocation row). Either all of it is set or none of it is:
--   * a kind: a minimum age, or free text for the lawyer to word
--   * what happens if it is never met (shared among the others, a named person, or the residuary)
--   * who holds the asset until it is met (an executor or lawyer contact)
ALTER TABLE allocation
  ADD COLUMN condition_kind TEXT CHECK (condition_kind IN ('min_age', 'other')),
  ADD COLUMN condition_min_age SMALLINT CHECK (condition_min_age BETWEEN 1 AND 100),
  ADD COLUMN condition_text TEXT CHECK (char_length(condition_text) BETWEEN 1 AND 500),
  ADD COLUMN condition_if_unmet TEXT CHECK (
    condition_if_unmet IN ('redistribute', 'named_beneficiary', 'residuary')
  ),
  ADD COLUMN condition_fallback_id UUID REFERENCES beneficiary (id),
  ADD COLUMN condition_holder_id UUID REFERENCES executor (id);

ALTER TABLE allocation
  ADD CONSTRAINT allocation_condition_fields CHECK (
    (
      condition_kind IS NULL
      AND condition_min_age IS NULL
      AND condition_text IS NULL
      AND condition_if_unmet IS NULL
      AND condition_fallback_id IS NULL
      AND condition_holder_id IS NULL
    )
    OR (
      condition_kind IS NOT NULL
      AND condition_if_unmet IS NOT NULL
      AND condition_holder_id IS NOT NULL
      AND (
        (condition_kind = 'min_age' AND condition_min_age IS NOT NULL AND condition_text IS NULL)
        OR (condition_kind = 'other' AND condition_text IS NOT NULL AND condition_min_age IS NULL)
      )
      AND ((condition_if_unmet = 'named_beneficiary') = (condition_fallback_id IS NOT NULL))
    )
  );
