import type { DbClient } from '@heartwood/database';

export const listAssets = (db: DbClient, ownerId: string) =>
  db
    .selectFrom('asset')
    .selectAll()
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .orderBy('created_at')
    .execute();

export const findAsset = (db: DbClient, ownerId: string, id: string) =>
  db
    .selectFrom('asset')
    .selectAll()
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

export const insertAsset = (
  db: DbClient,
  values: {
    owner_id: string;
    type: string;
    description: string;
    institution: string | null;
    rough_value: number | null;
    notes: string | null;
  }
) => db.insertInto('asset').values(values).returningAll().executeTakeFirstOrThrow();

export const updateAsset = (
  db: DbClient,
  ownerId: string,
  id: string,
  values: Partial<{
    type: string;
    description: string;
    institution: string | null;
    rough_value: number | null;
    notes: string | null;
  }>
) =>
  db
    .updateTable('asset')
    .set({ ...values, updated_at: new Date() })
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .returningAll()
    .executeTakeFirst();

export const softDeleteAsset = (db: DbClient, ownerId: string, id: string, actorId: string) =>
  db
    .updateTable('asset')
    .set({ deleted_at: new Date(), deleted_by: actorId })
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .returning('id')
    .executeTakeFirst();
