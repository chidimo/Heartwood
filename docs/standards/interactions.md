# Service & Repository Interaction Standard

This document defines how layers in `apps/backend/src` are allowed to talk to
each other: routes, services, and repositories. It exists because those
boundaries have drifted in several places (routes querying the database
directly, services reaching into another domain's repository, validation
logic scattered across route handlers). The rules below are the target state;
Heartwood starts greenfield, so there is no legacy code to migrate: follow
these rules from the first commit.

> **Provenance:** copied from the Concord repo, where the pattern was
> established. Code examples below still use Concord's domains (`expert`,
> `institution`, `lead`, ...) — read them as illustrations of the shape.
> Heartwood's equivalents are `asset`, `beneficiary`, `allocation`, `will`,
> etc. Swap the examples for real Heartwood ones as those modules land.

## The three layers

Each domain lives under `apps/backend/src/modules/<domain>/` (e.g. `asset`,
`beneficiary`, `allocation`, `will`, `user`) and
owns exactly two files for its data access:

- `<domain>.repository.ts` — the only place that talks to the database for
  that domain. A repository function takes the Kysely client as an explicit
  first argument (`db: DbClient`) — there is no request-scoped or ambient DB
  handle in this codebase, so this rule is about _which file_ runs the query,
  not about how the connection is threaded through.
- `<domain>.service.ts` — the only public entry point into that domain from
  the outside. Everything the domain exposes to the rest of the app is a
  function exported from here, also taking `db: DbClient` as its first
  argument.

Routes (`apps/backend/src/routes/*.ts`) are the HTTP layer: they parse a
request, call a service, and shape a response using the helpers in
`utils/response.ts` (`ok`, `created`, `noContent`, `notFound`, `badRequest`,
`forbidden`). They own no business logic.

```
route  ->  service (own domain)  ->  repository (own domain)  ->  database
```

## Rule 1 — A repository is private to its own service

No code outside `expert.service.ts` may import from `expert.repository.ts`.
The same holds for every domain. A repository file's exports are effectively
`private` to the service sitting next to it in the same folder.

**Why:** a repository is a thin, mechanical wrapper around SQL. It has no
opinion about authorization, validation, or what the data means to the rest
of the app — that reasoning belongs in the service. If two unrelated pieces
of code both import a repository directly, that reasoning either gets
duplicated at each call site or skipped entirely. Routing everything through
one service gives that domain exactly one place to enforce its own rules,
and one place to change when the underlying table changes shape.

**How to apply it:** if you're tempted to `import { ... } from
'../expert/expert.repository'` from anywhere other than `expert.service.ts`,
stop — you want `expert.service.ts` instead. If the service doesn't expose
what you need yet, add a function to it rather than reaching past it.

## Rule 2 — All database access lives in a `.repository.ts` file

No `db.selectFrom` / `insertInto` / `updateTable` / `deleteFrom` (Kysely's
query builder, imported from `@heartwood/database`) may appear
anywhere except inside a `.repository.ts` file. Not in a route, not in a
service, not in a shared utility.

**Why:** repositories are the seam between this app and Postgres. If a query
can appear inline in a route handler or a service function, there is no
single place to find "everything this domain does to the `expert` table," no
consistent place to apply the same status-log/audit-log conventions used
elsewhere (see `expert_status_log`, `request_status_log`, `match_status_log`),
and no way to unit-test the query logic separate from the HTTP plumbing
around it.

**How to apply it:** a service function does its work by calling one or more
repository functions and combining/interpreting the results. If a service
needs a new query shape, add a new repository function for it — even a
one-off, even if it feels like overkill for a single `where` clause. The
convention matters more than the line count it saves.

## Rule 3 — Cross-domain data access goes through the other domain's service

If `machine_recommendation.service.ts` needs something that lives in the
`institution` domain, it calls `institution.service.ts` — it does not import
`institution.repository.ts` directly, even though nothing technically stops
it. This already happens correctly in a couple of places today, e.g.
`machine_recommendation.service.ts` calling `getCollegesMap` from
`institution.service.ts`, and `lead-completion.service.ts` importing from
`institution.service.ts` rather than reaching into its repository.

**Why:** this is Rule 1 applied one level up. The whole point of a domain
owning its repository is that the domain's service is the only thing that
understands the full shape and meaning of its own data. A neighboring
service reaching past that boundary is exactly the coupling Rule 1 exists to
prevent, just with the "external" caller being backend code instead of a
route.

**How to apply it:** every domain must expose whatever its neighbors
legitimately need as a named service function — `getCollegesMap`,
`getActiveMatchByExpert`, and so on already exist as this kind of function on
their respective services. When a new cross-domain need comes up, add a
function to the _owning_ domain's service rather than importing its
repository from the caller's domain.

## Rule 4 — Validation and error handling live in the service, not the route

A route handler's job is: read the request, call exactly one service
function, translate the result into an HTTP response. It does not check
`typeof x !== 'string'`, does not decide that a missing field is a 400, and
does not decide that a missing record is a 404. Those are decisions about
what the data means, which is the service's job.

**Why:** the same validation and authorization rules should apply no matter
what triggers them — an HTTP request today, a background job or an internal
script tomorrow (several already exist under `scripts/`). If "a title is
required" or "you must own this record to edit it" is written as an `if`
statement in a route handler, that rule only exists for callers that go
through HTTP. Putting it in the service means it protects the domain
unconditionally.

**How to apply it:** a route's job is to coerce raw `req.body`/`req.query`
values into the types the service function's signature expects and to map
the result to an HTTP response with the helpers in `utils/response.ts`. A
route may still translate "service returned null" into `notFound(res)` —
that's response shaping, not business logic — but it should not itself decide
_whether_ a title is required, _whether_ a status transition is legal, or
_whether_ the caller is allowed to touch this particular record beyond the
coarse-grained `requirePermission(resource, action)` check. Those judgment
calls belong in the service function, which should reject bad input and
return a typed error result (or throw a `boom` error, per
`middleware/error-handler.ts`) rather than silently trusting its caller.
Right now several routes in this codebase do more of this inline than the
rule above allows — see `roadmap.md`; new code should follow the rule even
where old code doesn't yet.

## Rule 5 — List endpoints cap their page size at 100

Any repository function that returns a paginated list must clamp the
caller-supplied `limit` to a hard maximum of 100, regardless of what the
caller asks for. The pattern, from `expert.repository.ts` (the one place
this is currently done):

```ts
const maxLimit = 100;

export const listExperts = async (db: DbClient, options?: ExpertListOptions) => {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const effectiveLimit = Math.min(limit, maxLimit);
  // ...query uses effectiveLimit, never the raw `limit`...
};
```

**Why:** an unclamped `limit` means any caller — a route's query string, a
script, a future integration — can ask for the entire table in one response.
That's a real problem here specifically: `machine_recommendation`,
`institution`, `lead`, `match`, `meeting`, and `request` all currently
default to `limit ?? 10` with **no cap at all**, so `?limit=999999` returns
everything, unpaginated, in one query. `expert.repository.ts` is the only
domain that clamps today. This is also a standing roadmap item ("Build in
effective limits to all list endpoints (max default 100)") — this rule is
that item, written down so new list endpoints don't reintroduce the gap
while the existing ones get fixed.

**How to apply it:** every repository function that takes a `limit` option
clamps it with `Math.min(limit, 100)` (or a locally named `maxLimit`
constant, matching the existing style) before it ever reaches the query
builder — never pass the raw, caller-supplied `limit` to `.limit(...)`. This
applies whether the value comes from a route's `req.query.limit`, a script,
or anywhere else — the repository is the last line of defense regardless of
caller, consistent with Rule 2 (all DB access, including its limits, lives
in the repository).

## Rule 6 — Pagination always returns a total count, computed in the same query as the page

Every repository function that returns a paginated list must include
`total` (and `totalPages`), computed in the **same query** that fetches the
page — never a separate `count(*)` query run before or after it. Use
Kysely's window aggregate:

```ts
.select(({ fn }) => fn.countAll<string>().over().as('total'))
```

For a query built up through `.with()` CTEs, a sibling count CTE joined
unconditionally is a clean alternative:

```ts
.with('filteredCount', qb =>
  qb.selectFrom('filtered').select(({ fn }) => fn.countAll<string>().as('total'))
)
.selectFrom('filtered')
.innerJoin('filteredCount', join => join.onTrue())
.selectAll('filtered')
.select('filteredCount.total')
```

**Why:** every repository function in this codebase that returns a
paginated list currently runs the count as a second, separate query —
one `count(*)` before or after the `.limit()/.offset()` select, as two
independent round trips to Postgres. Under the default `READ COMMITTED`
isolation and with no transaction tying the two queries to the same
snapshot, a concurrent insert/update/delete between them can leave the
returned `total`/`totalPages` not matching the rows actually returned in
that same response. Computing the count as part of the same query
statement — a window aggregate, or a CTE joined into the same `SELECT` —
removes that gap entirely, since a single SQL statement is always
evaluated against one consistent snapshot, and it's one round trip
instead of two.

**How to apply it:** every list function in `expert.repository.ts`,
`request.repository.ts`, `institution.repository.ts`,
`match.repository.ts`, `lead.repository.ts`, `meeting.repository.ts`, and
`machine_recommendation.repository.ts` currently uses the separate-query
pattern — this rule is the target state for those; new list endpoints
should be written this way from the start rather than copying the
existing two-query shape, and existing ones move to it as they're
touched. One edge case to handle either way: `count(*) OVER()` returns no
row at all when the page comes back with zero matching rows, so
`total`/`totalPages` needs an explicit fallback for that case (e.g. a
cheap follow-up count query only when the page result is empty) rather
than assuming the window column is always present.

## Rule 7 — Server-side search uses trigram similarity, not `ILIKE`

A list endpoint's search filter matches against text using Postgres
trigram similarity (`pg_trgm`), not `ILIKE '%term%'`.

**Why:** `ILIKE` with a leading wildcard can't use a btree index — it
forces a sequential scan that gets slower as the table grows, with no way
to fix it short of changing the matching strategy. Trigram matching
supports a GIN index (`gin_trgm_ops`), tolerates typos (`starbuks`
matches `starbucks`), and ranks results by similarity score instead of
matching or not. Specifically, use **word similarity** (the `<%` operator,
the `word_similarity()` function) rather than whole-string similarity
(the `%` operator, `similarity()`): `similarity()` normalizes shared
trigrams over the union of trigrams in _both_ strings, so a short or
partial query against a longer stored value can score below the default
0.3 threshold and silently return zero rows — e.g. `"Store"` against
`"The Testing Store"` scores well under 0.3. `word_similarity()` instead
scores the query against the best-matching word window inside the stored
value, so partial, non-leading, and typo'd words still match. Both
operators use the same GIN trigram index, so this is a matching-strategy
choice, not an indexing tradeoff.

**How to apply it:** the `pg_trgm` extension is already installed
(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"` in
`db/migrations/000001_create_enums.up.sql`), so the index and operators
are available today. What's still needed before the first trigram-backed
search endpoint ships: `pg_trgm.word_similarity_threshold` defaults to
0.3, which is tuned for `similarity()`, not `word_similarity()` — a
migration setting it lower (e.g. `0.1`) at the role level for the
application's database roles is a prerequisite, since without it `<%`
inherits a threshold calibrated for the wrong operator and under-matches.
No such migration exists in this repo yet; add one alongside the first
endpoint that needs trigram search, rather than configuring the
threshold per query or per session. Word similarity is intentionally
more permissive and can surface near-miss word matches (e.g. `"group"`
↔ `"growth"`) — because results are ranked by `word_similarity` and
paginated, the best matches surface first, so this is an accepted
tradeoff rather than a bug to fix per query. Where exact-substring
precision matters more than typo tolerance for a specific column, `LIKE`
against `lower(col)` is an acceptable alternative — it remains servable
by the same GIN trigram index.

## What this looks like end to end

```ts
// routes/experts.ts
router.get('/:id', requirePermission('expert', 'read'), async (req, res, next) => {
  try {
    const expert = await getExpert(db, req.params.id as string);
    if (!expert) return notFound(res);
    ok(res, expert);
  } catch (err) {
    next(err);
  }
});
```

```ts
// modules/expert/expert.service.ts
export const getExpert = async (db: DbClient, expertId: string) => {
  const expert = await getExpertById(db, expertId);
  if (!expert) return null;

  const capabilities = await getExpertCapabilities(db, expertId);
  return { ...expert, capabilities };
};
```

`getExpert` (in `expert.service.ts`) is responsible for deciding what "an
expert" means for the rest of the app — in this case, joining in its
capabilities — and for calling `expert.repository.ts` (`getExpertById`,
`getExpertCapabilities`) to fetch the data. If it needed something from
another domain, e.g. the expert's institution, it would call that domain's
service (`institution.service.ts`), never `institution.repository.ts`.
Nothing outside `expert.service.ts` imports `expert.repository.ts`.
