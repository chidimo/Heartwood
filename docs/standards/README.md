# Standards

The conventions we hold **new and changed code** to. Heartwood is greenfield, so this is the bar from the
first commit, not a cleanup target. Copied from the Concord repo (same stack) and Olamma, then adapted.

## Format

One file per topic. Each file:

1. Opens with a short paragraph on **why the doc exists**, usually a concrete bug or recurring friction.
2. Then a series of **`## Rule N — <one-line statement>`** sections, each with the rule, **Why:** (the failure
   it prevents), and **How to apply it:** (steps, commands, or code shape).

Keep rules few and real. A rule earns its place by having already cost someone something. Several of the
ones below are inherited: they cost us in Concord or Olamma, and we are not re-paying.

## Current standards

| File                               | Covers                                                                                                | Source                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------- |
| [formatting.md](formatting.md)     | `yarn format` before committing; formatting passes get their own commit                               | Concord                           |
| [migrations.md](migrations.md)     | Each migration is its own atomic unit; no `BEGIN`/`COMMIT` in files; immutable once applied           | Concord                           |
| [interactions.md](interactions.md) | route → service → repository layering; a repository is private to its service                         | Concord                           |
| [transactions.md](transactions.md) | When to use a transaction; keeping reads and writes separable                                         | Concord                           |
| [frontend.md](frontend.md)         | Mutations toast on success and failure; handle `isPending`/`isError`; `handle*` handler names         | Both                              |
| [mobile.md](mobile.md)             | Expo conventions: storage, notify, `cn`, `QueryState`, `apiFetch`, idempotency keys, permissions, EAS | Olamma, Falcon, mobile-flashcards |
| [security.md](security.md)         | Data minimisation, no sensitive logging, owner-scoped access, secrets, audit trail                    | New                               |
| [plans.md](plans.md)               | Checklist plan docs in `docs/plans/`; `~` when done; roadmap table; plans name their open questions   | Both                              |

Add a row here whenever you add a file.

## Not yet written (expected as we build)

- **Money and shares.** How allocation percentages are stored and validated so shares can't drift past 100%.
