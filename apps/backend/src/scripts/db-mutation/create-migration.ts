import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { migrationsDir } from './migrations-dir';

const name = process.argv[2];
if (!name) {
  console.error('Usage: tsx src/scripts/create-migration.ts <name>');
  process.exit(1);
}

const createMigrationFiles = async () => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace(/T/, '');

  const safeName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const base = `${timestamp}_${safeName}`;

  const upPath = path.join(migrationsDir, `${base}.up.sql`);
  const downPath = path.join(migrationsDir, `${base}.down.sql`);

  const header = `-- Migration: ${base}\n-- Created at: ${new Date().toISOString()}\n\n`;

  await writeFile(upPath, `${header}-- Write migration SQL here\n`);
  await writeFile(downPath, `${header}-- Write rollback SQL here\n`);

  console.log(`Created ${path.basename(upPath)} and ${path.basename(downPath)}`);
};

// Run the async function
createMigrationFiles().catch(console.error);
