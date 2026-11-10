---
name: new-migration
description: Scaffold and write a new database migration under apps/backend/db/migrations/, following this repo's atomicity and immutability rules.
---

# New migration

> Copied from Concord. The runner, `yarn db:migration:create` and `yarn db:codegen` don't exist in Heartwood yet (see `docs/roadmap.md` §0); this skill applies once they're ported.

## Scaffold the files

```bash
yarn db:migration:create "<short_description>"
```

Creates `<timestamp>_<short_description>.up.sql` and the matching `.down.sql` in `apps/backend/db/migrations/`, each with a `-- Migration: ...` / `-- Created at: ...` header already filled in. Fill in the SQL under that header — don't hand-name the files.

## Rules (if `docs/standards/migrations.md` exists, read it — it's the authoritative version of these)

- **One migration = one atomic unit.** The runner wraps each `.up.sql` file in its own transaction, and records it in `schema_migrations` inside that same transaction. If a batch has several pending migrations and one fails, the ones before it stay committed and the ones after it are never attempted — so keep each file focused on one logical change, not several unrelated ones bundled together.
- **Never write your own `BEGIN`/`COMMIT`/`ROLLBACK` inside a migration file.** The runner already wraps the file in a transaction. An embedded `BEGIN` while one is already open is a silent Postgres no-op; an embedded `COMMIT` ends the wrapping transaction early, so anything after it in that file is no longer protected by it. Just write plain DDL/DML statements.
- **Exception**: `CREATE INDEX CONCURRENTLY` and a same-transaction `ALTER TYPE ... ADD VALUE` genuinely cannot run inside a transaction at all in Postgres. No current migration needs this, and the runner doesn't yet implement the special-casing below — don't reach for embedded `BEGIN`/`COMMIT` as a workaround, that doesn't fix it. When one is actually needed: add a second header line to that file, `-- Requires: no-transaction`, right after the existing `-- Migration: ...` / `-- Created at: ...` lines. The runner should check for that marker before running the file and, if present, execute its statements directly (no `BEGIN`/`COMMIT` wrap) instead of the normal per-file transaction, then record the `schema_migrations` row as its own separate statement afterward — a lone `INSERT` is atomic on its own, so it doesn't need the wrapping transaction either. This needs implementing in `run-migrations.ts` before the first migration that needs it.
- **Migrations are immutable once applied anywhere shared** (merged to `main`, or run against a shared/staging DB). `schema_migrations.filename` is the tracking key — not a content hash — so editing an already-applied file's SQL silently does nothing on a DB where it already ran. If you need to change something after that point, write a new migration instead of editing the old one. Editing a migration that has only ever run on your own throwaway local DB is fine.
- **Always write a real `.down.sql`** that reverses the `.up.sql` exactly (drop what was added, in reverse dependency order — e.g. drop a `CHECK` constraint before dropping the column it references).

## After writing it

1. Run `yarn db:migrate` locally to confirm it applies cleanly (needs `DATABASE_URL` set, e.g. via `apps/backend/.env` or a test DB).
2. Regenerate Kysely types: `yarn db:codegen` — this excludes pg-boss's own runtime-created `pgboss.*` schema automatically, so it's safe to run against a DB pg-boss has touched.
3. If you need to try it against a disposable DB instead of your real dev one, bring up `docker-compose.test.yml` and point `DATABASE_URL` at it.
