# Mobile Standard

Conventions for `apps/mobile` (Expo, expo-router, NativeWind, TanStack Query). Synthesised on 2026-11-10 from
three apps we already built: **Olamma** (`apps/mobile`, the most mature: auth, biometrics, voice, OTA updates),
**Falcon** (`apps/mobile`, offline queue and idempotency) and **mobile-flashcards** (storage and update
prompt). Where all three independently arrived at the same rule, it's here because it was written down after
costing someone time. Rules about web and backend live in the other files in this directory and apply here too
([frontend.md](frontend.md) Rules 1–3, [security.md](security.md)).

## Rule 1 — Check the Expo docs for the installed SDK; install with `expo install`

Before writing code that touches Expo, EAS or React Native APIs, read the major version of `expo` in
`apps/mobile/package.json` and use that version's docs (`https://docs.expo.dev/versions/v<major>.0.0/`). Add
packages with `npx expo install <package>`, never `yarn add`.

**Why:** Expo ships breaking changes every SDK. APIs from memory are often renamed or removed, and `yarn add`
picks a version that doesn't match the SDK's native code, which fails only at runtime on a device. (Olamma's
`AGENTS.md` exists because of this.)

**How to apply it:** after changing dependencies run `npx expo-doctor`; `npx expo install --fix` repairs
mismatched versions. A package with native code needs a new development build, not just a Metro reload.

## Rule 2 — `ios/` and `android/` are generated; configure native behaviour in `app.json`

Don't create or edit the native folders by hand (they're gitignored). Permissions, URL schemes, icons and
native settings go in `app.json` or a config plugin.

**Why:** with Continuous Native Generation the folders are rebuilt from config, so hand edits are silently
lost. A committed `ios/` also drifts from the SDK.

## Rule 3 — Routes live in `app/`; everything else lives in `src/`

Every file in `app/` is a screen or a `_layout.tsx`. Components, hooks, API code and utilities go under `src/`
(`src/api`, `src/components`, `src/storage`, `src/notifications`, `src/utils`, then one folder per feature).
Screens are thin: they compose components and hooks. Screens and layouts use `export default`; everything else
uses named exports ([CLAUDE.md](../../CLAUDE.md)).

**Why:** expo-router turns every file under `app/` into a route, so a helper dropped there becomes a screen.

**How to apply it:** a test file never goes in `app/`; put it in `src/**/__tests__/`. Use `Stack.Protected` guards
in the root layout for signed-in vs signed-out routes instead of redirecting inside each screen.

## Rule 4 — Persistent storage goes through `storage`, never `expo-secure-store` or AsyncStorage directly

Import `storage` from `src/storage/storage.ts` (`get`, `set`, `remove`, `getJson`, `setJson`, and
`{authenticate: 'reason'}` for items that must sit behind fingerprint or face). Keys are namespaced
`heartwood.<thing>`.

**Why:** all three apps wrote this same rule. Direct calls scatter the web fallback, error handling and the
biometric gate across the codebase, and make it impossible to see what the app persists.

**How to apply it:**

- Tokens and anything personal go through `storage` (keychain/keystore on a phone). Never in AsyncStorage,
  never in a query cache that is persisted to AsyncStorage (see Rule 9).
- The web build exists for local development only; `storage` keeps biometric-gated items out of it.
- Clear every key a user created on sign-out ("not you?" must leave nothing of the last person behind).

## Rule 5 — In-app messages go through `notify`; every mutation tells the person both outcomes

Use `notify.success / error / info` from `src/notifications/notify.ts`, never `sonner-native` directly. The
rule from [frontend.md](frontend.md) Rule 1 applies unchanged: the component that calls `.mutate(...)` shows a
success and a failure notification, using `errorMessage(error, fallback)` for the failure text.

**Why:** a silent failed save looks identical to a success on a phone, where there is often no inline error
text. Wrapping the library means swapping it later is one file.

## Rule 6 — Build `className` with `cn(...)`; no conditions inside template literals

```tsx
className={cn('rounded-xl p-4', selected ? 'bg-primary-100' : 'bg-white', disabled && 'opacity-60')}
```

`cn` (`src/utils/cn.ts`) doesn't resolve Tailwind conflicts, so pass one side of a conflict, never both
(`cn('p-2', big && 'p-4')` renders both and the winner is whatever the stylesheet order says).

**Why:** `` `base ${cond ? 'a' : 'b'}` `` buries the condition in a string and invites nested ternaries.

## Rule 7 — Every screen that loads data handles pending, error and empty: use `QueryState`

Wrap query results in `<QueryState query={q} isEmpty={...} empty={...}>{data => ...}</QueryState>`
(`src/components/query-state.tsx`) instead of reading `data?.x ?? 0`. A mutation's `isPending` disables its
submit control.

**Why:** this is [frontend.md](frontend.md) Rule 2, and it matters more on a phone, where a request failing is
ordinary. A blank or zeroed inventory that is really a failed request could lead someone to trust an incomplete
estate list.

## Rule 8 — All network access goes through `apiFetch`; the base URL comes from `config`

No `fetch(...)` or axios call in a component or screen. `apiFetch` (`src/api/client.ts`) adds the base URL,
throws `ApiError` carrying the server's message, and throws `Unreachable` when there was no answer. The base URL
is `API_URL` from `src/config.ts`, whose `resolveApiUrl` swaps `localhost` for the Metro host on a physical phone
and `10.0.2.2` on the Android emulator. TanStack Query retries network failures and 5xx up to 3 times, never 4xx.

**Why:** `localhost` on a phone is the phone. Hand-built URLs break on devices and get the error shape wrong.

**How to apply it:** when sign-in lands, token refresh belongs in `apiFetch`, one refresh at a time shared by
parallel requests (Olamma's `client.ts` is the worked example).

## Rule 9 — Persisted data is limited to what [security.md](security.md) allows

Don't persist the TanStack query cache of asset, beneficiary or will data to AsyncStorage. Falcon does persist
its cache for offline reads (24 hours); that was acceptable for customer lists but is not acceptable here,
because AsyncStorage is unencrypted. If offline reads are needed later, encrypt the cache or store it through
`storage`, and write a plan first.

**Why:** a lost or backed-up phone must not expose a person's estate. [security.md](security.md) Rules 1–2 apply
to the device exactly as to the server.

## Rule 10 — A write that can be retried carries an idempotency key

Any request that creates something (an asset, a beneficiary, a will draft) and may be retried after a flaky
connection sends an `Idempotency-Key` header: a UUID the client mints **once per user action** and reuses on
every retry of that action. The server returns the stored result for a repeat key and rejects the same key with
a different body.

**Why:** Falcon learned this the hard way: a request that succeeded but whose response was lost looked like a
failure, so a retry made a duplicate or a confusing 409. Connectivity in Nigeria makes this the normal case,
not an edge case.

**How to apply it:** not needed until the first create endpoint exists; build the server support first (Falcon's
`idempotency_key` table is the model), then add the header in `apiFetch`. A mutation that is already idempotent
by design (setting a field to a value) doesn't need one. An offline write queue is a separate decision
(Falcon's `src/offline/` is the model) and needs its own plan.

## Rule 11 — `EXPO_PUBLIC_*` values are public; never put a secret in them

Anything in `EXPO_PUBLIC_*`, `app.json` or an EAS `env` block ships inside the app and can be read by anyone who
installs it. Only public values go there (API URL, a public site key). Keep `.env` out of git; commit
`.env.example`. Never commit a signing keystore (`*.jks`, `*.p12`) or service-account JSON: let EAS manage
credentials.

**Why:** [security.md](security.md) Rule 4. Olamma has `.jks` files sitting in its mobile folder; Heartwood
doesn't repeat that.

## Rule 12 — Ask for the fewest permissions, and explain each in the user's words

Add a permission only for a feature that ships in the same change. Write the iOS usage string and the Android
rationale as a sentence a non-technical person understands ("Heartwood uses the camera so you can photograph a
document"). Block permissions you don't use (`blockedPermissions` in `app.json`).

**Why:** a permission prompt with no obvious reason is the quickest way to lose trust in an app that holds
sensitive information, and unused permissions are scrutinised in store review.

## Rule 13 — Lock sensitive screens behind the device's own authentication (decision pending)

The planned pattern is Olamma's: after the app is backgrounded or reopened, require biometrics or a PIN before
showing inventory or will data (`expo-local-authentication`, with `storage`'s `{authenticate}` for the stored
session). The policy (when it locks, whether a PIN is allowed) is open question Q15; until it is answered,
build nothing that shows real data without it being easy to add.

## Rule 14 — Test logic in plain modules; mock native modules; check the screen on a device

- Put logic (URL resolution, error mapping, storage, queue rules) in plain TypeScript modules with a test next to
  them in `__tests__/`. Mock native modules (`expo-secure-store`, netinfo) at the module boundary.
- Component tests use `@testing-library/react-native` v14: **`render` is async**, so `await render(...)` and use
  `findBy*`. It needs the `test-renderer` package (a peer dependency); without it every component test fails to
  load.
- `jest-expo` is the preset. Native-only packages must be listed in `transformIgnorePatterns` if a test imports
  them and Jest chokes on ESM.
- Before calling mobile work done run, from the repo root: `yarn mobile:typecheck`, `yarn mobile:lint`,
  `yarn mobile:test`. For a change to how something looks or behaves, also open it in the iOS Simulator or on a
  phone; passing tests don't show that a screen renders correctly. For anything touching Metro, native config or
  `@heartwood/shared`, run `npx expo export --platform ios` as a bundling smoke test.

- When driving the iOS Simulator by script: its text injection stops after about 13 characters and can drop
  characters right after a field gets focus. Type in chunks of 12 or fewer, wait, and check the field before
  tapping Save. Don't tear down the Postgres a running dev backend uses when you run the test script: give dev
  its own database (`docker-compose.yml`, port 5434) and tests theirs (`docker-compose.test.yml`, 5433).

**Why:** Falcon's mobile code isn't linted and its offline queue is "unit-tested, awaiting on-device testing" for
weeks; Olamma's lint rules were added after an un-awaited promise sent an empty upload on Android.

## Rule 15 — Mobile lint catches floating promises; keep it on

`apps/mobile/eslint.config.js` enables `no-floating-promises`, `no-misused-promises`, `await-thenable` and
`no-nested-ternary`. Don't disable them to get a build through; fix the promise.

**Why:** a promise that is neither awaited nor handled fails silently on a device, and the type checker can't see
it.

## Rule 16 — Ship with EAS: three profiles, channels per profile, native changes need a new build

`eas.json` has `development` (dev client, internal), `preview` (internal APK, `preview` channel) and
`production` (store, `production` channel, auto-increment). JavaScript-only changes ship with `eas update` to a
channel; anything that changes native code, permissions or the Expo SDK needs a new build, because an OTA update
can't carry it. Set `runtimeVersion` to the fingerprint policy once the first build exists so an update is never
delivered to a binary it can't run on.

**Why:** an OTA update that expects native code the installed binary lacks crashes on launch. The fingerprint
policy (Olamma) makes that mismatch impossible instead of something to remember.

**How to apply it:** until EAS is set up (the bundle ID `com.heartwood.app` and the Expo project are
placeholders), none of this is live. See [the roadmap](../roadmap.md).

## Rule 17 — Native-only modules get a `.web.tsx` sibling

If a screen or component uses a module that doesn't run on the web build (maps, biometrics), add a
`name.web.tsx` that renders a simple stand-in, rather than guarding with `Platform.OS` inside the component.

**Why:** Metro picks the right file per platform, so the web build keeps working for local development without
conditionals scattered through the code (Falcon's `customers-map.web.tsx`).

## Rule 18 — A choice from a fixed list is a `Select` dropdown

Use `Select` (`src/components/select.tsx`: a field showing the current choice that opens the options in a
bottom sheet), not a row of chips and not the platform picker wheel.

**Why:** chips don't scale past a handful of options and wrap unpredictably on small phones; the iOS picker is an
inline wheel that takes over the form. A dropdown stays one line tall and reads the same on both platforms. The
asset type started as chips and was changed on feedback.

**How to apply it:** pass `options` as `{value, label}` pairs derived from the shared constant (for example
`ASSET_TYPES` and its labels), so the list can't drift from what the server accepts.

## What we deliberately did not copy

- **Direct AsyncStorage use** (mobile-flashcards' `work-with-storage.ts` wraps it but stores everything there,
  unencrypted). Heartwood stores through `storage`.
- **Persisting the whole query cache** (Falcon), see Rule 9.
- **A mobile app that isn't linted** (Falcon) and **committed keystores** (Olamma), see Rules 11 and 15.
- **GraphQL and Django specifics** from Olamma (`gql()`, `@login_required` message matching): Heartwood's API is
  REST over Express.
