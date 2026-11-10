-- Migration: 20261110171126_add_beneficiary_kind
-- Created at: 2026-11-10T17:11:26.477Z

-- A beneficiary is a person or an organisation (church, mosque, charity, school, other). An
-- organisation has no relationship to the testator and no children to pass a gift to.
ALTER TABLE beneficiary
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'person' CHECK (kind IN ('person', 'institution')),
  ADD COLUMN institution_type TEXT CHECK (
    institution_type IN ('church', 'mosque', 'charity', 'school', 'other')
  ),
  ALTER COLUMN relationship DROP NOT NULL;

ALTER TABLE beneficiary
  ADD CONSTRAINT beneficiary_kind_fields CHECK (
    (kind = 'person' AND institution_type IS NULL AND relationship IS NOT NULL)
    OR (kind = 'institution' AND institution_type IS NOT NULL AND relationship IS NULL)
  ),
  ADD CONSTRAINT beneficiary_institution_plan CHECK (
    kind = 'person'
    OR coalesce(contingency_plan, '') <> 'pass_to_descendants'
  );
