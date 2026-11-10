import type { DbClient } from '@heartwood/database';

export const listAllocationsForAsset = (db: DbClient, ownerId: string, assetId: string) =>
  db
    .selectFrom('allocation')
    .selectAll()
    .where('owner_id', '=', ownerId)
    .where('asset_id', '=', assetId)
    .where('deleted_at', 'is', null)
    .orderBy('created_at')
    .execute();

export const listAllocations = (db: DbClient, ownerId: string) =>
  db
    .selectFrom('allocation')
    .select(['asset_id', 'beneficiary_id'])
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .execute();

export const softDeleteAllocationsForAsset = (
  db: DbClient,
  ownerId: string,
  assetId: string,
  actorId: string
) =>
  db
    .updateTable('allocation')
    .set({ deleted_at: new Date(), deleted_by: actorId })
    .where('owner_id', '=', ownerId)
    .where('asset_id', '=', assetId)
    .where('deleted_at', 'is', null)
    .returning('id')
    .execute();

export const insertAllocation = (
  db: DbClient,
  values: {
    owner_id: string;
    asset_id: string;
    beneficiary_id: string;
    share_percent: number | null;
    specific_bequest: string | null;
  }
) => db.insertInto('allocation').values(values).returning('id').executeTakeFirstOrThrow();

export const listResiduary = (db: DbClient, ownerId: string) =>
  db
    .selectFrom('residuary_allocation')
    .selectAll()
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .orderBy('created_at')
    .execute();

export const softDeleteResiduary = (db: DbClient, ownerId: string, actorId: string) =>
  db
    .updateTable('residuary_allocation')
    .set({ deleted_at: new Date(), deleted_by: actorId })
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .returning('id')
    .execute();

export const insertResiduary = (
  db: DbClient,
  values: { owner_id: string; beneficiary_id: string; share_percent: number }
) => db.insertInto('residuary_allocation').values(values).returning('id').executeTakeFirstOrThrow();

export const countBeneficiaryReferences = async (db: DbClient, ownerId: string, id: string) => {
  const [alloc, resid] = await Promise.all([
    db
      .selectFrom('allocation')
      .select(eb => eb.fn.countAll<string>().as('n'))
      .where('owner_id', '=', ownerId)
      .where('beneficiary_id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom('residuary_allocation')
      .select(eb => eb.fn.countAll<string>().as('n'))
      .where('owner_id', '=', ownerId)
      .where('beneficiary_id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow(),
  ]);
  return Number(alloc.n) + Number(resid.n);
};
