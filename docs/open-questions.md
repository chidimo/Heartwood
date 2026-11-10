# Open Questions

The single place for decisions we haven't made yet. Surface a question here the moment it comes up, answer it
here when it's decided, and link it from any plan or code that depends on it.

Started 2026-11-10 from [exploration.md](exploration.md) §9, plus questions the first scaffolding turned up.

## How this works

- **IDs are permanent** (`Q1`, `Q2`, …). Never renumber or reuse one; plans and commits refer to them.
- **Add** a question at the bottom of the Open table: next ID, one-sentence question, who can answer it, and what
  it blocks. If you're guessing a default in the meantime, write it in the _Working assumption_ column so it is
  visible rather than silent.
- **Answer** by moving the row to the Answered section: fill in the decision, the date, and who decided or
  what the source was (a lawyer's name, a link, "decided in chat"). Keep the original question text.
- **Update dependents** in the same commit: any plan whose header says `Open questions: Qn` (see
  [standards/plans.md](standards/plans.md) Rule 5).
- **Legal questions** are never closed on our own say-so. Mark them answered only with a named source (a
  Nigerian probate lawyer, a statute); until then the working assumption stands and the row stays Open.
- Reviewed at the top of every planning session. Anything that has sat open past the thing it blocks gets
  escalated in [roadmap.md](roadmap.md).

**Who can answer:** `lawyer` = needs a Nigerian probate lawyer · `us` = a product or engineering decision ·
`test` = needs real users to tell us.

## Open

| ID  | Question                                                                                                                                    | Who    | Blocks                                | Working assumption (until answered)                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Q1  | Which state(s) do we target first? Wills legislation varies by state (Lagos has its own Wills Law).                                         | lawyer | Draft will template, legal copy       | Lagos only                                                                                  |
| Q2  | Are fully digital wills recognised, and what execution process (signing, witnessing) is acceptable?                                         | lawyer | Draft will export, any e-sign feature | Not recognised: the app produces a document that is signed and witnessed on paper           |
| Q3  | How are lawyers sourced and vetted: open marketplace or a small in-house panel? Who handles conflicts of interest?                          | us     | Lawyer review flow, pricing           | Small hand-picked panel; no marketplace in MVP                                              |
| Q4  | Pricing model: one-off fee, subscription, or per-review? Does a flat fee for review and execution beat hourly billing?                      | us     | Lawyer onboarding, billing            | Flat fee for review; nothing built for billing in MVP                                       |
| Q5  | How do we handle families under customary or Islamic law in the allocation engine (limits on who can receive what)?                         | lawyer | Allocation validation rules           | Flag affected assets for lawyer review; do not block or auto-correct                        |
| Q6  | Who is the first user group to test with?                                                                                                   | test   | MVP scope, onboarding copy            | None yet                                                                                    |
| Q7  | Death trigger: who confirms a death and releases instructions, and what proof is needed? What, if anything, does the app do at that point?  | lawyer | Executor/lawyer role, notifications   | Executor or lawyer initiates with a death certificate; nothing automatic                    |
| Q8  | Are the name, domain, social handles and Nigerian trademark for "Heartwood" available?                                                      | us     | Public launch                         | Keep working name; not a blocker for building                                               |
| Q9  | Exactly what data do we store per asset, and how is it protected? (Exploration says institution plus a hint, never account numbers.)        | us     | First asset model, security standard  | Type, description, institution name, optional rough value, notes; no account numbers or IDs |
| Q10 | Where do we host, and what does the Nigeria Data Protection Act require of us (registration, data-processing terms, cross-border transfer)? | lawyer | Deployment, privacy policy            | Pick a provider with Nigeria-friendly latency; revisit before holding any real user data    |
| Q11 | How do testators sign in: email and password, phone OTP, or both? Nigerian users are often phone-first.                                     | us     | Auth module                           | Email and password to start; add phone OTP later                                            |
| Q12 | Does the MVP have executor and lawyer logins in the app, or is the output only an exported draft handed over offline?                       | us     | Roles, RBAC, scope of "lawyer review" | Export only; no lawyer or executor accounts in MVP                                          |
| Q13 | How often do we prompt a user to review a stale inventory, and over what channel?                                                           | us     | Notifications                         | Yearly email prompt; revisit after first users                                              |
| Q14 | Web only for the MVP, or do we also need the mobile app (Olamma has an Expo app we could reuse patterns from)?                              | us     | Repo layout (`apps/mobile`)           | Web only; no `apps/mobile` until Q6 says users need it                                      |

## Answered

| ID  | Question                             | Decision                                                                                                                                                  | Date       | Source          |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------- |
| Q0  | What stack and repo shape do we use? | Same stack as Concord (Nx + Yarn monorepo, Node/Express, Kysely/Postgres, React/Vite/TanStack, Zod); same `docs/` layout for roadmap, plans and standards | 2026-11-10 | Decided in chat |
