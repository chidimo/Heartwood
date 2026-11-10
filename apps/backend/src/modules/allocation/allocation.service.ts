import type { DbClient } from '@heartwood/database';
import type { AllocationDto, AllocationEntry, ResiduaryEntry } from '@heartwood/shared';
import { recordAudit } from '../audit/audit.service';
import {
  countBeneficiaryReferences,
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

const toDto = (row: {
  beneficiary_id: string;
  share_percent: string | null;
  specific_bequest: string | null;
}): AllocationDto => ({
  beneficiaryId: row.beneficiary_id,
  sharePercent: row.share_percent === null ? null : Number(row.share_percent),
  specificBequest: row.specific_bequest,
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

export const beneficiaryIsAllocated = async (db: DbClient, ownerId: string, id: string) =>
  (await countBeneficiaryReferences(db, ownerId, id)) > 0;

/** Which assets have an allocation and which beneficiaries receive something (for the report). */
export const allocationCoverage = async (db: DbClient, ownerId: string) => {
  const [rows, residuary] = await Promise.all([
    listAllocations(db, ownerId),
    getResiduary(db, ownerId),
  ]);
  return {
    allocatedAssetIds: new Set(rows.map(r => r.asset_id)),
    receivingBeneficiaryIds: new Set([
      ...rows.map(r => r.beneficiary_id),
      ...residuary.map(r => r.beneficiaryId),
    ]),
    hasResiduary: residuary.length > 0,
  };
};
