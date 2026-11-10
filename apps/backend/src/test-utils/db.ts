import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { DB } from '@heartwood/database';

export function requireTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is required - run tests with `yarn test:backend`.');
  }
  return url;
}

// Deliberately not the shared getDb() singleton: that caches its first connection string
// for the life of the process. Tests always get their own connection to TEST_DATABASE_URL.
let db: Kysely<DB> | null = null;

export function getTestDb(): Kysely<DB> {
  if (db) return db;
  db = new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: requireTestDatabaseUrl() }),
    }),
  });
  return db;
}

export async function closeTestDb(): Promise<void> {
  await db?.destroy();
  db = null;
}
