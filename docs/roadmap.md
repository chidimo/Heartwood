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

### 1. MVP: inventory to draft will (no partnerships needed)

Scope from [exploration.md](exploration.md) §6. Needs a plan doc per item before building.

1. ⬜ Auth and user (testator). Blocked on Q11.
2. ⬜ Asset inventory: add any asset, categorised. Blocked on Q9.
3. ⬜ Beneficiaries, including contingency (what if the beneficiary dies first).
4. ⬜ Allocation of each asset among beneficiaries, with the validation rules below.
5. ⬜ Residuary clause for anything unlisted or left over.
6. ⬜ Draft will export for lawyer review. Blocked on Q1 and Q2.

Validation rules to build early: allocations per asset sum to 100% (or are one clear specific bequest);
every asset is covered by an allocation or the residuary clause; flag beneficiaries with no contingency; flag
assets that may fall under customary or religious law (Q5).

### 2. Talk to a probate lawyer (in parallel, not after)

Several of the biggest unknowns are legal. Don't wait for a working prototype to start asking.

1. ⬜ Find and meet a Nigerian probate lawyer. Answers Q1, Q2, Q5, Q7, Q10.
2. ⬜ Show them the draft will export from §1 and take their feedback before building further.

### 3. After lawyer feedback

Not scheduled until the questions above are answered.

1. ⬜ Lawyer review flow and panel (Q3, Q4, Q12).
2. ⬜ Executor role and the death-trigger process, human-initiated (Q7).
3. ⬜ Review prompts for stale inventories (Q13).
4. ⬜ Domain, handles and trademark check (Q8).

## All plans

One row per doc in `docs/plans/`.

| Doc                                                                              | Status         | Notes                                                                             |
| -------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| [plans/2026-11-10-workspace-scaffold.md](plans/2026-11-10-workspace-scaffold.md) | 🟡 In progress | Scaffold, test DB, CI and security standard built; full `yarn dev` check remains. |
