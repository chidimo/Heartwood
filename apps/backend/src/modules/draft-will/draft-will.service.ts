import { createHash } from 'node:crypto';
import type { DbClient } from '@heartwood/database';
import { buildDraftWill, formatTimestamp, type DraftWill } from '@heartwood/shared';
import { getAccount } from '../account/account.service';
import { getResiduary } from '../allocation/allocation.service';
import { listAssets } from '../asset/asset.service';
import { listBeneficiaries } from '../beneficiary/beneficiary.service';
import { listExecutors } from '../executor/executor.service';
import { findInventoryIssues, getAssetAllocations } from '../inventory/inventory.service';

/**
 * A short code from the exact words of the draft: change a word and the code changes. The banners carry the
 * time of the copy, so they are left out: two copies of the same words get the same code.
 */
export const referenceFor = (draft: DraftWill): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        will: { title: draft.will.title, sections: draft.will.sections },
        notes: { title: draft.notes.title, sections: draft.notes.sections },
      })
    )
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();

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
  const draft = buildDraftWill({
    testatorName: account.name,
    testatorAddress: account.address,
    preparedAt: formatTimestamp(new Date()),
    assets,
    beneficiaries,
    executors,
    allocations,
    residuary,
    issues,
  });
  return { ...draft, reference: referenceFor(draft) };
};
