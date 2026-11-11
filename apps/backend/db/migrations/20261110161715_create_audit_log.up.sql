-- Migration: 20261110161715_create_audit_log
-- Created at: 2026-11-10T16:17:15.993Z

-- Who changed what and when. snapshot is the row after the change (a record of what the
-- will said at that time); this table lives in the database and is never written to logs.
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES account (id),
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_entity_idx ON audit_log (entity, entity_id, created_at);

CREATE INDEX audit_log_actor_idx ON audit_log (actor_id, created_at);
