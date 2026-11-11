-- Migration: 20261110161710_create_account_and_refresh_token
-- Created at: 2026-11-10T16:17:10.392Z

CREATE TABLE account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  -- Where the testator lives, for the opening line of the draft will. Free text; optional.
  address TEXT CHECK (char_length(address) <= 500),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- One live account per email, compared case-insensitively.
CREATE UNIQUE INDEX account_email_live_uniq ON account (lower(email))
WHERE
  deleted_at IS NULL;

CREATE TABLE refresh_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES account (id),
  -- Only the hash is stored; the token itself is shown to the client once.
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX refresh_token_account_idx ON refresh_token (account_id);
