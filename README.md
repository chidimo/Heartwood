# Heartwood

Helps ordinary people in Nigeria list what they own, say who should get it, and reach a valid, lawyer-reviewed will. Working name; see [open question Q8](docs/open-questions.md).

The app is not what makes a transfer legal. A valid will is. Heartwood never holds assets: it holds an organised inventory and instructions, and a lawyer produces and carries out the will.

**Status:** scaffolded, no product features yet. See [the roadmap](docs/roadmap.md).

## Where things are

| Path                                             | What                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| [docs/exploration.md](docs/exploration.md)       | The original idea, legal framing, hard problems and MVP scope      |
| [docs/roadmap.md](docs/roadmap.md)               | What to build next, in order, plus a table of every plan           |
| [docs/open-questions.md](docs/open-questions.md) | Decisions not yet made: add, answer and link them as we go         |
| [docs/plans/](docs/plans/)                       | Checklist plan docs, one per piece of work                         |
| [docs/standards/](docs/standards/README.md)      | Rules for layering, transactions, migrations, formatting, frontend |
| [CLAUDE.md](CLAUDE.md)                           | Project rules and the git branching workflow                       |
| `.claude/skills/`                                | `mark-plan-done`, `verify`, `new-migration` (copied from Concord)  |

## Layout (target)

```
apps/
  backend/     Express API (not yet created)
  web/         React + Vite app (not yet created)
packages/
  database/    Kysely client, generated types (not yet created)
  shared/      Zod schemas and types shared by apps (not yet created)
```

Stack is the same as [Concord](../Concord): Nx + Yarn 1, Node 22, TypeScript, Express, Kysely + Postgres, React + Vite + TanStack, Zod. Package scope is `@heartwood/*`.

## Provenance

`docs/standards/`, the skills, and the root config were copied from Concord and adapted. The plan-doc format and roadmap "All plans" table, the `CLAUDE.md` rules and the git workflow came from Olamma. Olamma is Django and Expo, so its Python- and mobile-specific material was left out.
