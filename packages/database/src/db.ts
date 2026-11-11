import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { DB } from './db.types';

let _db: Kysely<DB> | null = null;

export function getDb(connectionString?: string): Kysely<DB> {
  if (_db) return _db;
  const url = connectionString ?? process.env.DATABASE_URL;
  const requiresSsl = url?.includes('sslmode=require') || process.env.NODE_ENV === 'production';
  _db = new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: url,
        ssl: requiresSsl ? { rejectUnauthorized: false } : false,
      }),
    }),
  });
  return _db;
}
