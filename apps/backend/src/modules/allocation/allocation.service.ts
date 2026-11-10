import type { DbClient } from '@heartwood/database';
import type {
  AllocationDto,
  AllocationEntry,
  GiftCondition,
  ResiduaryEntry,
} from '@heartwood/shared';
import { recordAudit } from '../audit/audit.service';
import {
  countBeneficiaryReferences,
  countGiftsHeldBy,
  insertAllocation,
  insertResiduary,
  listAllocations,
  listAllocationsForAsset,
  listResiduary,
  softDeleteAllocationsForAsset,
  softDeleteResiduary,
} from './allocation.repository';

// Data operations only. Whether an asset or beneficiary exists and belongs to the owner, and whether
// the shares are valid, is checked by the caller (modules/inventory), so this module depends on no
// other domain.

interface ConditionColumns {
  condition_kind: string | null;
  condition_min_age: number | null;
  condition_text: string | null;
  condition_if_unmet: string | null;
  condition_fallback_id: string | null;
  condition_holder_id: string | null;
}

/** The condition columns as the API shape, or null when the gift has none (the DB keeps them all-or-nothing). */
const conditionFromRow = (row: ConditionColumns): GiftCondition | null => {
  if (!row.condition_kind || !row.condition_if_unmet || !row.condition_holder_id) return null;
  const common = {
    ifUnmet: row.condition_if_unmet as GiftCondition['ifUnmet'],
    fallbackBeneficiaryId: row.condition_fallback_id,
    holderId: row.condition_holder_id,
  };
  if (row.condition_kind === 'min_age') {
    return { kind: 'min_age', minAge: row.condition_min_age ?? 0, ...common };
  }
  return { kind: 'other', text: row.condition_text ?? '', ...common };
};

const conditionToColumns = (condition: GiftCondition | null): ConditionColumns => ({
  condition_kind: condition?.kind ?? null,
  condition_min_age: condition?.kind === 'min_age' ? condition.minAge : null,
  condition_text: condition?.kind === 'other' ? condition.text : null,
  condition_if_unmet: condition?.ifUnmet ?? null,
  condition_fallback_id: condition?.fallbackBeneficiaryId ?? null,
  condition_holder_id: condition?.holderId ?? null,
});

const toDto = (
  row: {
    beneficiary_id: string;
    share_percent: string | null;
    specific_bequest: string | null;
  } & ConditionColumns
): AllocationDto => ({
  beneficiaryId: row.beneficiary_id,
  sharePercent: row.share_percent === null ? null : Number(row.share_percent),
  specificBequest: row.specific_bequest,
  condition: conditionFromRow(row),
});

export const getAllocations = async (db: DbClient, ownerId: string, assetId: string) =>
  (await listAllocationsForAsset(db, ownerId, assetId)).map(toDto);

/** Replaces an asset's whole allocation. Run inside a transaction. */
export const replaceAllocationRows = async (
  db: DbClient,
  ownerId: string,
  assetId: string,
  entries: AllocationEntry[]
) => {
  await softDeleteAllocationsForAsset(db, ownerId, assetId, ownerId);
  for (const e of entries) {
    await insertAllocation(db, {
      owner_id: ownerId,
      asset_id: assetId,
      beneficiary_id: e.beneficiaryId,
      share_percent: e.sharePercent,
      specific_bequest: e.specificBequest,
      ...conditionToColumns(e.condition),
    });
  }
  await recordAudit(db, {
    actorId: ownerId,
    entity: 'allocation',
    entityId: assetId,
    action: 'update',
    snapshot: { assetId, entries },
  });
  return getAllocations(db, ownerId, assetId);
};

/** Called when an asset is deleted. */
export const removeAllocationsForAsset = async (db: DbClient, ownerId: string, assetId: string) => {
  const removed = await softDeleteAllocationsForAsset(db, ownerId, assetId, ownerId);
  if (removed.length > 0) {
    await recordAudit(db, {
      actorId: ownerId,
      entity: 'allocation',
      entityId: assetId,
      action: 'delete',
    });
  }
};

export const getResiduary = async (db: DbClient, ownerId: string) =>
  (await listResiduary(db, ownerId)).map(r => ({
    beneficiaryId: r.beneficiary_id,
    sharePercent: Number(r.share_percent),
  }));

/** Replaces the whole residuary. Run inside a transaction. */
export const replaceResiduaryRows = async (
  db: DbClient,
  ownerId: string,
  entries: ResiduaryEntry[]
) => {
  await softDeleteResiduary(db, ownerId, ownerId);
  for (const e of entries) {
    await insertResiduary(db, {
      owner_id: ownerId,
      beneficiary_id: e.beneficiaryId,
      share_percent: e.sharePercent,
    });
  }
  await recordAudit(db, {
    actorId: ownerId,
    entity: 'residuary',
    entityId: ownerId,
    action: 'update',
    snapshot: { entries },
  });
  return getResiduary(db, ownerId);
};

export const executorHoldsGifts = async (db: DbClient, ownerId: string, id: string) =>
  (await countGiftsHeldBy(db, ownerId, id)) > 0;

export const beneficiaryIsAllocated = async (db: DbClient, ownerId: string, id: string) =>
  (await countBeneficiaryReferences(db, ownerId, id)) > 0;

/** Which assets have an allocation and which beneficiaries receive something (for the report). */
export const allocationCoverage = async (db: DbClient, ownerId: string) => {
  const [rows, residuary] = await Promise.all([
    listAllocations(db, ownerId),
    getResiduary(db, ownerId),
  ]);
  return {
    gifts: rows.map(r => ({
      assetId: r.asset_id,
      beneficiaryId: r.beneficiary_id,
      condition: conditionFromRow(r),
    })),
    allocatedAssetIds: new Set(rows.map(r => r.asset_id)),
    receivingBeneficiaryIds: new Set([
      ...rows.map(r => r.beneficiary_id),
      ...residuary.map(r => r.beneficiaryId),
    ]),
    hasResiduary: residuary.length > 0,
  };
};
