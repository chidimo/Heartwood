import { Pool } from 'pg';
import { getDb } from '@heartwood/database';
import { migrationsDir } from '../db-mutation/migrations-dir';
import { runMigrations } from '../db-mutation/run-migrations';
import { assertLocalDatabase } from './guard';
import { runSeed } from './seed';

// yarn db:reset: wipes the dev database, re-applies every migration, then seeds it. Local only.
try {
  process.loadEnvFile();
} catch {
  // No .env file: DATABASE_URL must already be in the environment.
}

const main = async () => {
  const url = process.env.DATABASE_URL;
  assertLocalDatabase(url);

  const pool = new Pool({ connectionString: url });
  try {
    console.log('Dropping everything in the public schema...');
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  } finally {
    await pool.end();
  }

  console.log('Applying migrations...');
  await runMigrations({
    connectionString: url as string,
    migrationsDir,
    onApplied: file => console.log(`  applied ${file}`),
  });

  console.log('Seeding...');
  const db = getDb();
  try {
    await runSeed(db, line => console.log(`  ${line}`));
  } finally {
    await db.destroy();
  }
  console.log('Reset finished.');
};

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
