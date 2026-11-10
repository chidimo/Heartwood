-- Migration: 20261110172244_add_beneficiary_address
-- Created at: 2026-11-10T17:22:44.336Z

-- Where to reach a beneficiary (a person's home, an organisation's office). Optional free text; an
-- executor uses it to find them. It is third-party personal data: see docs/standards/security.md.
ALTER TABLE beneficiary
  ADD COLUMN address TEXT CHECK (char_length(address) <= 500);
