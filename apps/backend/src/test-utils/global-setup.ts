import { migrationsDir } from '../scripts/db-mutation/migrations-dir';
import { runMigrations } from '../scripts/db-mutation/run-migrations';
import { requireTestDatabaseUrl } from './db';

// Runs once per test run. runMigrations is idempotent, so a container that is already
// migrated from an earlier run is fine.
export default async function globalSetup(): Promise<void> {
  await runMigrations({ connectionString: requireTestDatabaseUrl(), migrationsDir });
}
