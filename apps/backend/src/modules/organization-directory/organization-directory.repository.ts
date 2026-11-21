import { sql } from 'kysely';
import type { DbClient } from '@heartwood/database';

const MAX_LIMIT = 100;

export interface DirectoryFilters {
  query?: string;
  institutionType?: string;
  state?: string;
}

const filtered = (db: DbClient, filters: DirectoryFilters) => {
  let q = db.selectFrom('organization_directory');
  // Word similarity (<%) so a partial or misspelt word still matches, served by the GIN trigram index.
  if (filters.query) q = q.where(sql<boolean>`${filters.query} <% name`);
  if (filters.institutionType) q = q.where('institution_type', '=', filters.institutionType);
  if (filters.state) q = q.where('state', '=', filters.state);
  return q;
};

/** One page of matches, best first, with the total of all matches counted in the same statement. */
export const searchDirectory = async (
  db: DbClient,
  filters: DirectoryFilters,
  options: { page: number; limit: number }
) => {
  const limit = Math.min(options.limit, MAX_LIMIT);
  const offset = (options.page - 1) * limit;
  let q = filtered(db, filters)
    .selectAll()
    .select(({ fn }) => fn.countAll<string>().over().as('total'));
  q = filters.query
    ? q.orderBy(sql`word_similarity(${filters.query}, name)`, 'desc').orderBy('name')
    : q.orderBy('name');
  const rows = await q.limit(limit).offset(offset).execute();

  if (rows.length > 0) return { rows, total: Number(rows[0]?.total ?? 0), limit };
  // A page past the end returns no row to carry the window count, so count separately.
  const count = await filtered(db, filters)
    .select(({ fn }) => fn.countAll<string>().as('total'))
    .executeTakeFirst();
  return { rows, total: Number(count?.total ?? 0), limit };
};

export const listDirectoryStates = (db: DbClient) =>
  db
    .selectFrom('organization_directory')
    .select('state')
    .distinct()
    .where('state', 'is not', null)
    .orderBy('state')
    .execute();

export const directoryEntryExists = async (db: DbClient, id: string) =>
  Boolean(
    await db
      .selectFrom('organization_directory')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst()
  );

export const findDirectoryEntry = (db: DbClient, name: string, state: string | null) =>
  db
    .selectFrom('organization_directory')
    .select(['id', 'institution_type'])
    .where(eb => eb(eb.fn('lower', ['name']), '=', name.toLowerCase()))
    .where(eb => (state === null ? eb('state', 'is', null) : eb('state', '=', state)))
    .executeTakeFirst();

export const insertDirectoryEntry = (
  db: DbClient,
  values: {
    name: string;
    institution_type: string;
    state: string | null;
    city: string | null;
    source: string;
  }
) => db.insertInto('organization_directory').values(values).execute();

export const findDirectoryEntryByName = (db: DbClient, name: string) =>
  db
    .selectFrom('organization_directory')
    .select('id')
    .where(eb => eb(eb.fn('lower', ['name']), '=', name.toLowerCase()))
    .executeTakeFirst();
