# Authentication and data models

Created: 2026-11-10

Status: In progress — backend and mobile built and verified; web client and executor screens still to do

Owner: Chidi Orji <orjichidi95@gmail.com>

Roadmap link: [`docs/roadmap.md`](../roadmap.md) §1 items 1–5

Open questions: Q17 (gifts to organisations), Q9 (what we store per asset), Q11 (how testators sign in), Q12 (executor/lawyer accounts), Q5 (customary/Islamic law). All built on their **working assumptions**, not answers: change the assumption and revisit this plan.

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

### Institutional beneficiaries (churches, charities, schools...)

A beneficiary is a person or an organisation. An organisation has a type (church, mosque, charity, school, other), no relationship to the testator, and no "pass it to their children" option.

- [x] Organisation fields in the beneficiary table (DB checks keep person and organisation fields consistent and forbid the children plan for organisations)
- [x] Shared schema, service guards (kind never changes), report wording ("if this organisation no longer exists"); 13 backend tests including direct-insert constraint checks. 70 backend tests pass (verified 2026-11-10)
- [x] Mobile: person/organisation toggle, type dropdown, contingency options that fit the kind, subtitles in lists and share editors; 75 mobile tests pass. Verified in the iOS Simulator: added "Grace Chapel" as a church, the "children" option is absent, the list shows its type
- [x] 14 organisation types (church, mosque, other place of worship, religious mission or order, charity, foundation or trust, orphanage, school, university or college, hospital or clinic, community or town union, association or club, cooperative society, other). The list is closed on purpose: to add one, add it to `INSTITUTION_TYPES` in `packages/shared/src/inventory.ts`, give it a label in `apps/mobile/src/features/inventory/labels.ts` (a test fails until you do), and write a migration that widens `beneficiary_institution_type_check` (edit the CREATE TABLE while nothing is deployed)
- [x] Optional address on a beneficiary (person or organisation): free text up to 500 characters in the beneficiary table, API, mobile form field; 89 backend and 77 mobile tests pass (verified 2026-11-10; layout checked in the simulator)
- [ ] Registration number and wording rules for gifts to organisations: waiting on Q17

### Migrations consolidated (2026-11-10)

Nothing is deployed, so the `ALTER TABLE` migrations were folded back into the migrations that create their tables: four remain (`create_account_and_refresh_token`, `create_asset`, `create_beneficiary_allocation_executor`, `create_audit_log`) and none contains `ALTER TABLE`. The rebuilt schema was diffed against the old one and matched, apart from two constraints merged into one. `executor` is now created before `allocation`, because a gift's condition references it. From the first deployment on, migrations are immutable again ([migrations standard](../standards/migrations.md) Rule 3).

### Relationship

- [x] A person's relationship is a fixed list of 19 values (wife, husband, son, daughter, stepchild, father, mother, brother, sister, grandchild, grandparent, uncle, aunt, nephew, niece, cousin, in-law, friend, other) in the database, shared schema and the app's dropdown. "Other" requires `relationship_other` (the testator's own words), and only "other" may have it: enforced by the service and by a database check (verified with direct-insert tests, 2026-11-10)

### Conditional gifts (see [the plan](2026-11-10-conditional-gifts.md))

- [x] v1 scope, as agreed: a minimum age or free text, each with a holder (an executor or lawyer) and an "if unmet" plan (share among the others, a named person, or the residuary). A condition lives on one gift (per gift, not per person), on shares and on specific bequests. Not on residuary shares yet
- [x] Optional date of birth on a person, chosen with a native date picker (`DateField`: spinner sheet on iOS, system dialog on Android, typed fallback on web) and shown with the computed age; used only for age checks. Verified in the iOS Simulator 2026-11-10; the Android dialog is covered by tests only
- [x] Review warns when an age condition can't be checked (no date of birth) and when someone under 18 would receive a gift outright
- [x] Executor and lawyer screens (list, add, edit, remove), reached from the Review tab; one holding a gift can't be removed
- [x] Mobile condition editor under the share editor. 163 backend and 121 mobile tests; verified in the iOS Simulator 2026-11-10 (edit a saved condition, add one with live validation, save: two conditional gifts in the database, new review warnings)

### Dev seed

- [x] `apps/backend/src/scripts/seed/`: JSON data plus a runner that goes through the services; `yarn db:seed` (idempotent) and `yarn db:reset` (wipe, migrate, seed). Both refuse non-local databases and production. 102 backend tests pass including seed tests (verified 2026-11-10: `db:reset` run on a throwaway database gave identical counts twice)

### Clients

Mobile inventory screens (branch `feature/mobile-inventory`, verified in the iOS Simulator 2026-11-10): tabs Assets / People / Review; asset detail with the allocation editor (split by percent or give to one person, running total, split evenly); beneficiary add, edit and remove with contingency (the fallback dropdown appears for "someone I name"); residuary editor; review report with a verdict, issues grouped by severity naming what each is about, and each issue opening its asset or person.

- [x] Mobile: register, sign-in, sign-out, asset list and add (type is a `Select` dropdown). Verified in the iOS Simulator against a real backend and database on 2026-11-10: register 201, login 200, asset create 201 with its audit row, the account-number guard shows a toast, a stale session returns to sign-in (401 on `/me` then on refresh), the dark header and inline password validation render. 34 mobile tests pass. Not covered: sign-out, token refresh on a live expiry, Android.
- [ ] Web: sign-in, asset list and add
