import { sql } from 'kysely';
import type { DbClient } from '@heartwood/database';

export const listAssets = (db: DbClient, ownerId: string) =>
  db
    .selectFrom('asset')
    .selectAll()
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .orderBy('created_at')
    .execute();

const MAX_LIMIT = 100;

export interface AssetFilters {
  query?: string;
  type?: string;
  currency?: string;
}

const matching = (db: DbClient, ownerId: string, filters: AssetFilters) => {
  let q = db.selectFrom('asset').where('owner_id', '=', ownerId).where('deleted_at', 'is', null);
  // Word similarity (<%), so a partial or misspelt word still matches; the GIN trigram indexes serve it.
  if (filters.query) {
    q = q.where(
      sql<boolean>`(${filters.query} <% description OR ${filters.query} <% coalesce(institution, ''))`
    );
  }
  if (filters.type) q = q.where('type', '=', filters.type);
  if (filters.currency) q = q.where('currency', '=', filters.currency);
  return q;
};

/** One page of an owner's assets, best match first, with the total counted in the same statement. */
export const searchAssets = async (
  db: DbClient,
  ownerId: string,
  filters: AssetFilters,
  options: { page: number; limit: number }
) => {
  const limit = Math.min(options.limit, MAX_LIMIT);
  const offset = (options.page - 1) * limit;
  let q = matching(db, ownerId, filters)
    .selectAll()
    .select(({ fn }) => fn.countAll<string>().over().as('total'));
  q = filters.query
    ? q
        .orderBy(
          sql`greatest(word_similarity(${filters.query}, description), word_similarity(${filters.query}, coalesce(institution, '')))`,
          'desc'
        )
        .orderBy('created_at')
    : q.orderBy('created_at');
  const rows = await q.limit(limit).offset(offset).execute();

  if (rows.length > 0) return { rows, total: Number(rows[0]?.total ?? 0), limit };
  // A page past the end returns no row to carry the window count, so count separately.
  const count = await matching(db, ownerId, filters)
    .select(({ fn }) => fn.countAll<string>().as('total'))
    .executeTakeFirst();
  return { rows, total: Number(count?.total ?? 0), limit };
};

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
    currency: string;
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
    currency: string;
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
