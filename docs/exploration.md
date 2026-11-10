# Heartwood: Initial Exploration

_Working name: Heartwood (can change). Date: 2026-11-10. Status: idea stage, pre-build._

## 1. The idea

An app where an ordinary person can list everything they own that they want to pass on, say how each asset should be distributed among people, and have a **lawyer discharge those instructions** after their death.

Wealthy people have estate lawyers. Most people don't use one, possibly because they assume it's too expensive or not for them. Heartwood aims to make that route accessible and affordable.

## 2. The problem (Nigeria)

- "Next of kin" on a bank or institutional form is a contact record, not a legal instrument. Institutions often hold on to the funds, and families fight long battles to recover them.
- Property without clear, legally valid instructions becomes a source of family conflict.
- Most people never organise their assets or intentions at all, so even a willing family can't act on what the person wanted.

## 3. Key reframe

**The app is not what makes the transfer legal. A valid will is.**

The strongest version of the product is a platform that gets ordinary people to a valid, lawyer-reviewed will, backed by an organised inventory of their assets. It is not a system that distributes assets itself. This means we don't have to wait for new legislation: the legal mechanism (wills and probate) already exists. What's missing is access, clarity and usability.

## 4. Legal considerations (to verify with a Nigerian probate lawyer)

These are flagged as assumptions, not conclusions.

- Succession law is layered. Wills legislation varies by state (e.g. Lagos has its own Wills Law), and customary law and Islamic law apply to many families and may limit what can be given to whom.
- Execution formalities: traditionally a will must be in writing, signed, and witnessed. Whether and where a fully digital will is recognised needs confirming. Safe MVP assumption: the app produces the document, which is then signed and witnessed properly.
- Spouses and children may hold claims that a will cannot fully override.
- Data: the Nigeria Data Protection Act applies to the sensitive data we'd hold.

## 5. Hard problems

1. **Death trigger.** Who confirms the death and releases instructions? Likely an executor or lawyer initiates it, with a death certificate as proof. Avoid anything fully automatic, since a false trigger would be severe.
2. **Custody.** Never hold the assets. The app holds information and instructions. Lawyers and courts move the assets.
3. **Staleness.** Assets change (accounts closed, property sold). Periodic review prompts are essential; an outdated inventory recreates the conflicts we're trying to prevent.
4. **Security and privacy.** We'd hold a map of someone's wealth. Encrypt heavily and minimise stored data (e.g. "GTBank account" plus a hint, not account numbers).
5. **Lawyer role and pricing.** Consider conflicts of interest. Cheaper-than-traditional is likely the selling point, so a flat fee for review and execution may beat hourly billing.
6. **Informal list vs. will.** An in-app list that conflicts with the signed will creates new disputes. The will must be the source of truth.

## 6. Proposed MVP scope

Does not depend on any legal or institutional partnership:

1. Asset inventory (add any asset, categorised).
2. Beneficiaries.
3. Allocation of each asset among beneficiaries, with validation.
4. Draft will export (document for lawyer review).

Then take this to a Nigerian probate lawyer for feedback before building further.

## 7. Data model sketch

- **User** (testator)
- **Asset**: type (cash, property, vehicle, business shares, digital, other), description, location/institution, rough value (optional), notes
- **Beneficiary**: name, relationship, contact
- **Allocation**: links an asset to a beneficiary, as a percentage share or a specific bequest
- **Residuary rule**: handles any asset not listed or left over
- **Contingency**: what happens if a beneficiary dies before the user (e.g. pass to their children, or redistribute)
- **Executor / lawyer**: who initiates and discharges

Validation rules worth building early:

- Allocations per asset must sum to 100% (or be a clear specific bequest).
- Every asset is covered by an allocation or the residuary clause.
- Flag beneficiaries with no contingency.
- Flag assets that may be subject to customary or religious law constraints.

## 8. Naming

Chosen working name: **Heartwood** (the dense inner wood that makes a tree last; neutral across ethnic groups, evokes durability).

Considered: Nketa (Igbo, may divide a pan-Nigerian audience), Gado (Hausa), Kola (culturally shared symbol), Taproot, Canopy, Willow, Baobab. Iroko was ruled out as the space is crowded.

To do: check domain, social handles and Nigerian trademark availability.

## 9. Open questions

- Which state(s) to target first?
- Are digital wills recognised, and what execution process is acceptable?
- How are lawyers sourced and vetted? Marketplace or in-house panel?
- Pricing model: one-off fee, subscription, or per-review?
- How to handle customary/Islamic law families in the allocation engine?
- Who is the first user group to test with?

## 10. Next steps

1. Set up the project (stack, repo, auth).
2. Build the inventory, beneficiary and allocation models with validation.
3. Generate a draft will document from the data.
4. Speak to a Nigerian probate lawyer with a working prototype.
