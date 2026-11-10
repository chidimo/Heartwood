import { loginAccount } from '../../modules/account/account.service';
import { getInventoryReport } from '../../modules/inventory/inventory.service';
import { TEST_AUTH_SECRET } from '../../test-utils/test-app';
import { useTestDb } from '../../test-utils/useTestDb';
import { assertLocalDatabase } from './guard';
import { runSeed } from './seed';

describe('dev seed', () => {
  const db = useTestDb();

  const count = async (table: 'asset' | 'beneficiary' | 'executor' | 'allocation' | 'account') => {
    const row = await db
      .selectFrom(table)
      .select(eb => eb.fn.countAll<string>().as('n'))
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow();
    return Number(row.n);
  };

  it('creates every account with its inventory', async () => {
    const results = await runSeed(db);
    expect(results).toEqual([
      { email: 'seed@example.com', created: true, seededInventory: true },
      { email: 'other@example.com', created: true, seededInventory: true },
    ]);
    expect(await count('account')).toBe(2);
    expect(await count('asset')).toBe(6); // 5 + 1
    expect(await count('beneficiary')).toBe(6); // 5 + 1
    expect(await count('executor')).toBe(2);
    expect(await count('allocation')).toBe(2 + 1 + 2 + 1); // flat, camry, shares, other's account
  });

  it('seeds a relationship that is not on the list, with its own words', async () => {
    await runSeed(db);
    const godmother = await db
      .selectFrom('beneficiary')
      .select(['relationship', 'relationship_other'])
      .where('name', '=', 'Mama Ngozi')
      .executeTakeFirstOrThrow();
    expect(godmother).toEqual({ relationship: 'other', relationship_other: 'Godmother' });
  });

  it('seeds a conditional gift with its holder and fallback, and a date of birth', async () => {
    await runSeed(db);
    const gift = await db
      .selectFrom('allocation as a')
      .innerJoin('beneficiary as b', 'b.id', 'a.beneficiary_id')
      .innerJoin('executor as x', 'x.id', 'a.condition_holder_id')
      .select([
        'b.name as person',
        'a.condition_kind',
        'a.condition_min_age',
        'a.condition_if_unmet',
        'x.name as holder',
      ])
      .where('a.condition_kind', 'is not', null)
      .executeTakeFirstOrThrow();
    expect(gift).toEqual({
      person: 'Ada Obi',
      condition_kind: 'min_age',
      condition_min_age: 25,
      condition_if_unmet: 'named_beneficiary',
      holder: 'Barr. Adeyemi',
    });
    const ada = await db
      .selectFrom('beneficiary')
      .select('date_of_birth')
      .where('name', '=', 'Ada Obi')
      .executeTakeFirstOrThrow();
    expect(ada.date_of_birth).not.toBeNull();
  });

  it('seeds data that obeys the rules: nothing in the review needs fixing', async () => {
    await runSeed(db);
    const account = await db
      .selectFrom('account')
      .select('id')
      .where('email', '=', 'seed@example.com')
      .executeTakeFirstOrThrow();
    const report = await getInventoryReport(db, account.id);
    expect(report.ok).toBe(true);
  });

  it('is safe to run again: it duplicates nothing and says so', async () => {
    await runSeed(db);
    const lines: string[] = [];
    const again = await runSeed(db, line => lines.push(line));
    expect(again.every(r => !r.created && !r.seededInventory)).toBe(true);
    expect(await count('account')).toBe(2);
    expect(await count('asset')).toBe(6);
    expect(await count('beneficiary')).toBe(6);
    expect(lines.join('\n')).toMatch(/already has data/);
  });

  it("leaves an existing account's own data alone", async () => {
    await runSeed(db);
    const account = await db
      .selectFrom('account')
      .select('id')
      .where('email', '=', 'seed@example.com')
      .executeTakeFirstOrThrow();
    await db
      .updateTable('asset')
      .set({ deleted_at: new Date() })
      .where('owner_id', '=', account.id)
      .execute();
    await db
      .updateTable('beneficiary')
      .set({ deleted_at: new Date() })
      .where('owner_id', '=', account.id)
      .execute();
    // The account is now empty (everything soft-deleted), so a re-run fills it again rather than skipping.
    const [first] = await runSeed(db);
    expect(first).toMatchObject({ email: 'seed@example.com', seededInventory: true });
  });

  it('seeds accounts whose passwords work and whose data is not shared', async () => {
    await runSeed(db);
    const seed = await loginAccount(
      db,
      { email: 'seed@example.com', password: 'seeded-password-1' },
      TEST_AUTH_SECRET
    );
    const other = await loginAccount(
      db,
      { email: 'other@example.com', password: 'other-password-1' },
      TEST_AUTH_SECRET
    );
    const seedReport = await getInventoryReport(db, seed.account.id);
    const otherReport = await getInventoryReport(db, other.account.id);
    expect(seedReport.issues.map(i => i.subject)).not.toContain('Current account');
    expect(otherReport.issues.map(i => i.subject)).not.toContain('Savings account');
  });
});

describe('assertLocalDatabase', () => {
  it.each([
    'postgresql://u:p@localhost:5434/heartwood',
    'postgresql://u:p@127.0.0.1:5432/heartwood',
    'postgresql://u:p@[::1]:5432/heartwood',
  ])('allows %s', url => {
    expect(() => assertLocalDatabase(url, 'development')).not.toThrow();
  });

  it.each([
    'postgresql://u:p@db.neon.tech/heartwood',
    'postgresql://u:p@10.0.0.5:5432/heartwood',
    'postgresql://u:p@localhost.evil.com/heartwood',
  ])('refuses %s', url => {
    expect(() => assertLocalDatabase(url, 'development')).toThrow(/not local/);
  });

  it('refuses in production even for a local host', () => {
    expect(() => assertLocalDatabase('postgresql://u:p@localhost/x', 'production')).toThrow(
      /production/
    );
  });

  it('needs a URL, and a valid one', () => {
    expect(() => assertLocalDatabase(undefined, 'development')).toThrow(/required/);
    expect(() => assertLocalDatabase('not a url', 'development')).toThrow(/valid URL/);
  });
});
