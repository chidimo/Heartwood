# Security and Data Minimisation Standard

Heartwood holds a map of someone's wealth and who they want to give it to. A leak is a safety risk for the
person and their family, not just a privacy incident. The Nigeria Data Protection Act applies (hosting and
compliance questions are open: Q10). These rules apply from the first asset model.

## Rule 1 — Store the least that does the job

Never store account numbers, card numbers, BVN/NIN, passport numbers, passwords for other services, or
anything that would let a stranger move or claim an asset. An asset is a type, a description, the institution
or location by name, an optional rough value, and notes. "GTBank savings account, opened in Surulere" is
enough for an executor to start from.

**Why:** the lawyer and executor need to know what exists and where, not to access it. Fields we never
collect can't leak.

**How to apply it:**

- Don't add a column that holds an identifier for a financial account or a government ID. If a feature seems to
  need one, raise it as an open question first (Q9) instead of adding the column.
- Free-text fields (`description`, `notes`) are the leak path: say so in the UI next to the field ("Don't enter
  account numbers or PINs") and cap their length.

## Rule 2 — Never log asset, beneficiary, or will content

Logs, error reports and analytics events may carry IDs, status codes and timings. They must not carry asset
descriptions, beneficiary names, relationships, notes, values, or the text of a will.

**Why:** logs are copied, shipped to third parties and retained far longer than the database row.

**How to apply it:**

- Log the ID (`asset 7f3…`), never the object. Don't `console.log(req.body)` on authenticated routes.
- The error handler returns `err.message`; make sure messages thrown by validation name the field, not its value.
- Any error-tracking or session-replay tool added later (Concord uses Sentry and LogRocket) must mask inputs
  by default and scrub request bodies before it ships. Add it only with its own plan.

## Rule 3 — Every route is authenticated and scoped to the owner

A testator can read and write only their own inventory, beneficiaries and drafts. Ownership is checked in the
service layer on every read and write, not assumed from the URL.

**Why:** an ID in a URL is guessable. "Get asset by id" without an owner check is the classic way one user
reads another's estate.

**How to apply it:**

- Service functions take the acting user's ID and include it in the query (`where owner_id = $1`), so a wrong
  ID returns "not found", not someone else's row. See [interactions.md](interactions.md).
- Return 404, not 403, for another user's record.
- Use UUID primary keys ([migrations.md](migrations.md) §4), never sequential integers, in anything exposed.
- Add a test per resource that a second user can't read or change the first user's record.

## Rule 4 — Secrets stay out of the repo and the client

Real secrets live in the environment of the process that needs them. `.env` files are gitignored; commit only
`.env.example` with placeholder values. Nothing in `apps/web` or `apps/mobile` may hold a secret: `VITE_*` and
`EXPO_PUBLIC_*` values are readable by anyone with the app.

**Why:** a committed key has to be treated as leaked forever, even if the commit is reverted.

**How to apply it:** before committing, check `git diff --cached` for keys and connection strings. Tokens that
must persist on a phone go in secure storage (see [mobile.md](mobile.md)).

## Rule 5 — Changes to a will or inventory are recorded

Every create, update and delete on assets, beneficiaries, allocations and will drafts records who did it and
when, and deletes are soft (a `deleted_at` and `deleted_by`, not a removed row) until a retention rule says
otherwise.

**Why:** the will is the source of truth, and a dispute after death turns on what was said and when. An
untraceable edit to the inventory is the dispute we exist to prevent.

**How to apply it:** a plan for the first asset table must include its audit columns or log table. Don't ship
the table without them and add them later.
