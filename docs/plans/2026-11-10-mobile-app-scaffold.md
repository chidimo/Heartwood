# Mobile app scaffold

Created: 2026-11-10

Status: In progress — scaffold built and running in the iOS Simulator. Android not tried; EAS not set up.

Owner: Chidi Orji <orjichidi95@gmail.com>

Roadmap link: [`docs/roadmap.md`](../roadmap.md) §0

Open questions: Q15 (app lock), Q16 (release setup). Q14 answered: we build web and mobile.

## Objective

An Expo app in `apps/mobile` that runs end to end against the backend with no product features, and the standard that future mobile code follows ([mobile.md](../standards/mobile.md)).

## What exists (verified 2026-11-10)

- Expo SDK 57, expo-router, NativeWind 4, TanStack Query, sonner-native. `app/` has a root layout and one home screen that calls `/api/health`.
- `src/` has the modules the standard names: `storage`, `notify`, `cn`, `apiFetch` (`ApiError`, `Unreachable`, `errorMessage`), `config` (`resolveApiUrl`), and `QueryState`.
- Standalone package (own `node_modules` and `yarn.lock`, excluded from the root workspaces), as in Falcon and Olamma; `@heartwood/shared` is consumed as source through Metro and tsconfig aliases.
- `yarn mobile:typecheck`, `mobile:lint` and `mobile:test` pass: 19 tests across 5 suites. `npx expo export --platform ios` bundles successfully.
- CI runs the three mobile checks on PRs into `main`.

## Remaining

- [x] iOS Simulator (iPhone 17, Expo Go, SDK 57): home screen renders and shows "API status: ok" from the local backend (verified 2026-11-10). Android device or emulator not yet tried.
- [ ] App icon and splash assets (none yet; Expo defaults are used).
- [ ] Real brand palette in `tailwind.config.js` (placeholder green now).
- [ ] EAS project, bundle ID and store accounts (Q16); set `runtimeVersion` to the fingerprint policy at that point.
- [ ] Sign-in screens and token storage, once the backend has auth (Q11). App lock policy (Q15).
- [ ] Decide whether to wire Nx `mobile` targets into `yarn typecheck`; `project.json` exists but the root scripts call yarn directly.

## Deliberately left out

Biometrics, voice, document and image upload, offline queue, push, OTA updates, Sentry. Each gets its own plan when a feature needs it.
