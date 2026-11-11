import type { DbClient } from '@heartwood/database';
import type { AssetDto, AssetInput, AssetUpdate } from '@heartwood/shared';
import { notFoundError } from '../../utils/http-error';
import { recordAudit } from '../audit/audit.service';
import { removeAllocationsForAsset } from '../allocation/allocation.service';
import {
  findAsset,
  insertAsset,
  listAssets as listAssetRows,
  softDeleteAsset,
  updateAsset as updateAssetRow,
} from './asset.repository';

type AssetRow = Awaited<ReturnType<typeof findAsset>> & object;

const toDto = (row: AssetRow): AssetDto => ({
  id: row.id,
  type: row.type as AssetDto['type'],
  description: row.description,
  institution: row.institution,
  currency: row.currency as AssetDto['currency'],
  roughValue: row.rough_value === null ? null : Number(row.rough_value),
  notes: row.notes,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const listAssets = async (db: DbClient, ownerId: string) =>
  (await listAssetRows(db, ownerId)).map(toDto);

export const getAsset = async (db: DbClient, ownerId: string, id: string) => {
  const row = await findAsset(db, ownerId, id);
  if (!row) throw notFoundError('Asset not found');
  return toDto(row);
};

export const createAsset = (db: DbClient, ownerId: string, input: AssetInput) =>
  db.transaction().execute(async trx => {
    const row = await insertAsset(trx, {
      owner_id: ownerId,
      type: input.type,
      description: input.description,
      institution: input.institution,
      currency: input.currency,
      rough_value: input.roughValue,
      notes: input.notes,
    });
    const dto = toDto(row);
    await recordAudit(trx, {
      actorId: ownerId,
      entity: 'asset',
      entityId: row.id,
      action: 'create',
      snapshot: { ...dto },
    });
    return dto;
  });

export const updateAsset = (db: DbClient, ownerId: string, id: string, input: AssetUpdate) =>
  db.transaction().execute(async trx => {
    const row = await updateAssetRow(trx, ownerId, id, {
      type: input.type,
      description: input.description,
      institution: input.institution,
      currency: input.currency,
      rough_value: input.roughValue,
      notes: input.notes,
    });
    if (!row) throw notFoundError('Asset not found');
    const dto = toDto(row);
    await recordAudit(trx, {
      actorId: ownerId,
      entity: 'asset',
      entityId: id,
      action: 'update',
      snapshot: { ...dto },
    });
    return dto;
  });

/** Soft delete; the asset's allocations go with it. */
export const deleteAsset = (db: DbClient, ownerId: string, id: string) =>
  db.transaction().execute(async trx => {
    const deleted = await softDeleteAsset(trx, ownerId, id, ownerId);
    if (!deleted) throw notFoundError('Asset not found');
    await removeAllocationsForAsset(trx, ownerId, id);
    await recordAudit(trx, { actorId: ownerId, entity: 'asset', entityId: id, action: 'delete' });
  });
