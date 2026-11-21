# Web client

Created: 2026-11-10

Status: In progress — pages built and verified in a browser against the real backend (2026-11-10); pushing and CI remain.

Owner: Chidi Orji <orjichidi95@gmail.com>

Open questions: Q21 (where an asset is and who holds its papers; nothing built for it yet)

## Objective

The same inventory features as the mobile app, in the browser: sign in, assets, who gets what, people and
organisations, executors and lawyers, the "everything else" shares, and the review report. Branch
`feature/web-client`, stacked on `feature/conditional-gifts`.

## How this document is used

Check items off as they are built and verified. Pure logic (allocation form, labels, dates) lives in
`packages/shared/src/client` and is shared with mobile; only the screens are web-specific.

## Findings

- Web stack: Vite, TanStack Router (code-based, `src/router.tsx`) and Query, Tailwind 4, native `<select>` and `<input type="date">` (verified 2026-11-10).
- The refresh token is in `localStorage`; the trade-off is recorded in [security.md](../standards/security.md) Rule 6.

## Checklist

- [x] Foundations: API client with single-flight refresh, auth context, form components, Vitest setup
- [x] Sign in and register, with a redirect to sign-in when signed out
- [x] Assets: list, add, view (who gets it), edit details, edit distribution with conditions, remove
- [x] People: list, add, edit, remove (person or organisation, date of birth, address, fallback)
- [x] Executors and lawyers: list, add, edit, remove
- [x] Everything else (residuary) and the review report, with each issue opening its subject
- [x] 21 web tests (client refresh, shares, conditions, distribution, date bounds, sign-in flow); `yarn web:test` runs in CI
- [x] Verified in a browser against the backend: sign in, reload keeps the session, every page loads with seed data
- [ ] Not exercised in the browser: saving each form, delete confirmations, register, narrow-screen layout
- [ ] Share one API client between mobile and web
