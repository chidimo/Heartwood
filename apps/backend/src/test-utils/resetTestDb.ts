import { sql } from 'kysely';
import { getTestDb } from './db';

// Empties every table in `public` except schema_migrations (and any reference data a future
// migration seeds: list those in KEEP). Discovered from the catalog so nobody has to
// remember to register a new table here.
const KEEP = ['schema_migrations'];

export async function resetTestDb(): Promise<void> {
  const db = getTestDb();
  const { rows } = await sql<{ tablename: string }>`
    select tablename from pg_tables where schemaname = 'public'
  `.execute(db);
  const tables = rows.map(r => r.tablename).filter(t => !KEEP.includes(t));
  if (tables.length === 0) return;
  await sql`truncate table ${sql.join(tables.map(t => sql.ref(t)))} restart identity cascade`.execute(
    db
  );
}
