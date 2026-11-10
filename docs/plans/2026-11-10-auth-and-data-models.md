# Authentication and data models

Created: 2026-11-10

Status: In progress

Owner: Chidi Orji <orjichidi95@gmail.com>

Roadmap link: [`docs/roadmap.md`](../roadmap.md) §1 items 1–5

Open questions: Q9 (what we store per asset), Q11 (how testators sign in), Q12 (executor/lawyer accounts), Q5 (customary/Islamic law). All built on their **working assumptions**, not answers: change the assumption and revisit this plan.

## Objective

A testator can register, sign in, and keep an inventory: assets, beneficiaries, how each asset is allocated, a residuary rule, contingencies and an executor. Every record is owner-scoped, soft-deleted and audited ([security.md](../standards/security.md)).

## How this document is used

Checklist. One item at a time; commit each. Tests are written with the code, not after.

## Decisions (working assumptions, to confirm)

- Sign-in is email and password (Q11). Passwords hashed with bcrypt; short-lived access JWT plus a rotating refresh token whose hash is stored. Login errors don't say which of email or password was wrong.
- Per asset we store type, description, institution, optional rough value, notes (Q9). No account numbers or IDs; the UI says so beside the free-text fields.
- Executor and lawyer are plain contact records on the testator's profile, not accounts (Q12).
- Allocation shares are validated in the service, not the database, because a sum across rows can't be a column constraint. Asset allocations must total exactly 100.00% or be a single specific bequest.
- Flagging assets that may fall under customary or religious law (Q5) is a later item; nothing blocks or auto-corrects.
- Cross-domain work (replace an asset's allocation, the report) lives in `modules/inventory`, which calls the asset, beneficiary and allocation services; those don't call each other for it, so there are no import cycles.

## Checklist

### Data models

- [x] Migrations: `account` and `refresh_token`
- [x] Migrations: `asset`
- [x] Migrations: `beneficiary` (with contingency, nullable so "not chosen" can be flagged), `allocation`, `residuary_allocation`, `executor`
- [x] Migration: `audit_log`. All eight tables applied, every `.down.sql` run in reverse and re-applied (verified 2026-11-10)
- [x] Regenerate Kysely types (`packages/database/src/db.types.ts`)

### Authentication (backend)

- [x] Register, login, refresh (rotating, reuse revokes the family), logout, `GET /api/auth/me`; auth middleware; rate limit on login and register (10 per 15 min per IP)
- [x] Tests: happy paths, wrong password and unknown email give the same error, duplicate email, expired/revoked/reused refresh, rate limit, hashes stored not secrets

### Inventory (backend)

- [x] Assets CRUD, owner-scoped, soft delete, audited. Free text refuses 10+ digit runs (account numbers)
- [x] Beneficiaries CRUD with contingency rules; delete refused while allocated or someone's fallback
- [x] Allocations (shares total exactly 100% or one specific bequest) + residuary + `GET /api/inventory/report`
- [x] Executor
- [x] Tests per resource: a second user gets 404 on read, update and delete. 55 backend tests pass (verified 2026-11-10)

### Clients

- [ ] Mobile: sign-in, asset list and add; verified in the iOS Simulator
- [ ] Web: sign-in, asset list and add
