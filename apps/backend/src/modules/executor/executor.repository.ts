import type { DbClient } from '@heartwood/database';

export const listExecutors = (db: DbClient, ownerId: string) =>
  db
    .selectFrom('executor')
    .selectAll()
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .orderBy('created_at')
    .execute();

export const insertExecutor = (
  db: DbClient,
  values: { owner_id: string; kind: string; name: string; contact: string | null }
) => db.insertInto('executor').values(values).returningAll().executeTakeFirstOrThrow();

export const updateExecutor = (
  db: DbClient,
  ownerId: string,
  id: string,
  values: Partial<{ kind: string; name: string; contact: string | null }>
) =>
  db
    .updateTable('executor')
    .set({ ...values, updated_at: new Date() })
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .returningAll()
    .executeTakeFirst();

export const softDeleteExecutor = (db: DbClient, ownerId: string, id: string, actorId: string) =>
  db
    .updateTable('executor')
    .set({ deleted_at: new Date(), deleted_by: actorId })
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .returning('id')
    .executeTakeFirst();
