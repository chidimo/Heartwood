import type { DbClient } from '@heartwood/database';
import {
  allocationProblem,
  residuaryProblem,
  type AllocationEntry,
  type InventoryIssue,
  type InventoryReport,
  type ResiduaryEntry,
} from '@heartwood/shared';
import { unprocessable } from '../../utils/http-error';
import {
  allocationCoverage,
  getAllocations as getAllocationRows,
  replaceAllocationRows,
  replaceResiduaryRows,
} from '../allocation/allocation.service';
import { getAsset, listAssets } from '../asset/asset.service';
import { listBeneficiaries } from '../beneficiary/beneficiary.service';

// Cross-domain operations: this module is allowed to call the asset, beneficiary and allocation
// services; they don't call each other for these (docs/standards/interactions.md).

const requireOwnBeneficiaries = async (db: DbClient, ownerId: string, ids: string[]) => {
  const own = new Set((await listBeneficiaries(db, ownerId)).map(b => b.id));
  if (ids.some(id => !own.has(id))) throw unprocessable('Beneficiary not found');
};

export const getAssetAllocations = async (db: DbClient, ownerId: string, assetId: string) => {
  await getAsset(db, ownerId, assetId);
  return getAllocationRows(db, ownerId, assetId);
};

/** Replaces an asset's allocation atomically. An empty list clears it (the asset then falls to the residuary). */
export const replaceAssetAllocations = (
  db: DbClient,
  ownerId: string,
  assetId: string,
  entries: AllocationEntry[]
) =>
  db.transaction().execute(async trx => {
    await getAsset(trx, ownerId, assetId);
    const problem = allocationProblem(entries);
    if (problem) throw unprocessable(problem);
    await requireOwnBeneficiaries(
      trx,
      ownerId,
      entries.map(e => e.beneficiaryId)
    );
    return replaceAllocationRows(trx, ownerId, assetId, entries);
  });

export const replaceResiduary = (db: DbClient, ownerId: string, entries: ResiduaryEntry[]) =>
  db.transaction().execute(async trx => {
    const problem = residuaryProblem(entries);
    if (problem) throw unprocessable(problem);
    await requireOwnBeneficiaries(
      trx,
      ownerId,
      entries.map(e => e.beneficiaryId)
    );
    return replaceResiduaryRows(trx, ownerId, entries);
  });

/** What still needs attention before the inventory can become a draft will. */
export const getInventoryReport = async (
  db: DbClient,
  ownerId: string
): Promise<InventoryReport> => {
  const [assets, beneficiaries, coverage] = await Promise.all([
    listAssets(db, ownerId),
    listBeneficiaries(db, ownerId),
    allocationCoverage(db, ownerId),
  ]);
  const issues: InventoryIssue[] = [];

  if (assets.length > 0 && beneficiaries.length === 0) {
    issues.push({
      code: 'no_beneficiaries',
      severity: 'error',
      entity: 'inventory',
      id: null,
      subject: null,
      message: 'Add at least one beneficiary.',
    });
  }

  for (const asset of assets) {
    if (coverage.allocatedAssetIds.has(asset.id)) continue;
    // Not allocated: it passes under the residuary clause if there is one, otherwise nothing covers it.
    issues.push(
      coverage.hasResiduary
        ? {
            code: 'asset_unallocated',
            severity: 'info',
            entity: 'asset',
            id: asset.id,
            subject: asset.description,
            message: 'Not allocated; it will pass under the residuary clause.',
          }
        : {
            code: 'asset_uncovered',
            severity: 'error',
            entity: 'asset',
            id: asset.id,
            subject: asset.description,
            message: 'Not allocated and there is no residuary clause to cover it.',
          }
    );
  }

  for (const b of beneficiaries) {
    if (b.contingencyPlan === null) {
      issues.push({
        code: 'beneficiary_no_contingency',
        severity: 'warning',
        entity: 'beneficiary',
        id: b.id,
        subject: b.name,
        message: 'No plan for if this beneficiary dies before you.',
      });
    }
    if (!coverage.receivingBeneficiaryIds.has(b.id)) {
      issues.push({
        code: 'beneficiary_unused',
        severity: 'info',
        entity: 'beneficiary',
        id: b.id,
        subject: b.name,
        message: 'Not receiving anything yet.',
      });
    }
  }

  return { ok: !issues.some(i => i.severity === 'error'), issues };
};
