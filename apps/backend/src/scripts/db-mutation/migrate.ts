import { runMigrations } from './run-migrations';
import { migrationsDir } from './migrations-dir';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

runMigrations({
  connectionString,
  migrationsDir,
  onApplied: file => console.log(`Applied migration file: ${file}`),
}).catch(error => {
  console.error(error);
  process.exit(1);
});
