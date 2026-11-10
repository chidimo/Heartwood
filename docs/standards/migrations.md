# Migration Standard

> **Provenance:** copied from the Concord repo. Paths (`apps/backend/db/migrations/`,
> `run-migrations.ts`, `yarn backend:migrate`) are where these will live in Heartwood;
> the runner is not built yet — see [the roadmap](../roadmap.md). The rules apply from
> the first migration.

This document defines how SQL migrations in `apps/backend/db/migrations/` are
written and applied. It exists because the "up" runner used to wrap an
entire batch of pending migrations in one transaction — meaning a failure in
migration 3 of 5 silently rolled back migrations 1 and 2 as well, even
though they had already succeeded — see §1.

## 1. Rule: each migration file is its own atomic unit

Applying a set of pending migrations must have this behavior, and no other:

- Each `.up.sql` file either fully applies and commits, or fully rolls back
  and is not recorded as applied - never left half-applied.
- A migration that already committed in this run **stays committed** even
  if a later migration in the same run fails. Only the failing migration's
  own (partial) effects roll back.
- The run stops at the first failure. A migration after the failing one is
  never attempted - "1 succeeds, 2 fails" must never be followed by an
  attempt at 3.

This is enforced by wrapping each individual file's execution in its own
`BEGIN`/`COMMIT` (or `ROLLBACK` on error), with the `schema_migrations`
insert happening inside that same per-file transaction - see
`apps/backend/src/scripts/db-mutation/run-migrations.ts` (`yarn
backend:migrate`, the "up" path). The golang-migrate CLI (`yarn
backend:migrate:down`, currently only used for rolling back one migration)
already does this per-migration transaction wrapping by default for its
Postgres driver - nothing to change there, just worth knowing both tools
share the same guarantee.

**Do not** reintroduce a single transaction spanning multiple migration
files "for consistency" or "to make a release atomic as a whole" - that's a
different (and weaker) guarantee than per-migration atomicity, and it's
exactly the bug this document exists to prevent recurring.

## 2. Never add `BEGIN`/`COMMIT` inside a migration file

Atomicity is the **runner's** job (§1), not each file's - a migration file
should contain only the DDL/DML for that change, nothing that manages the
transaction itself. Adding explicit `BEGIN`/`COMMIT` lines to a `.up.sql`
doesn't reinforce §1's guarantee, it breaks it:

- A `COMMIT` inside the file ends the runner's wrapping transaction early.
  Anything after it in that same file - including the `schema_migrations`
  insert that marks it applied - now runs unprotected. If a later statement
  in that file then fails, there's nothing left to roll back to.
- A `BEGIN` inside the file is a silent no-op: Postgres doesn't support
  real nested transactions, so `BEGIN` while a transaction is already open
  just emits `WARNING: there is already a transaction in progress` and does
  nothing.

The same applies to the `yarn backend:migrate:down` path (golang-migrate),
which also wraps each migration in its own transaction by default - an
embedded `COMMIT` would prematurely end that one too.

**Exception**: a small number of Postgres statements cannot run inside a
transaction at all - most commonly `CREATE INDEX CONCURRENTLY`, and
`ALTER TYPE ... ADD VALUE` if the new value is used later in the same
transaction. No current migration needs either. If one ever does, it can't
just go in a normal `.up.sql` file under the runner as-is - fighting it
with `BEGIN`/`COMMIT` tricks inside the file doesn't work (§2 above).

The actual mechanism, not yet implemented since nothing needs it yet: add
a second header line to that file, `-- Requires: no-transaction`, right
after the existing `-- Migration: ...` / `-- Created at: ...` lines.
`run-migrations.ts` should check for that marker before running the file
and, if present, execute its statements directly against the client - no
`BEGIN`/`COMMIT` wrap - instead of the normal per-file transaction, then
insert the `schema_migrations` row as its own separate statement
afterward (a lone `INSERT` is atomic on its own, so it doesn't need the
wrapping transaction either). Build this when the first migration that
actually needs it is written, not speculatively ahead of time.

## 3. Migrations are immutable once applied anywhere shared

A migration's tracking is by **filename**, not by the content of the file
(`schema_migrations.filename` is the unique key - see
`run-migrations.ts`). That means editing an already-applied migration's SQL
in place does nothing on any database where it already ran; the runner sees
the filename already recorded and skips it, silently leaving that
database's schema out of sync with the file in version control.

- Once a migration has been applied on any environment other than your own
  local/throwaway database (a teammate's machine, staging, production), do
  **not** edit its `.up.sql`/`.down.sql` content - write a new migration
  instead, even to fix a typo.
- While a migration is still unmerged and has only ever been applied on
  your own database, editing it in place is fine - just remember every
  database it already touched needs the old version manually unwound
  (drop what it created, delete its `schema_migrations` row) before
  re-running with the new content. This isn't automatic.

## 4. Style

- One numbered pair per change: `<timestamp>_<description>.up.sql` and the
  matching `.down.sql`, `<timestamp>` in `YYYYMMDDHHMMSS` (UTC).
- SQL keywords uppercase (`CREATE TABLE`, `ALTER TABLE`, `NOT NULL`), matching
  every existing migration in this directory.
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` for a new entity table's
  surrogate key - not a serial/bigserial id. Join/junction tables use a
  composite `PRIMARY KEY (a_id, b_id)` instead (e.g. `account_role`), and a
  handful of tables key on a natural identifier instead of a surrogate one
  (e.g. `postcode_geocache.postcode`) - both are existing, deliberate
  exceptions, not something to avoid, just don't default to a bare
  `serial`/`bigserial` id for a new table without one of these reasons.
- A `.down.sql` must actually reverse the `.up.sql` (drop what it created,
  restore what it dropped) - not a no-op placeholder.
