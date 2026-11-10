-- Migration: 20261110173014_add_beneficiary_date_of_birth
-- Created at: 2026-11-10T17:30:14.392Z

-- Needed only to check an age condition on a gift. Optional, people only. It is third-party personal
-- data about someone who has not agreed to it: nothing but the review's age checks reads it.
ALTER TABLE beneficiary
  ADD COLUMN date_of_birth DATE,
  ADD CONSTRAINT beneficiary_dob_person_only CHECK (kind = 'person' OR date_of_birth IS NULL),
  ADD CONSTRAINT beneficiary_dob_plausible CHECK (date_of_birth >= DATE '1900-01-01');
