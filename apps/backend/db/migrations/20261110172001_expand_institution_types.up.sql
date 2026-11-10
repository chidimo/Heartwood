-- Migration: 20261110172001_expand_institution_types
-- Created at: 2026-11-10T17:20:01.436Z

-- The kinds of organisation a testator can leave a gift to. Closed on purpose: adding one is a
-- shared constant, a label in the apps and a migration like this one.
ALTER TABLE beneficiary
  DROP CONSTRAINT beneficiary_institution_type_check,
  ADD CONSTRAINT beneficiary_institution_type_check CHECK (
    institution_type IN (
      'church',
      'mosque',
      'place_of_worship',
      'mission',
      'charity',
      'foundation',
      'orphanage',
      'school',
      'university',
      'hospital',
      'community',
      'association',
      'cooperative',
      'other'
    )
  );
