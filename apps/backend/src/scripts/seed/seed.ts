import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { DbClient } from '@heartwood/database';
import {
  assetInputSchema,
  beneficiaryInputSchema,
  executorInputSchema,
  registerSchema,
  replaceAllocationsSchema,
  replaceResiduarySchema,
} from '@heartwood/shared';
import { createAccount, findPublicAccountByEmail } from '../../modules/account/account.service';
import { createAsset, listAssets } from '../../modules/asset/asset.service';
import {
  createBeneficiary,
  listBeneficiaries,
} from '../../modules/beneficiary/beneficiary.service';
import { createExecutor } from '../../modules/executor/executor.service';
import {
  replaceAssetAllocations,
  replaceResiduary,
} from '../../modules/inventory/inventory.service';

// Seeds go through the same services the API uses, so they obey every rule (shares total 100%,
// owner scoping, audit rows) and the data files are validated with the shared schemas. Edit the
// JSON in ./data to change what gets seeded; a mistake fails loudly here, not silently in the app.

const DATA_DIR = path.join(__dirname, 'data');

const readJson = (...parts: string[]): unknown =>
  JSON.parse(readFileSync(path.join(DATA_DIR, ...parts), 'utf8'));

const accountsFile = z.array(registerSchema.extend({ inventory: z.string().min(1) }));

const inventoryFile = z.object({
  assets: z.array(assetInputSchema),
  beneficiaries: z.array(beneficiaryInputSchema),
  executors: z.array(executorInputSchema),
  // Allocations refer to assets and beneficiaries by name, so the files stay readable.
  allocations: z.array(
    z.object({
      asset: z.string(),
      entries: z.array(
        z.object({
          beneficiary: z.string(),
          sharePercent: z.number().nullish(),
          specificBequest: z.string().nullish(),
          // A condition names its holder (an executor or lawyer) and any fallback person by name.
          condition: z
            .object({
              kind: z.enum(['min_age', 'other']),
              minAge: z.number().optional(),
              text: z.string().optional(),
              ifUnmet: z.string(),
              holder: z.string(),
              fallbackBeneficiary: z.string().optional(),
            })
            .nullish(),
        })
      ),
    })
  ),
  residuary: z.array(z.object({ beneficiary: z.string(), sharePercent: z.number() })),
});
type Inventory = z.infer<typeof inventoryFile>;

const idByName = (map: Map<string, string>, name: string, what: string): string => {
  const id = map.get(name);
  if (!id) throw new Error(`Seed data refers to an unknown ${what}: "${name}"`);
  return id;
};

const seedInventory = async (db: DbClient, ownerId: string, inventory: Inventory) => {
  const assets = new Map<string, string>();
  for (const input of inventory.assets) {
    assets.set(input.description, (await createAsset(db, ownerId, input)).id);
  }
  const beneficiaries = new Map<string, string>();
  for (const input of inventory.beneficiaries) {
    beneficiaries.set(input.name, (await createBeneficiary(db, ownerId, input)).id);
  }
  const executors = new Map<string, string>();
  for (const input of inventory.executors) {
    executors.set(input.name, (await createExecutor(db, ownerId, input)).id);
  }

  for (const { asset, entries } of inventory.allocations) {
    const parsed = replaceAllocationsSchema.parse({
      entries: entries.map(e => ({
        beneficiaryId: idByName(beneficiaries, e.beneficiary, 'beneficiary'),
        sharePercent: e.sharePercent,
        specificBequest: e.specificBequest,
        condition: e.condition
          ? {
              kind: e.condition.kind,
              minAge: e.condition.minAge,
              text: e.condition.text,
              ifUnmet: e.condition.ifUnmet,
              holderId: idByName(executors, e.condition.holder, 'executor'),
              fallbackBeneficiaryId: e.condition.fallbackBeneficiary
                ? idByName(beneficiaries, e.condition.fallbackBeneficiary, 'beneficiary')
                : null,
            }
          : null,
      })),
    });
    await replaceAssetAllocations(db, ownerId, idByName(assets, asset, 'asset'), parsed.entries);
  }
  if (inventory.residuary.length > 0) {
    const parsed = replaceResiduarySchema.parse({
      entries: inventory.residuary.map(r => ({
        beneficiaryId: idByName(beneficiaries, r.beneficiary, 'beneficiary'),
        sharePercent: r.sharePercent,
      })),
    });
    await replaceResiduary(db, ownerId, parsed.entries);
  }
};

export interface SeedResult {
  email: string;
  created: boolean;
  seededInventory: boolean;
}

/** Seeds every account in data/accounts.json. Safe to run again: it never duplicates anything. */
export const runSeed = async (db: DbClient, log: (line: string) => void = () => {}) => {
  const accounts = accountsFile.parse(readJson('accounts.json'));
  const results: SeedResult[] = [];

  for (const { inventory: file, ...credentials } of accounts) {
    const existing = await findPublicAccountByEmail(db, credentials.email);
    const account = existing ?? (await createAccount(db, credentials));
    log(`${existing ? 'exists ' : 'created'} account ${account.email}`);

    // Inventory is seeded only into an empty account, so a re-run keeps whatever has been edited since.
    const hasData =
      (await listAssets(db, account.id)).length > 0 ||
      (await listBeneficiaries(db, account.id)).length > 0;
    if (hasData) {
      log(`  skipped inventory (${account.email} already has data)`);
      results.push({ email: account.email, created: !existing, seededInventory: false });
      continue;
    }
    await seedInventory(db, account.id, inventoryFile.parse(readJson('inventories', file)));
    log(`  seeded inventory from inventories/${file}`);
    results.push({ email: account.email, created: !existing, seededInventory: true });
  }
  return results;
};
