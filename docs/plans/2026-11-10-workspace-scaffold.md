# Workspace scaffold

Created: 2026-11-10

Status: In progress — workspace builds, typechecks and passes its one test. Test database, CI and the security standard are still open (roadmap §0 items 3 and 4).

Owner: Chidi Orji <orjichidi95@gmail.com>

Roadmap link: [`docs/roadmap.md`](../roadmap.md) §0

Open questions: none (Q0 answers the stack)

## Objective

A monorepo with the same shape and stack as Concord, running end to end with no product features yet.

## What exists (verified 2026-11-10)

- `packages/database`: Kysely client (`getDb`, `DbClient`, `DbTransaction`); `db.types.ts` is an empty placeholder until the first migration, then `yarn db:codegen` overwrites it.
- `packages/shared`: Zod; one placeholder (`ASSET_TYPES`, from exploration §7).
- `apps/backend`: Express 5, `createApp({ db })`, `GET /api/health` (liveness) and `/api/health/db` (readiness), error handler, request logging, response helpers, migration runner and `db:migration:create` (copied from Concord, per [migrations standard](../standards/migrations.md)). One Jest test.
- `apps/web`: React 19, Vite, Tailwind 4, TanStack Router and Query, Sonner; home page shows API status.
- Root: Nx project files, `docker-compose.yml` (local Postgres), `jest.config.js`, `.env.example`.

## Differences from Concord (deliberate)

- Dropped for now: Sentry, LogRocket, pg-boss, auth, RBAC, Swagger/OpenAPI, Resonance (Python), seed scripts. Add each with its own plan when needed.
- Nx runs plain `tsc`/`vite` via `nx:run-commands` rather than the `@nx/node` and `@nx/vite` executors, which kept the scaffold simpler.
- Web uses `@tailwindcss/vite` instead of the PostCSS plugin, and a Vite alias for `@heartwood/shared` instead of `nxViteTsPaths`.

## Remaining

- [ ] Test database: `docker-compose.test.yml`, Jest global setup and reset helper (port from Concord) once there is a migration to test.
- [ ] CI workflow (port Concord's `test-backend.yml`).
- [ ] Security and data-minimisation standard, before the first asset model (Q9).
- [ ] Run `yarn dev` against a real local Postgres (`docker compose up -d`) and check the web page shows API status "ok". Only the backend liveness endpoint and builds were exercised.
