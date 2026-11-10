-- Migration: 20261110171126_add_beneficiary_kind
-- Created at: 2026-11-10T17:11:26.477Z

ALTER TABLE beneficiary
  DROP CONSTRAINT beneficiary_institution_plan,
  DROP CONSTRAINT beneficiary_kind_fields;

-- Keep organisations as beneficiaries rather than deleting them: give them a placeholder relationship.
UPDATE beneficiary
SET
  relationship = 'Organisation'
WHERE
  relationship IS NULL;

ALTER TABLE beneficiary
  ALTER COLUMN relationship SET NOT NULL,
  DROP COLUMN institution_type,
  DROP COLUMN kind;
