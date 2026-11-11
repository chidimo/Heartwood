import type { DbClient } from '@heartwood/database';
import { buildDraftWill, type DraftWill } from '@heartwood/shared';
import { getAccount } from '../account/account.service';
import { getResiduary } from '../allocation/allocation.service';
import { listAssets } from '../asset/asset.service';
import { listBeneficiaries } from '../beneficiary/beneficiary.service';
import { listExecutors } from '../executor/executor.service';
import { findInventoryIssues, getAssetAllocations } from '../inventory/inventory.service';

/** The person's inventory written up as a draft will, for a lawyer to correct. */
export const getDraftWill = async (db: DbClient, ownerId: string): Promise<DraftWill> => {
  const [account, assets, beneficiaries, executors, residuary, issues] = await Promise.all([
    getAccount(db, ownerId),
    listAssets(db, ownerId),
    listBeneficiaries(db, ownerId),
    listExecutors(db, ownerId),
    getResiduary(db, ownerId),
    findInventoryIssues(db, ownerId),
  ]);
  const allocations = Object.fromEntries(
    await Promise.all(
      assets.map(
        async asset => [asset.id, await getAssetAllocations(db, ownerId, asset.id)] as const
      )
    )
  );
  return buildDraftWill({
    testatorName: account.name,
    preparedOn: new Date().toISOString().slice(0, 10),
    assets,
    beneficiaries,
    executors,
    allocations,
    residuary,
    issues,
  });
};
