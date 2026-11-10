# Dev seed

Known data to load into a local database, so a reset doesn't mean re-typing everything. **Local databases only.**

```bash
yarn db:seed    # add the seed data; safe to run again (never duplicates, never overwrites)
yarn db:reset   # wipe the dev database, re-apply every migration, then seed
```

Both read `DATABASE_URL` from `apps/backend/.env` (or the environment). They refuse to run unless it points at
`localhost`, `127.0.0.1` or `::1`, and never when `NODE_ENV=production`: the seed accounts below have known
passwords and `db:reset` drops every table.

## What you get

| Account             | Password            | Holds                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seed@example.com`  | `seeded-password-1` | A full inventory: 16 assets (naira, dollar and pound, some with decimals), 34 beneficiaries (20 people and 14 organizations of every kind), 5 executors and lawyers, 16 allocated assets (splits, specific bequests, gifts to organizations) and an 8-way residuary. Gifts carry every condition kind (age, education, marriage, NYSC, outlive me by N days, free text), each with a holder and an "if unmet" plan. The review is "ready for a draft" with warnings |
| `other@example.com` | `other-password-1`  | One asset, one beneficiary: for checking that one account can never see another's data                                                                                                                                                                                                                                                                                                                                                                              |

## How it works

- `data/accounts.json` lists the accounts and which file holds each one's inventory.
- `data/inventories/*.json` hold the assets, beneficiaries, executors, allocations and residuary. Allocations name
  assets and beneficiaries by their text (`"asset": "Toyota Camry 2014"`, `"beneficiary": "Ada Obi"`), so the files read
  like the app.
- `seed.ts` goes through the same services the API uses, so seeded data obeys every rule (shares total exactly 100%,
  owner scoping, audit rows), and each file is validated with the shared schemas. A mistake in a JSON file fails
  loudly with the field name.
- Inventory is only seeded into an account that has none, so a re-run keeps anything you have added or edited since.
  To start clean, use `yarn db:reset`.

## Changing the seed

Edit the JSON and run `yarn db:reset`. To add an account, add it to `accounts.json` and give it an inventory file
(an empty one is `{"assets":[],"beneficiaries":[],"executors":[],"allocations":[],"residuary":[]}`).
When a feature adds a field, add it to the data here so the demo account shows it.
