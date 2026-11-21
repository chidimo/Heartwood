import type { DbClient } from '@heartwood/database';
import type {
  DirectoryEntryInput,
  DirectoryPage,
  DirectorySearch,
  InstitutionType,
} from '@heartwood/shared';
import { unprocessable } from '../../utils/http-error';
import {
  directoryEntryExists,
  findDirectoryEntry,
  findDirectoryEntryByName,
  insertDirectoryEntry,
  listDirectoryStates,
  searchDirectory,
} from './organization-directory.repository';

export const searchOrganizations = async (
  db: DbClient,
  search: DirectorySearch
): Promise<DirectoryPage> => {
  const { rows, total, limit } = await searchDirectory(
    db,
    { query: search.q || undefined, institutionType: search.type, state: search.state },
    { page: search.page, limit: search.limit }
  );
  return {
    items: rows.map(row => ({
      id: row.id,
      name: row.name,
      institutionType: row.institution_type as InstitutionType,
      state: row.state,
      city: row.city,
    })),
    page: search.page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

export const listOrganizationStates = async (db: DbClient): Promise<string[]> =>
  (await listDirectoryStates(db)).map(row => row.state as string);

/** A beneficiary may only point at an entry that exists. */
export const assertDirectoryEntry = async (db: DbClient, id: string) => {
  if (!(await directoryEntryExists(db, id)))
    throw unprocessable('Organisation not found in our list');
};

/** Used by the seeder to link a seeded organisation to its list entry when the names match. */
export const directoryIdForName = async (db: DbClient, name: string) =>
  (await findDirectoryEntryByName(db, name))?.id ?? null;

/** Adds the entries that are not there yet; never changes or removes one. Returns how many were added. */
export const addDirectoryEntries = async (
  db: DbClient,
  entries: DirectoryEntryInput[],
  source = 'starter'
): Promise<number> => {
  let added = 0;
  for (const entry of entries) {
    const state = entry.state ?? null;
    if (await findDirectoryEntry(db, entry.name, state)) continue;
    await insertDirectoryEntry(db, {
      name: entry.name,
      institution_type: entry.institutionType,
      state,
      city: entry.city ?? null,
      source,
    });
    added += 1;
  }
  return added;
};
