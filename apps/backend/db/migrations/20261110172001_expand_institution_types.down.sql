-- Migration: 20261110172001_expand_institution_types
-- Created at: 2026-11-10T17:20:01.436Z

-- Keep organisations as beneficiaries rather than deleting them: types the old list lacks become "other".
UPDATE beneficiary
SET
  institution_type = 'other'
WHERE
  institution_type NOT IN ('church', 'mosque', 'charity', 'school', 'other');

ALTER TABLE beneficiary
  DROP CONSTRAINT beneficiary_institution_type_check,
  ADD CONSTRAINT beneficiary_institution_type_check CHECK (
    institution_type IN ('church', 'mosque', 'charity', 'school', 'other')
  );
