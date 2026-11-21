import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

export interface RunMigrationsOptions {
  connectionString: string;
  migrationsDir: string;
  onApplied?: (file: string) => void;
}

export const runMigrations = async ({
  connectionString,
  migrationsDir,
  onApplied,
}: RunMigrationsOptions): Promise<void> => {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS public');
    await client.query('SET search_path TO public');
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id serial PRIMARY KEY,
        filename text NOT NULL UNIQUE,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`
    );

    const files = (await readdir(migrationsDir)).filter(file => file.endsWith('.up.sql')).sort();

    for (const file of files) {
      const existing = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [
        file,
      ]);
      if (existing.rowCount && existing.rowCount > 0) {
        continue;
      }

      // Each migration commits (or rolls back) on its own - a failure here
      // must never undo migrations that already committed in this same run,
      // and a failure partway through this file's own statements must never
      // leave it half-applied.
      const contents = await readFile(path.join(migrationsDir, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(contents);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }

      onApplied?.(file);
    }
  } finally {
    client.release();
    await pool.end();
  }
};
