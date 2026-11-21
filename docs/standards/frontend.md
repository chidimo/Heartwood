# Frontend Standard

This document defines conventions for `apps/web/src`. It started with one rule;
more get added here as they come up, following the same "rule + why + how to
apply" format as `docs/standards/interactions.md`.

## Rule 1 — Every mutation shows both a success and a failure notification

Every `useMutation` call site must show the user a [Sonner](https://sonner.emilkowal.ski/)
toast (`toast.success(...)` / `toast.error(...)`) on both outcomes — not just
one. `<Toaster richColors position="top-right" />` is mounted once at the app
root (`main.tsx`), above both the authenticated and public shells, so any
component can call `toast.success`/`toast.error` directly without further
setup.

**Why:** for a long stretch of this app's history, mutations used
`onSuccess:` for cache invalidation but never `onError:` at all — a failed
save, delete, or send didn't just fail quietly, it looked identical to
success from the user's side, since nothing changed on screen either way.
Requiring both outcomes to always produce a visible notification removes
that entire class of bug going forward, rather than relying on each new
call site's author to remember to add error handling.

**How to apply it:**

- Put the `toast.success`/`toast.error` calls in the **component** that calls
  `.mutate(...)`, not inside the shared hook in `hooks/*.ts`. Hooks own data
  fetching and cache invalidation only; the calling component owns what the
  user sees, since the right wording ("Meeting note added." vs. a generic
  "Saved.") and what else should happen on success (closing a dialog,
  navigating, clearing a draft) are specific to that call site, not the hook.
- For the error message, use `getErrorMessage(error, fallback)` from
  `api/client.ts` — it pulls a message out of the backend's real error
  payload shape and falls back to your caller-supplied string for a true
  network failure (where the raw axios message would otherwise leak through
  as something unhelpful like "Network Error").
- A toast is additive, not a replacement for existing inline, contextual
  error text (e.g. a dialog that says "An expert with this email already
  exists" right next to the field it concerns) — keep that, and add the
  toast alongside it. The toast is the guaranteed baseline every mutation
  gets; inline copy is extra clarity where it's already been written.
- If a dialog closes and/or calls a caller-supplied `onSuccess` callback on
  completion, that must happen inside the mutation's real `onSuccess`, never
  fired synchronously right after calling `.mutate(...)` — otherwise a
  failure is masked by a dialog that already closed and a caller that
  already believes the action succeeded.

```tsx
// components/some-dialog.tsx
import { toast } from 'sonner';
import { getErrorMessage } from '../api/client';
import { useDoTheThing } from '../hooks/use-thing';

const doThing = useDoTheThing();

const handleSubmit = () => {
  doThing.mutate(payload, {
    onSuccess: () => {
      setIsOpen(false);
      toast.success('Thing done.');
    },
    onError: error => {
      toast.error(getErrorMessage(error, 'Failed to do the thing.'));
    },
  });
};
```

## Rule 2 — Every `useQuery`/`useMutation` call site handles `isPending` and `isError`

Every component that calls a query or mutation hook must do something with
`isPending` (render a loading state, or disable a submit control) and
`isError`/`error` (show that the request failed) — not render as if the request
always already has data and always succeeds.

**Why:** a page that does `const total = data?.total ?? 0` with no loading or
error branch renders the same "0" while the query is pending, after it fails,
and when the real answer is zero. For Heartwood this matters more than most
apps: an empty or zeroed asset inventory that is really a failed request could
lead someone to believe their estate is less organised than it is — or worse,
to sign off on a will built from incomplete data.

**How to apply it:**

- Query: destructure `isPending` and `isError` alongside `data`; show a
  skeleton while pending, and an error state (or degraded UI) on error, instead
  of letting `?? {}` / `?? 0` fallbacks render a fake-looking result.
- Mutation: use `isPending` to disable the submit control or show a spinner
  while in flight. Its error is covered by Rule 1's toast, but never act as
  though `mutateAsync` always resolves.
- Prefer `isPending` over `isLoading` for queries (TanStack Query v5:
  `isPending` = no data yet; `isLoading` = `isPending && isFetching`).

## Rule 3 — Name event handlers `handle*`, don't inline them

An event handler passed to a prop (`onClick`, `onSubmit`, `onChange`) should be
a named `const handle* = (...) => {...}` declared in the component body, not an
arrow function written inline in the JSX, whenever the logic is more than a
one-line passthrough.

**Why:** an inline `onClick={() => { doThing(); doOtherThing(); }}` buries what
the handler does inside the JSX tree; a named `handleDoThing` is easy to scan
for and to reference from a test or another handler.

**How to apply it:**

- Pull multi-statement bodies out above the `return` and pass the name.
- A trivial one-liner (`onClick={() => setOpen(true)}`, `onClick={onClose}`)
  doesn't need pulling out.
- Name it for what it does, not the event: `handleAddBeneficiary`, not
  `handleClick`.
