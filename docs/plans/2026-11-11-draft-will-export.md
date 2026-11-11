# Draft will export

Created: 2026-11-11

Status: In progress — built and tested end to end on web, mobile and the backend (2026-11-11); wording is placeholder until a lawyer reviews it (Q24).

Owner: Chidi Orji <orjichidi95@gmail.com>

Roadmap link: [`docs/roadmap.md`](../roadmap.md) §1 item 6

Open questions: Q1 (which state), Q2 (how a will is signed), Q5, Q17, Q18, Q24 (wording of the standard clauses)

## Objective

Turn a person's inventory into a draft will that a lawyer can read, correct and finish. The draft says what the
person asked for, leaves bracketed gaps for what only a lawyer can settle, and is plainly marked as not a valid
will. Branch `feature/web-client`.

## How this document is used

Check items off as they are verified. The wording is built in one place, `packages/shared/src/client/draft-will.ts`,
so the screen, the Word file and the shared text can never disagree.

## Findings

- The draft is a pure function of the inventory (`buildDraftWill`): assets, beneficiaries, executors, each asset's
  allocation, the residuary and every review issue (verified 2026-11-11).
- Executors named as "executor" are appointed; lawyers and priests are listed for the lawyer but not appointed,
  because a person may name a lawyer only as an adviser or as the holder of a conditional gift.
- Nothing about validity is assumed: state, signing formalities, enforceability of conditions and gifts to
  organisations are written down for the lawyer as open points, not decided.

## Work

- [x] Builder with tests (`packages/shared/src/client/draft-will.ts`)
- [x] Backend: `GET /api/draft-will` (JSON) and `GET /api/draft-will/docx` (Word), owner-scoped, with tests
- [x] Review issues available in full for the draft (`findInventoryIssues`)
- [x] Web: Draft will page with preview, Word download and print
- [x] Mobile: Draft will screen with the system share sheet (plain text)
- [x] Open question Q24 recorded
- [ ] A lawyer reviews the wording of the standard clauses and the attestation block (Q24, Q1, Q2)
- [ ] PDF export, if lawyers ask for it
- [ ] Word file on mobile (needs a file and sharing package; text is shared for now)
