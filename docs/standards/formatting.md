# Formatting Standard

This document defines how source files in this repo get formatted, and how formatting changes are
committed. There's no pre-commit hook enforcing any of this today (no husky, no lint-staged) — it's
manual discipline, which is exactly why this is worth writing down.

## Rule 1 — Run `yarn format` before committing, don't hand-format

```bash
yarn format
```

Runs `format:sql` (reformats every migration's `.sql` file via `sql-formatter`) then `prettier
--write .` (everything else — TS/TSX, JSON, Markdown). Both are already configured with this
repo's actual settings; there's no separate prettier config to reach for and no reason to
hand-adjust spacing, line-wrapping, or quote style to "fix" something prettier would do
automatically the next time it runs.

**Why:** with no pre-commit hook, formatting drift is silent until someone runs `yarn format` and a
wall of unrelated whitespace changes shows up in their diff — which happened repeatedly in this
same session (§2 explains what to do about it once it does). Running it proactively before
committing keeps that drift from accumulating in the first place.

## Rule 2 — A formatting pass gets its own commit, never mixed with a content change

If a `yarn format` run (yours or someone else's, picked up via `git pull`/rebase) touches files
you didn't otherwise mean to change, commit that formatting separately — don't let it ride along
in the same commit as your actual fix or feature.

**Why:** a commit that mixes "renamed a function" with "reformatted forty unrelated files" makes
the real change hard to review and hard to `git blame`/bisect later — the signal (what actually
changed and why) gets buried in noise (how it's indented). This came up constantly working across
several branches in one session: `yarn format` (run by whoever, on whatever branch) kept
introducing pure line-wrapping/table-realignment diffs alongside genuine edits, and separating them
into their own "Formatting only: prettier + sql-formatter pass" commits kept each branch's real
history legible.

**How to apply it:** before committing, check `git status`/`git diff --stat` for files you didn't
intentionally touch. If a file's diff is purely whitespace/wrapping (confirm with a quick read of
the actual diff, not just the file list — a file can have both a real edit and formatting noise in
it, in which case split them by hand), stage and commit those separately from your real change,
with a message like `Formatting only: prettier + sql-formatter pass`. Never assume a changed file
is "probably just formatting" without checking — see the migrations example below.

## Rule 3 — Formatting still counts as a real diff for migrations

`format:sql` reformats `.up.sql`/`.down.sql` files (line-wrapping `ALTER TABLE` statements,
realigning `CHECK` constraint lists) exactly like any other file. This is safe _content-wise_
(the SQL is semantically identical, just reformatted) but still subject to
[`docs/standards/migrations.md`](migrations.md) Rule 3 — once a migration has been applied anywhere
shared, don't assume a "just formatting" edit to it is risk-free to skip re-verifying; the same
immutability guidance applies regardless of why the file changed.
