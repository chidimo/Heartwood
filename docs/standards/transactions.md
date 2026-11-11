# Transaction & Read/Write Connection Standard

> **Provenance:** copied from the Concord repo. Examples use Concord's domains
> (`lead`, `expert`, `institution`); the rules are what carry over. Swap in
> Heartwood examples (e.g. saving a will with its allocations) as they land.

This document defines when and how backend code must use a database
transaction, and how repositories and services should be shaped so that
routing reads to a future read replica is a connection-wiring change later,
not a rewrite of every repository. It assumes
[`standards/interactions.md`](interactions.md) — read that first if you
haven't; this document doesn't repeat the route/service/repository
boundary rules, only what's specific to transactions and connections.

## The mechanism: `Transaction<DB>` is a `Kysely<DB>`

Kysely's `Transaction<DB>` class extends `Kysely<DB>` — it exposes the exact
same query-builder surface (`selectFrom`, `insertInto`, `updateTable`,
`deleteFrom`, ...). That means a repository function typed the normal way:

```ts
export const createSupportRequest = async (db: DbClient, params: ...) => { ... }
```

already accepts a transaction with zero changes, because `DbClient` is
`Kysely<DB>` (defined in `packages/database/src/index.ts`) and a
`Transaction<DB>` satisfies that type. Every repository in this codebase
takes `db` as its first, explicit parameter per `interactions.md`'s Rule 2
— including functions whose primary data isn't naturally shaped as a
`db`-first call (an upsert keyed by a bag of insert values, say): those
still take `db` first, never bundle a `dbTransaction` field into the data
params object. A handful of write functions also accept an optional
`transaction?: DbTransaction` as their _last_ parameter, for the rare case
where a caller has a base `db` in scope but wants a specific call to join a
different, already-open transaction — `const db = transaction ?? dbc;`
internally. Prefer just passing `trx` directly as the leading `db` argument
when you have one in hand (the common case, shown below); reach for the
trailing `transaction` parameter only where a function's own primary
argument isn't `db` and you still need both a default connection and an
override, e.g. `upsertCollegeStrengths(db, institutionId, capabilityIds,
transaction?)` in `institution.repository.ts`.

Concretely: a transaction is just a different value passed as `db`.

```ts
const result = await db.transaction().execute(async trx => {
  const request = await createSupportRequest(trx, { ... });
  await createSupportRequestCapabilities(trx, request.id, capabilityIds);
  return request;
});
```

`completeLead` in `modules/lead/lead-completion.service.ts` already does
exactly this — five dependent writes (upsert the college, upsert the lead,
store the college's capability strengths, create the nominated experts,
create the support request) all threaded through the same `trx` — treat it
as the reference example.

## Rule 1 — Only a service opens a transaction

A repository function never calls `.transaction()` on the client it's
given. Repository functions execute exactly one logical operation each;
deciding that _several_ of those operations must succeed or fail together
is business logic, and business logic lives in services (per
`interactions.md`). A repository that opened its own transaction would also
make it impossible for a service to compose it into a _larger_ transaction
alongside other calls.

## Rule 2 — Wrap a transaction around every multi-step write

If a service function makes more than one write (insert/update/delete) that
only makes sense together — the second write depends on the first having
succeeded, or leaves the data model inconsistent if it doesn't also happen —
those writes must run inside one `db.transaction().execute(...)` block, with
every repository call inside it using the `trx` the callback receives, not
the outer `db`.

This is not a style preference; it fixes a real bug class. Five functions
in this codebase used to run their writes as separate, untransacted calls —
`request.service.ts`'s `createNewSupportRequest` (created the
`support_request` row, then separately called
`createSupportRequestCapabilities`), `expert.service.ts`'s
`createNewExpertWithInvite` and `updateExpertWithProfile` (each created or
updated the expert, then separately called `saveProfile`),
`expert.service.ts`'s `updateExpertCapabilitiesList` (called
`replaceExpertCapabilities`, which itself does a `deleteFrom` immediately
followed by an `insertInto` — one repository function containing two
dependent writes, called with the plain `db` rather than a `trx`; the
failure mode was worse than the others, since a failed insert after a
successful delete left the expert with zero capabilities, not just stale
ones), and `user.service.ts`'s `loginUser` (updated `last_login_at`, then
separately stored the new refresh token — lower stakes than the others
since a failed second write just meant the user got an error despite the
first write landing, not silent data loss, but the same shape) — all five
now wrap their writes in `db.transaction().execute(...)` per this rule;
treat them as reference examples alongside `completeLead` above. Note the
`updateExpertCapabilitiesList` shape specifically: a
repository function can itself contain multiple dependent writes, and
since Rule 1 forbids a repository from opening its own transaction, the
_caller_ still has to open one and pass `trx` through, even when it looks
like "just one call" from the service's point of view. Watch for this same
shape reappearing in new multi-step-write functions, on either side of the
service/repository line.

## Rule 3 — A read that a subsequent write in the same request depends on belongs in that write's transaction

If a service reads something specifically to decide what to write next
(check the current status before transitioning it, check a count before
inserting one more, etc.), that read should happen with the same `trx` the
write will use, not with the outer `db` beforehand. Reading outside the
transaction and writing inside it leaves a window where another request
could act on the same row between the check and the write — the check
stops meaning anything under real concurrency.

`expert.service.ts`'s `completeExpertRegistration` used to get this wrong:
`findExpertByToken` read the expert and its `status` _before_ the
transaction started, and that `status` was used to compute `shouldActivate`
(whether the later write should also flip the expert to `ACTIVE`) — but the
write that decision fed happened inside a transaction opened afterward, so a
status change landing in the gap between the read and the transaction start
would have gone uncaught. The fix: `findExpertByToken` still runs first (it
only validates the token and 400s if it's missing, which doesn't need a
transaction), but `shouldActivate` is now computed from a fresh
`getExpertById(trx, ...)` read taken inside the transaction, immediately
before the write it feeds — not from the outer read. That's the general
pattern: a read used purely to validate/authorize before anything happens
can stay outside the transaction; a read whose _value_ a specific write
depends on has to be re-taken with the same `trx` as that write.

`services/machine.learning.service.ts`'s `generateRecommendations` had the
same shape: it looked up every non-deleted expert's email (to map the
matching service's `expert_email` strings back to `expert_id`s) with the
plain `db`, before the transaction that inserts the recommendations using
that lookup opened. The fix was the same move — the expert lookup now runs
with `trx`, inside the transaction, immediately before the insert loop that
depends on it. This function is also the reference example for Rule 4
below (it correctly does _not_ hold a transaction open across the earlier
external HTTP call) — the two rules aren't in tension: the read that needed
to move inside the transaction was the one right next to the writes it
feeds, not the earlier external call.

This does **not** mean every read needs a transaction — see Rule 4 for the
much more common case of a read with no dependent write, or with a write
that genuinely can't share a transaction with it.

## Rule 4 — A plain read stays a plain read, and a transaction never spans a slow external call

A repository/service call that only reads, with no write depending on its
result in the same request, does not need a transaction. Wrapping it in one
buys nothing (there's nothing to roll back) and actively works against
Rule 5 below.

The stronger version of this rule: **never hold a transaction open across a
network call to something outside Postgres.** `services/machine.learning.service.ts`'s
`generateRecommendations` is the concrete example already in this codebase
that gets this right — it writes a `recommendation_run` row, then calls out
to the external matching service over HTTP, and only _after_ that response
comes back does it open `db.transaction().execute(...)` for the writes that
actually depend on the result (soft-deleting stale recommendations, then
creating the new ones). If that whole sequence were wrapped in one
transaction, the transaction — and the connection it holds — would sit open
for however long the matching service takes to respond, which is exactly
the kind of connection-pool pressure this document exists to avoid.
`request.service.ts`'s `generateRecommendationsForRequest`, which calls it,
reads the support request first purely to decide whether to proceed at all
(and to build the text sent to the matching service) — that read has no
write depending on its specific value, so it stays a plain, untransacted
read too.

## Rule 5 — Read/write connection separation, for the read-replica future

There is one physical database today (`packages/database/src/db.ts` builds
a single `Kysely<DB>` over one `pg.Pool` from `DATABASE_URL`); this rule is
about not painting ourselves into a corner for when there's a primary +
replica(s).

Concord is not currently in the position the "every request runs inside a
transaction" version of this problem describes — there is no
request-scoped middleware wrapping every request in a transaction, and no
session-scoped Postgres state (e.g. an RLS context variable) that would
force one. That means there's nothing today actively blocking a future
read/write split. Keeping it that way is what this rule asks for:

1. **Don't introduce a request-scoped transaction wrapper or session-scoped
   Postgres state as a shortcut for something else** (auditing, tenant
   scoping, whatever it might be) without accounting for the fact that a
   transaction is bound to one connection for its whole duration — if every
   request ends up inside one, there's no way to ever route a read-only
   request's query to a different connection (a replica) than a write
   request's.
2. **Repository functions must keep taking `db: DbClient` as a plain
   parameter, never importing a connection themselves** (`interactions.md`
   Rule 2 already requires this for other reasons, and every repository in
   this codebase already follows it). This is what makes an eventual split
   possible: once a replica exists, the _route_ layer can decide, per
   request, whether to hand a repository function a write-pool connection
   or a read-replica-pool connection — the repository function itself
   doesn't change at all, because it never assumed which one it would get.

Until a replica actually exists, there is nothing to route reads _to_ — the
concrete, actionable requirement today is just: don't add anything that
would make that decision harder later, and don't wrap a read in a
transaction it doesn't need per Rule 4 — every unnecessary transaction is
one more read that would be tied to the primary for no reason once a
replica exists.

## What this looks like end to end

```ts
// modules/lead/lead.service.ts
export const completeLead = async (
  db: DbClient,
  input: LeadCompletionInput
): Promise<LeadCompletionResult> => {
  return await db.transaction().execute(async trx => {
    // 1. Upsert college (find by name or create)
    const collegeName = input.institution_name.trim();
    const existing = await findCollegeByName(trx, collegeName);
    const institutionId = existing
      ? existing.id
      : (await createNewCollege(trx, { name: collegeName }))!.id;

    // 2. Create or update the lead (upsert by email) - trx passed as the
    // leading db argument, same as every other call in this transaction
    const lead = await upsertLead(trx, {
      institution_id: institutionId,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      email: input.email.trim(),
      is_primary: true,
    });

    // 3. Store capabilities as college strengths
    await updateCollegeStrengths(trx, institutionId, input.capability_ids ?? []);

    // 4-5. Create nominated experts and a support request, both linked to
    // the lead/college created above — omitted here, same shape.

    return { institution_id: institutionId, lead_id: lead!.id /* ... */ };
  });
};
```

Every write in this sequence depends on the ones before it (the lead needs
the college's id; the support request needs the lead's id) and the whole
thing should roll back together if any step fails — which is exactly what
Rule 2 asks for, achieved here by threading `trx` through every call
instead of the outer `db`, including `updateCollegeStrengths` and
`upsertLead` — both take `db` as a normal leading parameter like everything
else, so `trx` slots in the same way it does for `findCollegeByName` or
`createNewCollege` above.
