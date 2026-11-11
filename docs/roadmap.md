# Heartwood Roadmap

An app that helps ordinary people in Nigeria list what they own, say who should get it, and reach a valid,
lawyer-reviewed will. Background and reasoning: [exploration.md](exploration.md).

The app is not what makes a transfer legal. A valid will is. Everything here serves getting a person to one,
backed by a clear inventory. We never hold assets.

How this file is used: **Priority queue** is what to pick up next, in order. **All plans** is one row per doc
in `docs/plans/`, with status taken from that doc's own checkboxes (see [standards/plans.md](standards/plans.md)).
**Open questions** live in [open-questions.md](open-questions.md); items below name the ones that block them.

Status key: ✅ done · 🟡 in progress · ⬜ not started

## Priority queue

### 0. Foundation (in progress)

1. ✅ Repo skeleton: `docs/` with roadmap, plans, standards and open questions; root config copied from Concord.
2. ✅ Workspace stood up: `apps/backend`, `apps/web`, `packages/database`, `packages/shared`, mirroring Concord's
   layout. See [plans/2026-11-10-workspace-scaffold.md](plans/2026-11-10-workspace-scaffold.md).
3. ✅ Test database and CI: `docker-compose.test.yml`, Jest global setup, and `.github/workflows/ci.yml` (runs on PRs into `main` only).
4. ✅ [Security and data-minimisation standard](standards/security.md), written before the first asset model (Q9).
5. ✅ Mobile app started: `apps/mobile` (Expo) scaffold and [mobile standard](standards/mobile.md). See [plans/2026-11-10-mobile-app-scaffold.md](plans/2026-11-10-mobile-app-scaffold.md). Q14 answered: we build web and mobile.
6. ⬜ Mobile release setup: store accounts, bundle ID, EAS project (Q16).

### 1. MVP: inventory to draft will (no partnerships needed)

Scope from [exploration.md](exploration.md) §6. Needs a plan doc per item before building.

1. ⬜ Auth and user (testator). Blocked on Q11.
2. ⬜ Asset inventory: add any asset, categorised. Blocked on Q9.
3. ⬜ Beneficiaries, including contingency (what if the beneficiary dies first).
4. ⬜ Allocation of each asset among beneficiaries, with the validation rules below.
5. ⬜ Residuary clause for anything unlisted or left over.
6. 🟡 Draft will export for lawyer review: built on web (two documents shown as watermarked PDFs, Word download) and mobile (share as text); the wording waits for a lawyer (Q24, Q1, Q2). See [plans/2026-11-11-draft-will-export.md](plans/2026-11-11-draft-will-export.md).

Validation rules to build early: allocations per asset sum to 100% (or are one clear specific bequest);
every asset is covered by an allocation or the residuary clause; flag beneficiaries with no contingency; flag
assets that may fall under customary or religious law (Q5).

### 2. Talk to a probate lawyer (in parallel, not after)

Several of the biggest unknowns are legal. Don't wait for a working prototype to start asking.

1. ⬜ Find and meet a Nigerian probate lawyer. Answers Q1, Q2, Q5, Q7, Q10.
2. ⬜ Show them the draft will export from §1 and take their feedback before building further. The briefing is [lawyer-briefing.md](lawyer-briefing.md).

### 3. After lawyer feedback

Not scheduled until the questions above are answered.

1. ⬜ Lawyer review flow and panel (Q3, Q4, Q12).
2. ⬜ Executor role and the death-trigger process, human-initiated (Q7).
3. ⬜ Review prompts for stale inventories (Q13).
4. ⬜ Domain, handles and trademark check (Q8).
5. ⬜ Conditional gifts (age thresholds, things to be done): [plan](plans/2026-11-10-conditional-gifts.md). Blocked on Q18, Q19, Q20.

### 4. Later

Wanted, but not scheduled and not planned in detail yet.

1. ⬜ Pictures on assets: attach photos to an asset (a house, a car, jewellery) so an executor can identify it. Needs
   storage and an upload path on both apps, and a decision on privacy first: a photo of a deed, a statement or
   an ID would hold the very details we refuse to store elsewhere (Q9, [security.md](standards/security.md)), and
   where the files live is part of Q10. Write a plan doc and an open question before building.

## All plans

One row per doc in `docs/plans/`.

| Doc                                                                                  | Status         | Notes                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [plans/2026-11-10-workspace-scaffold.md](plans/2026-11-10-workspace-scaffold.md)     | 🟡 In progress | Scaffold, test DB, CI and security standard built; full `yarn dev` check remains.                                                                                                                                              |
| [plans/2026-11-10-auth-and-data-models.md](plans/2026-11-10-auth-and-data-models.md) | 🟡 In progress | Backend (auth, 8 tables, inventory API) and mobile (sign-in, assets, people, allocation editor, residuary, review) done and verified; web client and executor screens to do.                                                   |
| [plans/2026-11-10-mobile-app-scaffold.md](plans/2026-11-10-mobile-app-scaffold.md)   | 🟡 In progress | `apps/mobile` scaffolded and verified (typecheck, lint, 19 tests, iOS bundle export); runs in the iOS Simulator against the local backend; Android not tried; EAS not set up (Q16).                                            |
| [plans/2026-11-10-conditional-gifts.md](plans/2026-11-10-conditional-gifts.md)       | ⬜ Not started | Planning only: conditions on a gift need a holder and an "if unmet" plan, and a date of birth for age checks. Waiting on Q18 (what is enforceable), Q19 and Q20.                                                               |
| [plans/2026-11-10-web-client.md](plans/2026-11-10-web-client.md)                     | 🟡 In progress | Web pages for the whole inventory built and verified in a browser; saving each form not yet exercised.                                                                                                                         |
| [plans/2026-11-11-draft-will-export.md](plans/2026-11-11-draft-will-export.md)       | 🟡 In progress | Draft will built from the inventory as two documents (the will and notes for the lawyer): watermarked PDF and Word on web, share as text on mobile. Standard-clause wording and signing block wait for a lawyer (Q24, Q1, Q2). |
