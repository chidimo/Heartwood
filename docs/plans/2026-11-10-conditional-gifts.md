# Conditional gifts

Created: 2026-11-10

Status: Planning — nothing built. Needs decisions (below) and legal input (Q18) before the checklist starts.

Owner: Chidi Orji <orjichidi95@gmail.com>

Roadmap link: [`docs/roadmap.md`](../roadmap.md) §3

Open questions: Q18 (what is enforceable), Q19 (date of birth), Q20 (what v1 covers)

## Objective

Let a testator attach conditions to a gift, for example "my son receives this when he turns 25", "my daughter's share is held until she finishes university", and say what happens if the condition is never met.

## How this document is used

Checklist, not a narrative. Nothing below is built; the checklist is the proposed order once the decisions are made.

## Findings (verified 2026-11-10)

- Today an allocation is `asset × beneficiary` with a share or a specific bequest (`allocation` table). It has no condition, no deadline and no holder. A gift passes to the beneficiary outright.
- A condition is not a small field. If a gift can't pass yet, **someone has to hold the asset until it can**, and the will has to say what happens if the condition fails. A will that says "when he is 25" with no holder and no fallback creates exactly the dispute this product exists to prevent.
- A person's age can only be checked if we know their date of birth. We don't store one, and it is third-party personal data about someone who hasn't agreed to it ([security.md](../standards/security.md) Rule 1).
- Which conditions a Nigerian court will enforce is a legal question. Conditions in restraint of marriage or about religion, indefinite holding periods and gifts to minors are all areas where a lawyer's answer decides what we may offer. We must not offer a condition we can't back.

## Proposed model (to confirm)

A condition lives on the **gift** (an allocation row, and the same on residuary shares), not on the person, so "Ada gets the flat at 25 but the car now" works. The app can later offer "apply to all of Ada's gifts" as a shortcut.

| Part          | Proposal                                                                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kind          | A closed list, like organisation types: `min_age` (attains N years), `milestone` (free-text, e.g. "graduates from university"), `survives` (outlives the testator by N days), `other` (free text for the lawyer to word) |
| Deadline      | Optional: a date or an age after which the condition counts as unmet                                                                                                                                                     |
| If unmet      | Required: `redistribute` among the other beneficiaries, `named_beneficiary`, or `residuary`                                                                                                                              |
| Holder        | Required while a condition is open: who holds the asset until it is met (an executor, a lawyer or a named person; a contact record, as today)                                                                            |
| Date of birth | Optional on a person, only needed for `min_age`; see Q19                                                                                                                                                                 |

Validation rules to add, in the same style as the existing ones:

- A gift with a condition needs an "if unmet" plan and a holder, or the review reports an error (`gift_condition_incomplete`).
- `min_age` needs the beneficiary's date of birth, or the review warns that the age can't be checked.
- A gift to someone already under 18 with no condition and no holder gets a warning: a minor can't take property directly (to confirm in Q18).
- Shares still total exactly 100% per asset. An unmet condition moves a share by the "if unmet" plan; it never changes the total.

## Open design decisions (yours)

- **v1 scope (Q20).** Smallest useful set: `min_age` and one free-text `other`, always with an "if unmet" plan and a holder. Milestones, deadlines and "survives me" can come after the lawyer has weighed in.
- **Per gift or per person.** Proposed: per gift, with a per-person shortcut later.
- **Date of birth (Q19).** Store an optional date of birth, or ask the testator to type the age at which the gift passes and skip the check?

## Checklist (proposed, not started)

- [ ] Get Q18 answered (or agree an interim working assumption with the lawyer)
- [ ] Migration: condition columns (or a `gift_condition` table) with DB checks; optional `date_of_birth` on beneficiary (Q19)
- [ ] Shared schema and `allocationProblem` extension; API accepts a condition per entry
- [ ] Review rules above, with tests including direct-insert constraint checks
- [ ] Mobile: condition editor in the allocation screen (kind, age or text, if unmet, holder); Review issues name the gift
- [ ] Draft will export wording for conditional gifts (blocked on the draft export itself and on Q18)
