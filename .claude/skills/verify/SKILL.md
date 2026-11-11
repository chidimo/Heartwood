---
name: verify
description: Run this repo's real verification checklist (two-tier typecheck, tests, build) before calling backend or frontend work done — catches errors that a single tsc pass or vite build silently misses.
---

# Verify

> Copied from Concord. The commands assume the same layout (`apps/backend`, `apps/web`, `packages/database`, `yarn test:backend`, `docker-compose.test.yml`). Those don't exist in Heartwood yet (see `docs/roadmap.md` §0): skip any step whose target hasn't been created, and say so when reporting.

There's no root-level lint or test script and no single "verify everything" command — assemble the right subset of these based on what changed. Nothing here needs approval to run; these are all read-only checks.

## Backend changes

Run **both** typecheck passes from `apps/backend/` — they catch different errors and neither one subsumes the other:

```bash
cd apps/backend
npx tsc --noEmit -p .        # plain per-project check
npx tsc -b --force           # build-mode, using project references — catches real errors the plain pass misses
```

`tsc -b` must be run from `apps/backend/` specifically; the repo root has no `tsconfig.json` of its own, so `tsc -b` from the root fails outright rather than checking anything.

Then run the backend test suite from the repo root:

```bash
yarn test:backend
```

This brings up a disposable Postgres container (`docker-compose.test.yml`), runs the full Jest suite against it, and tears the container down after — safe to run anytime, doesn't touch your real dev DB.

## Frontend changes

**`yarn web:build` passing is not proof the code typechecks.** It's a Vite/esbuild build, and esbuild strips types without checking them, so it will happily "succeed" over real type errors (confirmed on Concord, where this skill comes from). Always run the `tsc` pass below as well.

To actually typecheck the frontend:

```bash
cd apps/web
npx tsc -b --force
```

Check `docs/roadmap.md` for whether a frontend test suite exists yet; don't add one speculatively as part of an unrelated change. For UI/behavioral correctness, use the browser preview tools to actually exercise the changed page — start the dev server, click through the golden path and at least one edge case, check the console/network tab for errors. Don't claim a UI change works without having done this.

## Database/migration changes

If a migration was added or changed, additionally run `yarn db:migrate` against a disposable DB to confirm it applies cleanly, and `yarn db:codegen` to refresh `packages/database/src/db.types.ts` — then re-run the backend typecheck pass above, since a schema change often changes generated types that repository code depends on.

## Reporting results

State plainly which of the above you ran and what passed/failed — don't claim "all tests pass" if you only ran a typecheck, and don't claim a UI change "works" if you only typechecked it without opening a browser.
