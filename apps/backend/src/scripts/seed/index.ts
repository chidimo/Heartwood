import { getDb } from '@heartwood/database';
import { assertLocalDatabase } from './guard';
import { runSeed } from './seed';

// yarn db:seed: loads the dev seed data (see ./README.md). Local databases only.
try {
  process.loadEnvFile();
} catch {
  // No .env file: DATABASE_URL must already be in the environment.
}

const main = async () => {
  assertLocalDatabase(process.env.DATABASE_URL);
  const db = getDb();
  try {
    await runSeed(db, line => console.log(line));
    console.log('Seed finished.');
  } finally {
    await db.destroy();
  }
};

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
