# Project standards

Read before working here:

- [docs/roadmap.md](docs/roadmap.md): what to pick up next, plus the table of all plans.
- [docs/open-questions.md](docs/open-questions.md): decisions not yet made. If you hit one, add it; if you make one, answer it there. Never assume an answer to a **lawyer** question.
- [docs/standards/](docs/standards/README.md): the rules new code is held to (layering, transactions, migrations, formatting, frontend, plans).
- [docs/plans/](docs/standards/plans.md): checklist plan docs, one per piece of work.

Heartwood helps people reach a valid, lawyer-reviewed will. The app never holds assets and never decides who inherits: the signed will is the source of truth. Store the minimum (see open question Q9); never log asset details.

## Stack

Same as Concord: Nx + Yarn 1 monorepo (`apps/*`, `packages/*`), Node 22, TypeScript, Express backend, Kysely + Postgres, React + Vite + TanStack Router/Query + Tailwind, Zod, Jest/Vitest. Packages are scoped `@heartwood/*`.

## Code

- When a form needs a person's name, collect a single "name" field. Split into first/last on the server, never in the frontend.
- Keep code comments and docstrings short. State the non-obvious rule in one line; don't restate history or alternatives considered. If an example makes the point faster than prose, use the example.
- No nested or complex ternaries (`a ? x : b ? y : z`, or a ternary whose branches are long JSX). With more than two outcomes, use early returns in a small component or helper, an `if / else if` chain, or a lookup object. A single `cond ? a : b` is fine.
- `useState` pairs follow `[thing, setThing]`: the setter is `set` plus the exact state name.
- No boolean flag that picks which action a function takes (`savePref(enabled)`). Write two functions (`enablePref()` / `disablePref()`). A flag that only changes a value or option is fine.
- Run `yarn format` before committing. Formatting-only changes get their own commit ([standards/formatting.md](docs/standards/formatting.md)).

## Git branching workflow

- `main` is the deploy branch: always production-ready.
- `dev` is the integration branch. New work branches off `dev` (or the exact branch it stacks on), and PRs target `dev`, not `main`.
- Occasionally `dev` is merged into `main` as a release. Right after, sync `dev` to `main`'s tip:
  ```
  git checkout dev && git reset --hard origin/main && git push --force-with-lease origin dev
  ```
  A plain `git merge --ff-only` won't work: GitHub's squash-merge gives the same content a different SHA on each branch.
- A docs-only or other one-off change may be merged straight into `main` when explicitly requested. Sync `dev` afterwards the same way.
- After any PR merges, delete its branch locally and on `origin`.
- Commit subjects and PR titles carry a matching [gitmoji](https://gitmoji.dev) prefix (✨ feature, 🐛 fix, 💥 breaking change, ✏️ copy/rename, 📝 docs). One prefix per commit or PR.
