-- Migration: 20261110161714_create_beneficiary_allocation_executor
-- Created at: 2026-11-10T16:17:14.143Z

CREATE TABLE beneficiary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES account (id),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  relationship TEXT NOT NULL CHECK (char_length(relationship) BETWEEN 1 AND 100),
  contact TEXT CHECK (char_length(contact) <= 200),
  -- What happens if this beneficiary dies before the testator. NULL = not chosen yet (flagged).
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
  CHECK (contingency_beneficiary_id IS DISTINCT FROM id)
);

CREATE INDEX beneficiary_owner_live_idx ON beneficiary (owner_id)
WHERE
  deleted_at IS NULL;

-- How one asset is split. Exactly one of share_percent / specific_bequest is set.
-- That an asset's shares total 100% is a cross-row rule, enforced in the service.
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES account (id),
  CHECK ((share_percent IS NOT NULL) <> (specific_bequest IS NOT NULL))
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

-- Contact record only, not an account (open question Q12).
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
