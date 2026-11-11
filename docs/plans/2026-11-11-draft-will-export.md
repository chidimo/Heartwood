# Draft will export

Created: 2026-11-11

Status: In progress — built and tested end to end on web, mobile and the backend (2026-11-11); wording is placeholder until a lawyer reviews it (Q24).

Owner: Chidi Orji <orjichidi95@gmail.com>

Roadmap link: [`docs/roadmap.md`](../roadmap.md) §1 item 6

Open questions: Q1 (which state), Q2 (how a will is signed), Q5, Q17, Q18, Q24 (wording of the standard clauses)

## Objective

Turn a person's inventory into a draft will that a lawyer can read, correct and finish. The draft says what the
person asked for, leaves bracketed gaps for what only a lawyer can settle, and is plainly marked as not a valid
will. It comes as two separate documents: the will, and notes for the reviewing lawyer. Branch `feature/web-client`.

## How this document is used

Check items off as they are verified. The wording is built in one place, `packages/shared/src/client/draft-will.ts`,
so the PDF, the Word file, the phone screen and the shared text can never disagree.

## Findings

- The draft is a pure function of the inventory (`buildDraftWill`): assets, beneficiaries, executors, each asset's
  allocation, the residuary, every review issue and the person's name and address (verified 2026-11-11).
- Two documents, not one: `will` (opening, revocation, executors, gifts with each asset under its own heading,
  failure of gifts, residue, signing) and `notes` (assumptions, points to check, schedule of assets, people named).
- Executors named as "executor" are appointed; lawyers and priests are listed for the lawyer but not appointed,
  because a person may name a lawyer only as an adviser or as the holder of a conditional gift.
- Nothing about validity is assumed: state, signing formalities, enforceability of conditions and gifts to
  organisations are written down for the lawyer as open points, not decided.
- The PDF is made on the server (pdfkit, with DejaVu Serif so Yoruba and Igbo letters and the naira sign print).
  Every page carries a faint HEARTWOOD watermark and a footer with the date, a reference and the page number.
- The reference is a short code from the exact words of both documents, so a lawyer can check a copy against the
  app's own. It marks where a copy came from; it is not a digital signature and does not prove who wrote it.
- Web shows the PDF with pdf.js, every page in one scrolling pane. The Word file has the reference in its header
  and footer but no watermark, since a lawyer will edit it.

## Work

- [x] Builder with tests (`packages/shared/src/client/draft-will.ts`)
- [x] Backend: `GET /api/draft-will`, and `/api/draft-will/{will,notes}.{pdf,docx}`, owner-scoped, with tests
- [x] PDF with watermark, footer, reference and page numbers; a name with ọ, ẹ, ṣ prints (test)
- [x] Review issues available in full for the draft (`findInventoryIssues`)
- [x] Profile with an address (web and phone), used in the opening line
- [x] Web: Draft will page: two documents, pdf.js viewer in a scroll pane, download PDF or Word, open to print
- [x] Mobile: Draft will screen: two documents with clear headings, share as text
- [x] Open question Q24 recorded
- [ ] A lawyer reviews the wording of the standard clauses and the signing block (Q24, Q1, Q2)
- [ ] A PDF file on mobile (needs expo-print and expo-sharing; text is shared for now)
- [ ] A way to verify a reference (a page where a lawyer enters it), if lawyers want one
