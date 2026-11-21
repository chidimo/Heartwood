---
name: mark-plan-done
description: Mark a docs/plans/*.md plan as done once its work has shipped, and reconcile docs/roadmap.md to match.
---

# Mark plan done

Use this once the work described in a `docs/plans/YYYY-MM-DD-slug.md` file has actually been built and verified — not while it's still in progress.

Before writing anything, read the actual shipped code (files, functions, tests) so the description you write matches what's real, not what was originally planned — scope often shifts during implementation.

## 1. Update the plan file's Status line

Change the `Status:` line (near the top, after `Created:`) from `Draft` / `Planning — not yet built` to a `Done` line naming what actually got built — concrete file/component/function names, not a restatement of the original goal. Look at other completed plans in `docs/plans/` for the tone: e.g. `Status: Done — built (`lead-form.tsx`, "+ Add lead" on the leads list and "Edit" on a lead's detail page)`. If only part of the plan shipped, say so precisely (`Done for experts — ... Still outstanding: ...`) rather than marking the whole thing done.

## 2. Rename the file with a leading `~`

Completed plans in this repo are prefixed with `~` (e.g. `~2026-08-19-staff-create-edit-lead.md`); files without a `~` are still in progress. Rename with `git mv`:

```bash
git mv docs/plans/YYYY-MM-DD-slug.md docs/plans/~YYYY-MM-DD-slug.md
```

Then grep for the old path and fix any other files that link to it (other plans' "Related:" lines, roadmap files):

```bash
grep -rn "plans/YYYY-MM-DD-slug" docs/
```

## 3. Update `docs/roadmap.md`

`docs/roadmap.md` is a single file read by both engineering and clients: every bullet has a plain-language lead line, with any file paths, function names, or plan-doc links folded into a collapsed `<details><summary>Technical detail</summary>...</details>` block right beneath it.

Find the bullet this plan corresponds to (usually under "Part 1: Features" or "Part 2: System Hardening"). Rewrite its lead line as a plain, past-tense, client-readable sentence describing what actually shipped (no file paths or internal names in this line), prefixed with **Done.** / **[DONE]** / **[Done]**, whichever the surrounding entries in that section already use. Then add or update the `<details>` block underneath with the engineering-specific version — concrete file/component/function names, and a link to the renamed plan file:

```markdown
5. **Done.** <plain, client-readable description of what shipped>.
   <details><summary>Technical detail</summary>

   <what actually shipped, naming key files/components>. See [`docs/plans/~YYYY-MM-DD-slug.md`](plans/~YYYY-MM-DD-slug.md).
   </details>
```

If the shipped work only covers part of the bullet, say so in the plain lead line (`Done for experts — ... still outstanding: ...`) rather than marking the whole thing done.

## Don't

- Don't mark something Done if you haven't verified it actually works (tests passing, or manually exercised).
- Don't invent detail beyond what you can see in the diff/code — if you're unsure exactly what shipped, read the relevant files first.
- Don't touch unrelated roadmap bullets while you're in the file.
