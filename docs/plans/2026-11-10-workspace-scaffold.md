# Workspace scaffold

Created: 2026-11-10

Status: In progress — workspace, test database, CI and security standard built. Only the full `yarn dev` check against a local Postgres remains.

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

- [x] Test database: `docker-compose.test.yml`, `scripts/test-backend.sh`, Jest global setup, catalog-driven `resetTestDb`. Migration runner (3 tests, incl. the per-file atomicity rule) and `/api/health/db` (2 tests) now run against real Postgres. Verified 2026-11-10: 6 tests pass.
- [x] CI workflow `.github/workflows/ci.yml`: PRs into `main` only; format check, package build, typecheck, web lint, backend tests with coverage, web build. Each step run locally; the workflow itself has not run on GitHub yet.
- [x] Security and data-minimisation standard: `docs/standards/security.md`.
- [ ] Run `yarn dev` against a real local Postgres (`docker compose up -d`) and check the web page shows API status "ok". Only the backend liveness endpoint and builds were exercised.
