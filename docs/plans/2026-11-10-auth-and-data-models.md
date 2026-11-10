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

## Checklist

### Data models
- [ ] Migrations: `account` and `refresh_token`
- [ ] Migrations: `asset`
- [ ] Migrations: `beneficiary` (with contingency), `allocation`, `residuary_allocation`, `executor`
- [ ] Migration: `audit_log`
- [ ] Regenerate Kysely types (`yarn db:codegen`)

### Authentication (backend)
- [ ] Register, login, refresh (rotating), logout, `GET /me`; auth middleware; login rate limit
- [ ] Tests: happy paths, wrong password, duplicate email, expired/revoked refresh, rate limit

### Inventory (backend)
- [ ] Assets CRUD, owner-scoped, soft delete, audited
- [ ] Beneficiaries CRUD with contingency rules
- [ ] Allocations + residuary + validation report (sums, uncovered assets, beneficiaries without contingency)
- [ ] Executor
- [ ] Tests per resource: a second user cannot read or change the first user's record

### Clients
- [ ] Mobile: sign-in, asset list and add; verified in the iOS Simulator
- [ ] Web: sign-in, asset list and add
