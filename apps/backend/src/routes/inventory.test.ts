import request from 'supertest';
import { INSTITUTION_TYPES } from '@heartwood/shared';
import { createTestApp, registerTestUser } from '../test-utils/test-app';
import { useTestDb } from '../test-utils/useTestDb';

describe('inventory', () => {
  const db = useTestDb();
  const app = createTestApp(db);

  const as = (bearer: string) => ({
    get: (url: string) => request(app).get(url).set('Authorization', bearer),
    post: (url: string, body?: object) =>
      request(app).post(url).set('Authorization', bearer).send(body),
    put: (url: string, body?: object) =>
      request(app).put(url).set('Authorization', bearer).send(body),
    patch: (url: string, body?: object) =>
      request(app).patch(url).set('Authorization', bearer).send(body),
    del: (url: string) => request(app).delete(url).set('Authorization', bearer),
  });

  const newAsset = async (api: ReturnType<typeof as>, overrides: object = {}) =>
    (
      await api.post('/api/assets', {
        type: 'cash',
        description: 'GTBank savings account',
        ...overrides,
      })
    ).body;
  const newBeneficiary = async (api: ReturnType<typeof as>, overrides: object = {}) =>
    (
      await api.post('/api/beneficiaries', {
        name: 'Ngozi Obi',
        relationship: 'Daughter',
        ...overrides,
      })
    ).body;

  describe('authentication', () => {
    it.each([
      ['GET', '/api/assets'],
      ['GET', '/api/beneficiaries'],
      ['GET', '/api/residuary'],
      ['GET', '/api/executors'],
      ['GET', '/api/inventory/report'],
    ])('%s %s needs a signed-in user', async (_method, url) => {
      expect((await request(app).get(url)).status).toBe(401);
    });
  });

  describe('assets', () => {
    it('creates, reads, updates and lists an asset', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const created = await api.post('/api/assets', {
        type: 'property',
        description: '3-bedroom flat, Surulere',
        institution: 'Lagos State Land Registry',
        roughValue: 45000000,
        notes: 'Title deed with the family lawyer',
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ type: 'property', roughValue: 45000000 });

      const id = created.body.id;
      expect((await api.get(`/api/assets/${id}`)).body.description).toBe(
        '3-bedroom flat, Surulere'
      );
      const updated = await api.patch(`/api/assets/${id}`, { roughValue: null, notes: 'Updated' });
      expect(updated.body).toMatchObject({ roughValue: null, notes: 'Updated' });
      expect((await api.get('/api/assets')).body).toHaveLength(1);
    });

    it('rejects an unknown type, an empty description and a negative value', async () => {
      const api = as((await registerTestUser(app)).bearer);
      expect((await api.post('/api/assets', { type: 'boat', description: 'x' })).status).toBe(400);
      expect((await api.post('/api/assets', { type: 'cash', description: '  ' })).status).toBe(400);
      const negative = await api.post('/api/assets', {
        type: 'cash',
        description: 'x',
        roughValue: -1,
      });
      expect(negative.status).toBe(400);
    });

    it('refuses account numbers in free text, without echoing them back', async () => {
      const api = as((await registerTestUser(app)).bearer);
      for (const field of ['description', 'institution', 'notes']) {
        const res = await api.post('/api/assets', {
          type: 'cash',
          description: 'Savings',
          [field]: 'Acct 0123 456 789 0',
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe(`Invalid ${field}: Don't include account numbers`);
        expect(JSON.stringify(res.body)).not.toContain('0123');
      }
      // A short number (a year, a quantity) is fine.
      expect(
        (await api.post('/api/assets', { type: 'vehicle', description: '2014 Camry' })).status
      ).toBe(201);
    });

    it("hides another user's asset: read, update and delete all return 404", async () => {
      const alice = as((await registerTestUser(app)).bearer);
      const bob = as((await registerTestUser(app)).bearer);
      const asset = await newAsset(alice);

      expect((await bob.get(`/api/assets/${asset.id}`)).status).toBe(404);
      expect((await bob.patch(`/api/assets/${asset.id}`, { notes: 'hacked' })).status).toBe(404);
      expect((await bob.del(`/api/assets/${asset.id}`)).status).toBe(404);
      expect((await bob.get('/api/assets')).body).toEqual([]);
      expect((await alice.get(`/api/assets/${asset.id}`)).body.notes).toBeNull();
    });

    it('returns 404 for an id that is not a UUID', async () => {
      const api = as((await registerTestUser(app)).bearer);
      expect((await api.get('/api/assets/not-a-uuid')).status).toBe(404);
    });

    it('soft-deletes: the row stays with who and when, and the asset disappears from the API', async () => {
      const user = await registerTestUser(app);
      const api = as(user.bearer);
      const asset = await newAsset(api);
      expect((await api.del(`/api/assets/${asset.id}`)).status).toBe(204);
      expect((await api.get(`/api/assets/${asset.id}`)).status).toBe(404);
      const row = await db.selectFrom('asset').selectAll().executeTakeFirstOrThrow();
      expect(row.deleted_at).not.toBeNull();
      expect(row.deleted_by).toBe(user.account.id);
    });

    it('audits create, update and delete with the acting user', async () => {
      const user = await registerTestUser(app);
      const api = as(user.bearer);
      const asset = await newAsset(api);
      await api.patch(`/api/assets/${asset.id}`, { notes: 'n' });
      await api.del(`/api/assets/${asset.id}`);
      const log = await db
        .selectFrom('audit_log')
        .select(['actor_id', 'entity', 'action'])
        .where('entity', '=', 'asset')
        .orderBy('created_at')
        .execute();
      expect(log.map(l => l.action)).toEqual(['create', 'update', 'delete']);
      expect(log.every(l => l.actor_id === user.account.id)).toBe(true);
    });
  });

  describe('beneficiaries', () => {
    it('creates one and keeps contingency optional', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const b = await api.post('/api/beneficiaries', { name: 'Chidi', relationship: 'Son' });
      expect(b.status).toBe(201);
      expect(b.body.contingencyPlan).toBeNull();
    });

    it('explains a contingency mismatch with our own message', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const res = await api.post('/api/beneficiaries', {
        name: 'A',
        relationship: 'Son',
        contingencyPlan: 'named_beneficiary',
      });
      expect(res.body.error).toMatch(/^Invalid contingencyBeneficiaryId: /);
    });

    it('requires a fallback beneficiary exactly when the plan is "named_beneficiary"', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const fallback = await newBeneficiary(api, { name: 'Fallback' });
      const missing = await api.post('/api/beneficiaries', {
        name: 'A',
        relationship: 'Son',
        contingencyPlan: 'named_beneficiary',
      });
      expect(missing.status).toBe(400);
      const stray = await api.post('/api/beneficiaries', {
        name: 'A',
        relationship: 'Son',
        contingencyPlan: 'redistribute',
        contingencyBeneficiaryId: fallback.id,
      });
      expect(stray.status).toBe(400);
      const ok = await api.post('/api/beneficiaries', {
        name: 'A',
        relationship: 'Son',
        contingencyPlan: 'named_beneficiary',
        contingencyBeneficiaryId: fallback.id,
      });
      expect(ok.status).toBe(201);
    });

    it("rejects another user's beneficiary as a fallback, and oneself", async () => {
      const alice = as((await registerTestUser(app)).bearer);
      const bob = as((await registerTestUser(app)).bearer);
      const bobs = await newBeneficiary(bob);
      const a = await newBeneficiary(alice);
      const foreign = await alice.patch(`/api/beneficiaries/${a.id}`, {
        contingencyPlan: 'named_beneficiary',
        contingencyBeneficiaryId: bobs.id,
      });
      expect(foreign.status).toBe(422);
      const self = await alice.patch(`/api/beneficiaries/${a.id}`, {
        contingencyPlan: 'named_beneficiary',
        contingencyBeneficiaryId: a.id,
      });
      expect(self.status).toBe(422);
    });

    it("hides another user's beneficiary", async () => {
      const alice = as((await registerTestUser(app)).bearer);
      const bob = as((await registerTestUser(app)).bearer);
      const b = await newBeneficiary(alice);
      expect((await bob.get(`/api/beneficiaries/${b.id}`)).status).toBe(404);
      expect((await bob.patch(`/api/beneficiaries/${b.id}`, { name: 'x' })).status).toBe(404);
      expect((await bob.del(`/api/beneficiaries/${b.id}`)).status).toBe(404);
    });

    it('cannot be deleted while they hold an allocation or are someone’s fallback', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const asset = await newAsset(api);
      const b = await newBeneficiary(api);
      await api.put(`/api/assets/${asset.id}/allocations`, {
        entries: [{ beneficiaryId: b.id, sharePercent: 100 }],
      });
      expect((await api.del(`/api/beneficiaries/${b.id}`)).status).toBe(409);

      await api.put(`/api/assets/${asset.id}/allocations`, { entries: [] });
      const dependent = await newBeneficiary(api, {
        name: 'Dependent',
        contingencyPlan: 'named_beneficiary',
        contingencyBeneficiaryId: b.id,
      });
      expect((await api.del(`/api/beneficiaries/${b.id}`)).status).toBe(409);
      await api.del(`/api/beneficiaries/${dependent.id}`);
      expect((await api.del(`/api/beneficiaries/${b.id}`)).status).toBe(204);
    });
  });

  describe('beneficiary addresses', () => {
    it('are optional, and kept when given', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const without = await newBeneficiary(api);
      expect(without.address).toBeNull();
      const withAddress = await newBeneficiary(api, {
        name: 'Chidi',
        address: '12 Adeola Odeku Street, Victoria Island, Lagos',
      });
      expect(withAddress.address).toBe('12 Adeola Odeku Street, Victoria Island, Lagos');
    });

    it('can be added, changed and cleared', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const b = await newBeneficiary(api);
      const added = await api.patch(`/api/beneficiaries/${b.id}`, { address: 'Plot 4, Ikeja' });
      expect(added.body.address).toBe('Plot 4, Ikeja');
      const cleared = await api.patch(`/api/beneficiaries/${b.id}`, { address: null });
      expect(cleared.body.address).toBeNull();
    });

    it('turns a blank address into none, and refuses an over-long one', async () => {
      const api = as((await registerTestUser(app)).bearer);
      expect((await newBeneficiary(api, { address: '   ' })).address).toBeNull();
      const tooLong = await api.post('/api/beneficiaries', {
        name: 'A',
        relationship: 'Son',
        address: 'x'.repeat(501),
      });
      expect(tooLong.status).toBe(400);
      expect(tooLong.body.error).toBe('Invalid address');
    });

    it('belong to organisations too', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const res = await api.post('/api/beneficiaries', {
        kind: 'institution',
        name: 'Grace Chapel',
        institutionType: 'church',
        address: 'Allen Avenue, Ikeja',
      });
      expect(res.body.address).toBe('Allen Avenue, Ikeja');
    });
  });

  describe('institutional beneficiaries', () => {
    const church = { kind: 'institution', name: 'Grace Chapel, Ikeja', institutionType: 'church' };

    it('creates an organisation: it has a type and no relationship', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const res = await api.post('/api/beneficiaries', church);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        kind: 'institution',
        institutionType: 'church',
        relationship: null,
        name: 'Grace Chapel, Ikeja',
      });
    });

    it.each(INSTITUTION_TYPES)('accepts %s as an organisation type', async institutionType => {
      const api = as((await registerTestUser(app)).bearer);
      const res = await api.post('/api/beneficiaries', { ...church, institutionType });
      expect(res.status).toBe(201);
      expect(res.body.institutionType).toBe(institutionType);
    });

    it('rejects an organisation type we do not have', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const res = await api.post('/api/beneficiaries', { ...church, institutionType: 'casino' });
      expect(res.status).toBe(400);
    });

    it('still creates a person by default, with no type', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const person = await newBeneficiary(api);
      expect(person).toMatchObject({
        kind: 'person',
        institutionType: null,
        relationship: 'Daughter',
      });
    });

    it.each([
      [
        'an organisation without a type',
        { ...church, institutionType: undefined },
        'Invalid institutionType: Choose the kind of organisation',
      ],
      [
        'an organisation with a relationship',
        { ...church, relationship: 'Cousin' },
        'Invalid relationship: An organisation has no relationship to you',
      ],
      [
        'an organisation passing to children',
        { ...church, contingencyPlan: 'pass_to_descendants' },
        'Invalid contingencyPlan: An organisation has no children to pass a gift to',
      ],
      [
        'a person without a relationship',
        { name: 'Ada', kind: 'person' },
        'Invalid relationship: Say how this person is related to you',
      ],
      [
        'a person with an organisation type',
        { name: 'Ada', relationship: 'Aunt', institutionType: 'church' },
        'Invalid institutionType: Only an organisation has a type',
      ],
    ])('rejects %s', async (_label, body, message) => {
      const api = as((await registerTestUser(app)).bearer);
      const res = await api.post('/api/beneficiaries', body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(message);
    });

    it('the database refuses a row the service never saw', async () => {
      const user = await registerTestUser(app);
      const bad = (values: object) =>
        db
          .insertInto('beneficiary')
          .values({ owner_id: user.account.id, name: 'X', ...values } as never)
          .execute();
      await expect(
        bad({ kind: 'institution', institution_type: 'church', relationship: 'Cousin' })
      ).rejects.toThrow();
      await expect(bad({ kind: 'institution', institution_type: null })).rejects.toThrow();
      await expect(
        bad({ kind: 'person', relationship: 'Son', institution_type: 'church' })
      ).rejects.toThrow();
      await expect(
        bad({
          kind: 'institution',
          institution_type: 'church',
          contingency_plan: 'pass_to_descendants',
        })
      ).rejects.toThrow();
    });

    it('can receive a share of an asset and of the residuary', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const asset = await newAsset(api);
      const org = (await api.post('/api/beneficiaries', church)).body;
      const person = await newBeneficiary(api);
      const split = await api.put(`/api/assets/${asset.id}/allocations`, {
        entries: [
          { beneficiaryId: org.id, sharePercent: 10 },
          { beneficiaryId: person.id, sharePercent: 90 },
        ],
      });
      expect(split.status).toBe(200);
      const rest = await api.put('/api/residuary', {
        entries: [{ beneficiaryId: org.id, sharePercent: 100 }],
      });
      expect(rest.status).toBe(200);
    });

    it('can be a named fallback, and can name a person as theirs', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const org = (await api.post('/api/beneficiaries', church)).body;
      const person = await newBeneficiary(api, {
        contingencyPlan: 'named_beneficiary',
        contingencyBeneficiaryId: org.id,
      });
      expect(person.contingencyBeneficiaryId).toBe(org.id);
      const orgWithFallback = await api.patch(`/api/beneficiaries/${org.id}`, {
        contingencyPlan: 'named_beneficiary',
        contingencyBeneficiaryId: person.id,
      });
      expect(orgWithFallback.status).toBe(200);
    });

    it('can be renamed and retyped, but never gains a relationship or a "pass to children" plan', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const org = (await api.post('/api/beneficiaries', church)).body;
      const renamed = await api.patch(`/api/beneficiaries/${org.id}`, {
        name: 'Grace Chapel International',
        institutionType: 'charity',
      });
      expect(renamed.body).toMatchObject({
        name: 'Grace Chapel International',
        institutionType: 'charity',
      });
      expect(
        (await api.patch(`/api/beneficiaries/${org.id}`, { relationship: 'Cousin' })).status
      ).toBe(422);
      const children = await api.patch(`/api/beneficiaries/${org.id}`, {
        contingencyPlan: 'pass_to_descendants',
      });
      expect(children.status).toBe(422);
    });

    it('a person cannot be turned into an organisation or lose their relationship', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const person = await newBeneficiary(api);
      expect(
        (await api.patch(`/api/beneficiaries/${person.id}`, { institutionType: 'church' })).status
      ).toBe(422);
      expect(
        (await api.patch(`/api/beneficiaries/${person.id}`, { relationship: null })).status
      ).toBe(422);
    });

    it("words the report for an organisation, and hides another user's", async () => {
      const alice = as((await registerTestUser(app)).bearer);
      const bob = as((await registerTestUser(app)).bearer);
      await alice.post('/api/beneficiaries', church);
      const issues = (await alice.get('/api/inventory/report')).body.issues;
      expect(issues).toContainEqual(
        expect.objectContaining({
          code: 'beneficiary_no_contingency',
          subject: 'Grace Chapel, Ikeja',
          message: 'No plan for if this organisation no longer exists.',
        })
      );
      expect((await bob.get('/api/beneficiaries')).body).toEqual([]);
    });
  });

  describe('allocations', () => {
    it('accepts shares that total exactly 100%', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const asset = await newAsset(api);
      const [a, b, c] = [
        await newBeneficiary(api, { name: 'A' }),
        await newBeneficiary(api, { name: 'B' }),
        await newBeneficiary(api, { name: 'C' }),
      ];
      const res = await api.put(`/api/assets/${asset.id}/allocations`, {
        entries: [
          { beneficiaryId: a.id, sharePercent: 33.33 },
          { beneficiaryId: b.id, sharePercent: 33.33 },
          { beneficiaryId: c.id, sharePercent: 33.34 },
        ],
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });

    it.each([
      ['under 100', [50, 49.99]],
      ['over 100', [60, 50]],
    ])('rejects shares that total %s', async (_label, shares) => {
      const api = as((await registerTestUser(app)).bearer);
      const asset = await newAsset(api);
      const entries = [];
      for (const share of shares) {
        entries.push({ beneficiaryId: (await newBeneficiary(api)).id, sharePercent: share });
      }
      const res = await api.put(`/api/assets/${asset.id}/allocations`, { entries });
      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Shares must total exactly 100%');
    });

    it('accepts a single specific bequest, but not mixed with other entries', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const asset = await newAsset(api, { type: 'vehicle', description: 'Toyota Camry' });
      const a = await newBeneficiary(api, { name: 'A' });
      const b = await newBeneficiary(api, { name: 'B' });
      const single = await api.put(`/api/assets/${asset.id}/allocations`, {
        entries: [{ beneficiaryId: a.id, specificBequest: 'The Camry, with its documents' }],
      });
      expect(single.status).toBe(200);
      const mixed = await api.put(`/api/assets/${asset.id}/allocations`, {
        entries: [
          { beneficiaryId: a.id, specificBequest: 'The Camry' },
          { beneficiaryId: b.id, sharePercent: 50 },
        ],
      });
      expect(mixed.status).toBe(422);
    });

    it('rejects a duplicate beneficiary, an entry with both or neither, and more than 2 decimals', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const asset = await newAsset(api);
      const a = await newBeneficiary(api);
      const put = (entries: object[]) =>
        api.put(`/api/assets/${asset.id}/allocations`, { entries });
      expect(
        (
          await put([
            { beneficiaryId: a.id, sharePercent: 50 },
            { beneficiaryId: a.id, sharePercent: 50 },
          ])
        ).status
      ).toBe(422);
      expect(
        (await put([{ beneficiaryId: a.id, sharePercent: 100, specificBequest: 'x' }])).status
      ).toBe(400);
      expect((await put([{ beneficiaryId: a.id }])).status).toBe(400);
      expect((await put([{ beneficiaryId: a.id, sharePercent: 33.333 }])).status).toBe(400);
    });

    it("rejects another user's beneficiary and another user's asset", async () => {
      const alice = as((await registerTestUser(app)).bearer);
      const bob = as((await registerTestUser(app)).bearer);
      const asset = await newAsset(alice);
      const bobs = await newBeneficiary(bob);
      const foreignBeneficiary = await alice.put(`/api/assets/${asset.id}/allocations`, {
        entries: [{ beneficiaryId: bobs.id, sharePercent: 100 }],
      });
      expect(foreignBeneficiary.status).toBe(422);
      const mine = await newBeneficiary(alice);
      const foreignAsset = await bob.put(`/api/assets/${asset.id}/allocations`, {
        entries: [{ beneficiaryId: mine.id, sharePercent: 100 }],
      });
      expect(foreignAsset.status).toBe(404);
      expect((await bob.get(`/api/assets/${asset.id}/allocations`)).status).toBe(404);
    });

    it('replaces atomically: a rejected update leaves the previous allocation in place', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const asset = await newAsset(api);
      const a = await newBeneficiary(api);
      await api.put(`/api/assets/${asset.id}/allocations`, {
        entries: [{ beneficiaryId: a.id, sharePercent: 100 }],
      });
      await api.put(`/api/assets/${asset.id}/allocations`, {
        entries: [{ beneficiaryId: a.id, sharePercent: 40 }],
      });
      const current = await api.get(`/api/assets/${asset.id}/allocations`);
      expect(current.body).toEqual([
        { beneficiaryId: a.id, sharePercent: 100, specificBequest: null },
      ]);
    });

    it('deleting an asset removes its allocations', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const asset = await newAsset(api);
      const a = await newBeneficiary(api);
      await api.put(`/api/assets/${asset.id}/allocations`, {
        entries: [{ beneficiaryId: a.id, sharePercent: 100 }],
      });
      await api.del(`/api/assets/${asset.id}`);
      expect((await api.del(`/api/beneficiaries/${a.id}`)).status).toBe(204);
    });
  });

  describe('residuary', () => {
    it('accepts shares totalling 100% and rejects anything else', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const a = await newBeneficiary(api, { name: 'A' });
      const b = await newBeneficiary(api, { name: 'B' });
      const ok = await api.put('/api/residuary', {
        entries: [
          { beneficiaryId: a.id, sharePercent: 70 },
          { beneficiaryId: b.id, sharePercent: 30 },
        ],
      });
      expect(ok.status).toBe(200);
      expect((await api.get('/api/residuary')).body).toHaveLength(2);
      const bad = await api.put('/api/residuary', {
        entries: [{ beneficiaryId: a.id, sharePercent: 90 }],
      });
      expect(bad.status).toBe(422);
    });

    it('is private to its owner', async () => {
      const alice = as((await registerTestUser(app)).bearer);
      const bob = as((await registerTestUser(app)).bearer);
      const a = await newBeneficiary(alice);
      await alice.put('/api/residuary', { entries: [{ beneficiaryId: a.id, sharePercent: 100 }] });
      expect((await bob.get('/api/residuary')).body).toEqual([]);
    });
  });

  describe('executors', () => {
    it('creates, updates, lists and deletes, privately', async () => {
      const alice = as((await registerTestUser(app)).bearer);
      const bob = as((await registerTestUser(app)).bearer);
      const created = await alice.post('/api/executors', { kind: 'lawyer', name: 'Barr. Adeyemi' });
      expect(created.status).toBe(201);
      expect((await bob.get('/api/executors')).body).toEqual([]);
      expect((await bob.patch(`/api/executors/${created.body.id}`, { name: 'x' })).status).toBe(
        404
      );
      expect((await bob.del(`/api/executors/${created.body.id}`)).status).toBe(404);
      const updated = await alice.patch(`/api/executors/${created.body.id}`, {
        contact: '0803 000 0000',
      });
      expect(updated.body.contact).toBe('0803 000 0000');
      expect((await alice.del(`/api/executors/${created.body.id}`)).status).toBe(204);
      expect((await alice.get('/api/executors')).body).toEqual([]);
    });
  });

  describe('inventory report', () => {
    it('is ok and empty for a new user', async () => {
      const api = as((await registerTestUser(app)).bearer);
      expect((await api.get('/api/inventory/report')).body).toEqual({ ok: true, issues: [] });
    });

    it('errors on an asset nothing covers, and downgrades it to info once a residuary exists', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const asset = await newAsset(api);
      const b = await newBeneficiary(api);
      const before = (await api.get('/api/inventory/report')).body;
      expect(before.ok).toBe(false);
      expect(before.issues).toContainEqual(
        expect.objectContaining({ code: 'asset_uncovered', severity: 'error', id: asset.id })
      );
      await api.put('/api/residuary', { entries: [{ beneficiaryId: b.id, sharePercent: 100 }] });
      const after = (await api.get('/api/inventory/report')).body;
      expect(after.ok).toBe(true);
      expect(after.issues).toContainEqual(
        expect.objectContaining({ code: 'asset_unallocated', severity: 'info', id: asset.id })
      );
    });

    it('names what each issue is about', async () => {
      const api = as((await registerTestUser(app)).bearer);
      await newAsset(api, { description: 'Savings at GTBank' });
      await newBeneficiary(api, { name: 'Ngozi Obi' });
      const issues = (await api.get('/api/inventory/report')).body.issues;
      expect(issues).toContainEqual(
        expect.objectContaining({ code: 'asset_uncovered', subject: 'Savings at GTBank' })
      );
      expect(issues).toContainEqual(
        expect.objectContaining({ code: 'beneficiary_no_contingency', subject: 'Ngozi Obi' })
      );
    });

    it('asks for a beneficiary when there are assets and none', async () => {
      const api = as((await registerTestUser(app)).bearer);
      await newAsset(api);
      const codes = (await api.get('/api/inventory/report')).body.issues.map(
        (i: { code: string }) => i.code
      );
      expect(codes).toContain('no_beneficiaries');
    });

    it('warns about a beneficiary with no contingency and flags one receiving nothing', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const b = await newBeneficiary(api);
      const issues = (await api.get('/api/inventory/report')).body.issues;
      expect(issues).toContainEqual(
        expect.objectContaining({
          code: 'beneficiary_no_contingency',
          severity: 'warning',
          id: b.id,
        })
      );
      expect(issues).toContainEqual(
        expect.objectContaining({ code: 'beneficiary_unused', id: b.id })
      );
      await api.patch(`/api/beneficiaries/${b.id}`, { contingencyPlan: 'redistribute' });
      const after = (await api.get('/api/inventory/report')).body.issues;
      expect(after.map((i: { code: string }) => i.code)).not.toContain(
        'beneficiary_no_contingency'
      );
    });

    it("never includes another user's records", async () => {
      const alice = as((await registerTestUser(app)).bearer);
      const bob = as((await registerTestUser(app)).bearer);
      await newAsset(alice);
      await newBeneficiary(alice);
      expect((await bob.get('/api/inventory/report')).body).toEqual({ ok: true, issues: [] });
    });
  });
});
