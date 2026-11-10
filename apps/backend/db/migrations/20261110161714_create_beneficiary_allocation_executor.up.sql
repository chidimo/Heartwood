-- Migration: 20261110161714_create_beneficiary_allocation_executor
-- Created at: 2026-11-10T16:17:14.143Z

-- Who receives things: a person or an organisation (church, mosque, charity, school...). An
-- organisation has a type and no relationship, date of birth or children to pass a gift to.
CREATE TABLE beneficiary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES account (id),
  kind TEXT NOT NULL DEFAULT 'person' CHECK (kind IN ('person', 'institution')),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  -- How a person is related to the testator: a fixed list, so it can be relied on. NULL for an
  -- organisation. "other" needs the words in relationship_other.
  relationship TEXT CHECK (
    relationship IN (
      'wife',
      'husband',
      'son',
      'daughter',
      'stepchild',
      'father',
      'mother',
      'brother',
      'sister',
      'grandchild',
      'grandparent',
      'uncle',
      'aunt',
      'nephew',
      'niece',
      'cousin',
      'in_law',
      'friend',
      'other'
    )
  ),
  -- Only when relationship is "other": what the relationship is, in the testator's words.
  relationship_other TEXT CHECK (char_length(relationship_other) BETWEEN 1 AND 100),
  -- The kind of organisation. A closed list: adding one means the shared constant, a label in the
  -- apps and a migration that widens this check. NULL for a person.
  institution_type TEXT CHECK (
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
  ),
  contact TEXT CHECK (char_length(contact) <= 200),
  -- Where to reach them (a person's home, an organisation's office). Free text. It is third-party
  -- personal data: see docs/standards/security.md.
  address TEXT CHECK (char_length(address) <= 500),
  -- Only used to check an age condition on a gift. People only. Nothing but the review reads it.
  date_of_birth DATE CHECK (date_of_birth >= DATE '1900-01-01'),
  -- What happens if this beneficiary dies (or an organisation ceases to exist) before the
  -- testator. NULL = not chosen yet (flagged in the review).
  contingency_plan TEXT CHECK (
    contingency_plan IN (
      'redistribute',
      'pass_to_descendants',
      'named_beneficiary'
    )
  ),
  contingency_beneficiary_id UUID REFERENCES beneficiary (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES account (id),
  CHECK (
    (coalesce(contingency_plan, '') = 'named_beneficiary') = (contingency_beneficiary_id IS NOT NULL)
  ),
  CHECK (contingency_beneficiary_id IS DISTINCT FROM id),
  CONSTRAINT beneficiary_relationship_other CHECK (
    (coalesce(relationship, '') = 'other') = (relationship_other IS NOT NULL)
  ),
  CONSTRAINT beneficiary_kind_fields CHECK (
    (
      kind = 'person'
      AND institution_type IS NULL
      AND relationship IS NOT NULL
    )
    OR (
      kind = 'institution'
      AND institution_type IS NOT NULL
      AND relationship IS NULL
      AND date_of_birth IS NULL
    )
  ),
  CONSTRAINT beneficiary_institution_plan CHECK (
    kind = 'person'
    OR coalesce(contingency_plan, '') <> 'pass_to_descendants'
  )
);

CREATE INDEX beneficiary_owner_live_idx ON beneficiary (owner_id)
WHERE
  deleted_at IS NULL;

-- Contact record only, not an account (open question Q12). Created before allocation because a
-- gift's condition names one as the holder.
CREATE TABLE executor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES account (id),
  kind TEXT NOT NULL CHECK (kind IN ('executor', 'lawyer')),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  contact TEXT CHECK (char_length(contact) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES account (id)
);

CREATE INDEX executor_owner_live_idx ON executor (owner_id)
WHERE
  deleted_at IS NULL;

-- How one asset is split. Exactly one of share_percent / specific_bequest is set.
-- That an asset's shares total 100% is a cross-row rule, enforced in the service.
--
-- A gift may carry a condition. Either all of it is set or none of it is:
--   * a kind: a minimum age, marriage, finishing education, National Youth Service (NYSC), outliving
--     the testator by some days, or free text for the lawyer to word
--   * what happens if it is never met (shared among the others, a named person, or the residuary)
--   * who holds the asset until it is met (an executor or lawyer contact)
-- condition_text is the wording for 'other' and an optional note on every other kind (for example
-- which course or institution).
CREATE TABLE allocation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES account (id),
  asset_id UUID NOT NULL REFERENCES asset (id),
  beneficiary_id UUID NOT NULL REFERENCES beneficiary (id),
  share_percent NUMERIC(5, 2) CHECK (
    share_percent > 0
    AND share_percent <= 100
  ),
  specific_bequest TEXT CHECK (char_length(specific_bequest) BETWEEN 1 AND 500),
  condition_kind TEXT CHECK (
    condition_kind IN (
      'min_age',
      'marriage',
      'education',
      'nysc',
      'survives',
      'other'
    )
  ),
  condition_min_age SMALLINT CHECK (condition_min_age BETWEEN 1 AND 100),
  condition_days SMALLINT CHECK (condition_days BETWEEN 1 AND 365),
  condition_text TEXT CHECK (char_length(condition_text) BETWEEN 1 AND 500),
  condition_if_unmet TEXT CHECK (
    condition_if_unmet IN ('redistribute', 'named_beneficiary', 'residuary')
  ),
  condition_fallback_id UUID REFERENCES beneficiary (id),
  condition_holder_id UUID REFERENCES executor (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES account (id),
  CHECK ((share_percent IS NOT NULL) <> (specific_bequest IS NOT NULL)),
  CONSTRAINT allocation_condition_fields CHECK (
    (
      condition_kind IS NULL
      AND condition_min_age IS NULL
      AND condition_days IS NULL
      AND condition_text IS NULL
      AND condition_if_unmet IS NULL
      AND condition_fallback_id IS NULL
      AND condition_holder_id IS NULL
    )
    OR (
      condition_kind IS NOT NULL
      AND condition_if_unmet IS NOT NULL
      AND condition_holder_id IS NOT NULL
      AND (condition_kind = 'min_age') = (condition_min_age IS NOT NULL)
      AND (condition_kind = 'survives') = (condition_days IS NOT NULL)
      AND (condition_kind <> 'other' OR condition_text IS NOT NULL)
      AND ((condition_if_unmet = 'named_beneficiary') = (condition_fallback_id IS NOT NULL))
    )
  )
);

CREATE UNIQUE INDEX allocation_asset_beneficiary_live_uniq ON allocation (asset_id, beneficiary_id)
WHERE
  deleted_at IS NULL;

CREATE INDEX allocation_owner_live_idx ON allocation (owner_id)
WHERE
  deleted_at IS NULL;

-- Who gets anything not listed or left over. Shares total 100% (service-enforced).
CREATE TABLE residuary_allocation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES account (id),
  beneficiary_id UUID NOT NULL REFERENCES beneficiary (id),
  share_percent NUMERIC(5, 2) NOT NULL CHECK (
    share_percent > 0
    AND share_percent <= 100
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES account (id)
);

CREATE UNIQUE INDEX residuary_owner_beneficiary_live_uniq ON residuary_allocation (owner_id, beneficiary_id)
WHERE
  deleted_at IS NULL;
