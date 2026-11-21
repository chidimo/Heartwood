import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Client } from 'pg';
import { requireTestDatabaseUrl } from '../../test-utils/db';
import { runMigrations } from './run-migrations';

// Each test gets its own throwaway database so migrations never touch the shared test DB.
describe('runMigrations (docs/standards/migrations.md)', () => {
  const adminUrl = requireTestDatabaseUrl();
  const dbName = `migrations_${process.pid}_${Date.now()}`;
  const dbUrl = (() => {
    const u = new URL(adminUrl);
    u.pathname = `/${dbName}`;
    return u.toString();
  })();
  let dir: string;

  const withClient = async <T>(url: string, fn: (c: Client) => Promise<T>) => {
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.end();
    }
  };
  const tableExists = (name: string) =>
    withClient(dbUrl, async c => {
      const r = await c.query('select to_regclass($1) as t', [`public.${name}`]);
      return r.rows[0].t !== null;
    });
  const applied = () =>
    withClient(dbUrl, async c => {
      const r = await c.query('select filename from schema_migrations order by filename');
      return r.rows.map(row => row.filename);
    });
  const write = (name: string, sqlText: string) => writeFile(path.join(dir, name), sqlText);

  beforeAll(async () => {
    await withClient(adminUrl, c => c.query(`create database ${dbName}`));
  });
  afterAll(async () => {
    await withClient(adminUrl, c => c.query(`drop database if exists ${dbName} with (force)`));
  });
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'heartwood-migrations-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    await withClient(dbUrl, c => c.query('drop schema public cascade; create schema public'));
  });

  const run = () => runMigrations({ connectionString: dbUrl, migrationsDir: dir });

  it('applies pending migrations in filename order and records them', async () => {
    await write('002_b.up.sql', 'create table b (id int);');
    await write('001_a.up.sql', 'create table a (id int);');
    await write('001_a.down.sql', 'drop table a;');
    await run();
    expect(await applied()).toEqual(['001_a.up.sql', '002_b.up.sql']);
    expect(await tableExists('a')).toBe(true);
    expect(await tableExists('b')).toBe(true);
  });

  it('is idempotent: a second run applies nothing new', async () => {
    await write('001_a.up.sql', 'create table a (id int);');
    await run();
    await expect(run()).resolves.toBeUndefined();
    expect(await applied()).toEqual(['001_a.up.sql']);
  });

  it('keeps earlier migrations when a later one fails, and never attempts the one after', async () => {
    await write('001_ok.up.sql', 'create table ok (id int);');
    await write('002_bad.up.sql', 'create table half (id int); select * from does_not_exist;');
    await write('003_after.up.sql', 'create table after_it (id int);');
    await expect(run()).rejects.toThrow(/does_not_exist/);
    expect(await applied()).toEqual(['001_ok.up.sql']);
    expect(await tableExists('ok')).toBe(true);
    expect(await tableExists('half')).toBe(false); // failing file rolled back entirely
    expect(await tableExists('after_it')).toBe(false);
  });
});
