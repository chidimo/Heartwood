-- Migration: 20261110173014_add_beneficiary_date_of_birth
-- Created at: 2026-11-10T17:30:14.392Z

ALTER TABLE beneficiary
  DROP CONSTRAINT beneficiary_dob_plausible,
  DROP CONSTRAINT beneficiary_dob_person_only,
  DROP COLUMN date_of_birth;
