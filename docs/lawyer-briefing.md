# Heartwood: briefing for a probate lawyer

Written 2026-11-11. For a lawyer who is being shown the working prototype and asked whether the idea is sound.

## The idea in three sentences

Most people in Nigeria die without a will, and those who do write one often leave a muddle: assets nobody can
find, gifts that don't add up, no plan for who inherits if a beneficiary dies first. Heartwood helps an ordinary
person list what they own, say who should get it and under what conditions, and see what is missing, so that
they arrive at a lawyer with a clear, complete set of instructions. **The signed, witnessed will is the legal
document. The app never holds assets, never decides who inherits, and does not produce a legally valid will.**

## What the prototype does today

A person can sign up and then:

- **List assets.** Property, vehicles, cash and bank, business shares, digital assets, other. Each has a
  description, where it is held (by name only), a rough value in naira, dollars, pounds or euros, and notes
  (for example "title deed is with the family lawyer"). Any run of ten or more digits is refused, so account
  numbers cannot be entered.
- **List beneficiaries.** People (with relationship and, optionally, date of birth) and organisations
  (churches, mosques, missions, hospitals, schools, charities and so on). An organisation can be picked from a
  shared list or typed in.
- **Name executors, lawyers and priests.** These are contact records, not accounts.
- **Say who gets what.** Each asset is split by percentage between chosen beneficiaries (the total must be
  exactly 100%) or given as one specific bequest in words. Anything not given away goes to a separate
  "everything else" (residuary) split.
- **Attach conditions to a gift.** The recipient reaches an age, marries, finishes their education, completes
  NYSC, outlives the testator by a number of days, or a free-text condition. Every condition must name who holds
  the asset until it is met and what happens if it never is (share it among the others, give it to a named
  person, or add it to the residuary).
- **Say what happens if a beneficiary dies first.** Share it among the others, pass it to their children
  (people only), or give it to a named person. Not choosing is flagged.
- **Review.** A checklist of problems and gaps: assets nothing covers, beneficiaries with no plan for their own
  death, gifts to minors with no condition, an age condition with no date of birth to check it against.

It runs as a web app and a phone app. Data is private to each account and every change is recorded in an audit
trail.

## What it does not do yet

- **The draft will is a first cut.** It is built from the person's instructions as two separate documents, the will and
  notes for you, each shown as a PDF and downloadable as PDF or Word (on the phone it is shared as text). Every
  page of the PDF carries a Heartwood watermark and a reference code from its exact words, so you can check a
  copy against the app's own. The code marks where a copy came from; it is not a signature. Every standard clause is a plain
  placeholder and the signing block asserts no formalities, so it needs your wording (Q24) and your answers to
  Q1 and Q2 below. It is marked on every copy as not a valid will.
- No e-signing, witnessing or notarisation, and no lawyer or executor logins. Handover to a lawyer is by
  showing or exporting the information.
- Nothing happens on death: no notifications and no release of instructions.
- It is not deployed. The prototype runs on a developer machine, so a demonstration is in person or by screen
  share, or from a recording.
- The phone app has been tested automatically but has not been checked on a real device since its latest
  changes.
- Legal copy, terms of use and a privacy policy are not written.

## What we store, and what we deliberately do not

We keep the minimum: asset type, description, the institution's name, an optional rough value and notes;
beneficiary names and contact details the person chooses to give; the optional dates of birth. We refuse account
numbers and similar identifiers, and asset details are never written to logs. Whether even this is acceptable
under the Nigeria Data Protection Act is Q10.

## Demonstration

A sample person, "Seeded Tester", has a full inventory: 16 assets in three currencies, about 35 beneficiaries (people
and organisations), five executors, lawyers and priests, gifts carrying each kind of condition, and a residuary.
The names are invented. The shared list of organisations is a short starter list written by hand (names, kind,
state and city only) and has not been verified.

Suggested walk-through: the asset list, one asset's "who gets it", the condition on a gift to a minor, the
"everything else" split, the Review page, then the Draft will page and its notes for you at the end.

## What we need from you

Our working assumptions are in the right-hand column of `docs/open-questions.md`. None of them is treated as
settled until a lawyer confirms it. In rough order of how much they change what we build:

1. **Q1: Which state first?** We assume Lagos only, because wills legislation differs by state.
2. **Q2: Are digital wills recognised, and what signing and witnessing is valid?** We assume not: the app
   produces a document that is signed and witnessed on paper.
3. **Q18: Which conditions are enforceable?** Age thresholds, finishing education, outliving the testator,
   marriage, religion or conduct. Is there a statutory age for taking property, a limit on how long a gift can
   be held, and what must a will say about who holds the asset and what happens if the condition fails? We
   suspect marriage and conduct conditions are the likeliest to fail and want to know which to remove.
4. **Q5: Customary and Islamic law.** How should the allocation limits for such families be handled? We
   assume we flag the asset for lawyer review and never block or auto-correct.
5. **Q17: Gifts to churches, mosques, charities and schools.** What must the will say for the gift to be valid
   and carried out: full registered name, CAC registration (incorporated trustees), the branch or parish? What
   if the body is unregistered?
6. **Q7: Death trigger.** Who confirms a death and releases instructions, and on what proof?
7. **Q10: Data protection.** What does the Nigeria Data Protection Act require of us: registration,
   data-processing terms, cross-border transfer, hosting?
8. **Q24: The draft's wording.** What should the standard clauses say: revocation, executors, how a conditional
   gift is held and what happens if the condition fails, failure of a gift, and the signing block?
9. **Q23: The organisation list.** May we copy facility and organisation data from public registers into our own
   list, and on what terms?

Two broader questions we would like your view on:

- Where, in your experience, do home-made or poorly prepared wills most often fail or cause disputes, and could
  this kind of structured preparation prevent it?
- Would you review output like this, and what would you need to see in a draft to make that quick and
  worthwhile? (Questions of how lawyers are found, paid and vetted are Q3 and Q4.)
