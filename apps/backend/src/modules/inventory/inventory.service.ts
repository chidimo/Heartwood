import type { DbClient } from '@heartwood/database';
import {
  ageInYears,
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
import { listExecutors } from '../executor/executor.service';

// Cross-domain operations: this module is allowed to call the asset, beneficiary and allocation
// services; they don't call each other for these (docs/standards/interactions.md).

const requireOwnBeneficiaries = async (db: DbClient, ownerId: string, ids: string[]) => {
  const own = new Set((await listBeneficiaries(db, ownerId)).map(b => b.id));
  if (ids.some(id => !own.has(id))) throw unprocessable('Beneficiary not found');
};

/** A condition's holder must be this person's own executor or lawyer, and its fallback one of their own beneficiaries. */
const requireValidConditions = async (
  db: DbClient,
  ownerId: string,
  entries: AllocationEntry[]
) => {
  const conditioned = entries.filter(e => e.condition !== null);
  if (conditioned.length === 0) return;
  const holders = new Set((await listExecutors(db, ownerId)).map(x => x.id));
  for (const { beneficiaryId, condition } of conditioned) {
    if (!condition) continue;
    if (!holders.has(condition.holderId)) throw unprocessable('Holder not found');
    if (condition.fallbackBeneficiaryId === beneficiaryId) {
      throw unprocessable('A gift cannot fall back to the person it is for');
    }
  }
  await requireOwnBeneficiaries(
    db,
    ownerId,
    conditioned.flatMap(e =>
      e.condition?.fallbackBeneficiaryId ? [e.condition.fallbackBeneficiaryId] : []
    )
  );
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
    await requireValidConditions(trx, ownerId, entries);
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
const SEVERITY_RANK: Record<InventoryIssue['severity'], number> = { error: 0, warning: 1, info: 2 };
const MAX_PAGE_SIZE = 100;

/** The review of an inventory: every check runs, then one page of the issues is returned, worst first. */
export const getInventoryReport = async (
  db: DbClient,
  ownerId: string,
  paging: { page: number; limit: number } = { page: 1, limit: 20 }
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

  const assetsById = new Map(assets.map(a => [a.id, a]));
  const peopleById = new Map(beneficiaries.map(b => [b.id, b]));
  for (const gift of coverage.gifts) {
    const asset = assetsById.get(gift.assetId);
    const person = peopleById.get(gift.beneficiaryId);
    if (!asset || !person) continue;
    if (gift.condition?.kind === 'min_age' && !person.dateOfBirth) {
      issues.push({
        code: 'gift_age_unverifiable',
        severity: 'warning',
        entity: 'asset',
        id: asset.id,
        subject: asset.description,
        message: `Add ${person.name}'s date of birth so the age condition can be checked.`,
      });
    }
    if (!gift.condition && person.dateOfBirth && ageInYears(person.dateOfBirth) < 18) {
      issues.push({
        code: 'gift_to_minor_unconditional',
        severity: 'warning',
        entity: 'asset',
        id: asset.id,
        subject: asset.description,
        message: `${person.name} is under 18 and would receive this outright. Consider an age condition.`,
      });
    }
  }

  for (const b of beneficiaries) {
    if (b.contingencyPlan === null) {
      issues.push({
        code: 'beneficiary_no_contingency',
        severity: 'warning',
        entity: 'beneficiary',
        id: b.id,
        subject: b.name,
        message:
          b.kind === 'institution'
            ? 'No plan for if this organisation no longer exists.'
            : 'No plan for if this beneficiary dies before you.',
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

  // Array.sort is stable, so issues of one severity keep the order they were found in.
  issues.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const limit = Math.min(paging.limit, MAX_PAGE_SIZE);
  const counts = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) counts[issue.severity] += 1;
  return {
    ok: counts.error === 0,
    counts,
    total: issues.length,
    page: paging.page,
    limit,
    totalPages: Math.max(1, Math.ceil(issues.length / limit)),
    issues: issues.slice((paging.page - 1) * limit, paging.page * limit),
  };
};
