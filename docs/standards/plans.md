# Plan Doc Standard

Most non-trivial work starts as a checklist doc in `docs/plans/`. This file says how those docs look so new
ones match. Naming and the `~` done-prefix come from Concord; the checklist structure and the roadmap's
"All plans" table come from Olamma.

## Rule 0 — Location, filename, and header

- Lives in `docs/plans/`, named `YYYY-MM-DD-kebab-case-title.md`. The date is when the doc was **created**,
  not touched.
- Prefix the filename with `~` once the plan is fully done (`git mv`, then fix links with
  `grep -rn "plans/<old name>" docs/`). Anything not fully done keeps no prefix, however much is checked off.
  The `mark-plan-done` skill does this.
- Opens with a metadata block right after the `# Title`:

  ```
  # Title

  Created: YYYY-MM-DD

  Status: <Planning — not yet built | In progress — ... | Done — ...>

  Owner: <name> <email>

  Roadmap link: [`docs/roadmap.md`](../roadmap.md) §N   (only if it is on the roadmap's numbered list)

  Open questions: Q3, Q7   (IDs from docs/open-questions.md that this plan depends on)
  ```

  Update `Status` in place as the plan moves.

## Rule 1 — A plan is a checklist, not a narrative

Structure: an **Objective**, a short **"How this document is used"** note, a **Findings** section (what is
true right now, with file:line evidence and a "verified <date>"), then the work as `- [ ]` items grouped by
file or area.

**Why:** plans are worked over many sessions by whoever picks them up. A checklist tells the next person
what is left; an essay doesn't.

## Rule 2 — One unchecked item at a time; commit each before the next

Check the box, commit just that item's changes, push. Don't batch five items into one commit.

**Why:** each commit stays reviewable and the work can be paused and resumed cleanly.

## Rule 3 — Convert relative dates to absolute

"verified 2026-11-10", not "verified today" / "next week". The doc outlives the session that wrote it.

## Rule 4 — Keep the roadmap's "All plans" table current

`docs/roadmap.md` has one row per plan doc with a status (✅ done / 🟡 in progress / ⬜ not started) taken from
that doc's own checkboxes. Update the row when you start or finish a pass, add a row when you add a doc, and
fix the link when you rename or `~`-prefix one.

## Rule 5 — A plan names the open questions it depends on

If a plan can't be finished without an answer, list the question's ID in the header (`Open questions: Q3`)
and say in the checklist which item it blocks. When the question is answered in `docs/open-questions.md`,
update the plan in the same commit.

**Why:** for Heartwood, several of the biggest unknowns are legal (which states, what execution process is
valid). A plan that quietly assumed an answer is how a wrong assumption reaches production.

## Rule 6 — Stacked PRs for multi-part work

When one plan spans several changes that should land together, give each its own branch stacked on the
previous (`A → B(off A) → C(off B)`), say so in the plan with the branch order, point each PR at the branch
below it, and merge bottom-up in one pass.
