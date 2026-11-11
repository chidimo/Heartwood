import request from 'supertest';
import { INSTITUTION_TYPES, RELATIONSHIPS, ageInYears } from '@heartwood/shared';
import { createTestApp, registerTestUser } from '../test-utils/test-app';
import { useTestDb } from '../test-utils/useTestDb';
import { addDirectoryEntries } from '../modules/organization-directory/organization-directory.service';

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
        relationship: 'daughter',
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

    it('defaults to naira, stores a chosen currency and decimals, and rejects an unknown one', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const naira = await api.post('/api/assets', { type: 'cash', description: 'Savings' });
      expect(naira.body.currency).toBe('NGN');
      const usd = await api.post('/api/assets', {
        type: 'cash',
        description: 'Dollar account',
        currency: 'USD',
        roughValue: 1250.5,
      });
      expect(usd.body).toMatchObject({ currency: 'USD', roughValue: 1250.5 });
      const changed = await api.patch(`/api/assets/${usd.body.id}`, { currency: 'GBP' });
      expect(changed.body.currency).toBe('GBP');
      const bad = await api.post('/api/assets', {
        type: 'cash',
        description: 'x',
        currency: 'XYZ',
      });
      expect(bad.status).toBe(400);
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
      const b = await api.post('/api/beneficiaries', { name: 'Chidi', relationship: 'son' });
      expect(b.status).toBe(201);
      expect(b.body.contingencyPlan).toBeNull();
    });

    it('explains a contingency mismatch with our own message', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const res = await api.post('/api/beneficiaries', {
        name: 'A',
        relationship: 'son',
        contingencyPlan: 'named_beneficiary',
      });
      expect(res.body.error).toMatch(/^Invalid contingencyBeneficiaryId: /);
    });

    it('requires a fallback beneficiary exactly when the plan is "named_beneficiary"', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const fallback = await newBeneficiary(api, { name: 'Fallback' });
      const missing = await api.post('/api/beneficiaries', {
        name: 'A',
        relationship: 'son',
        contingencyPlan: 'named_beneficiary',
      });
      expect(missing.status).toBe(400);
      const stray = await api.post('/api/beneficiaries', {
        name: 'A',
        relationship: 'son',
        contingencyPlan: 'redistribute',
        contingencyBeneficiaryId: fallback.id,
      });
      expect(stray.status).toBe(400);
      const ok = await api.post('/api/beneficiaries', {
        name: 'A',
        relationship: 'son',
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
        relationship: 'son',
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

  describe('relationships', () => {
    const person = { name: 'Mama Ngozi', relationship: 'other', relationshipOther: 'Godmother' };

    it.each(RELATIONSHIPS.filter(r => r !== 'other'))(
      'accepts "%s" with no extra words',
      async relationship => {
        const api = as((await registerTestUser(app)).bearer);
        const res = await api.post('/api/beneficiaries', { name: 'A', relationship });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ relationship, relationshipOther: null });
      }
    );

    it('accepts "other" with the words, and returns both', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const res = await api.post('/api/beneficiaries', person);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ relationship: 'other', relationshipOther: 'Godmother' });
    });

    it.each([
      [
        'a relationship that is not on the list',
        { name: 'A', relationship: 'Godmother' },
        'Invalid relationship',
      ],
      [
        '"other" with no words',
        { name: 'A', relationship: 'other' },
        'Invalid relationshipOther: Say what the relationship is',
      ],
      [
        '"other" with blank words',
        { name: 'A', relationship: 'other', relationshipOther: '   ' },
        'Invalid relationshipOther: Say what the relationship is',
      ],
      [
        'words on a listed relationship',
        { name: 'A', relationship: 'son', relationshipOther: 'Eldest' },
        'Invalid relationshipOther: Only "other" needs the relationship in words',
      ],
      [
        'words over 100 characters',
        { name: 'A', relationship: 'other', relationshipOther: 'x'.repeat(101) },
        'Invalid relationshipOther',
      ],
    ])('rejects %s', async (_label, body, message) => {
      const api = as((await registerTestUser(app)).bearer);
      const res = await api.post('/api/beneficiaries', body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(message);
    });

    it('the database refuses a pair the service never saw', async () => {
      const user = await registerTestUser(app);
      const bad = (values: object) =>
        db
          .insertInto('beneficiary')
          .values({ owner_id: user.account.id, name: 'X', kind: 'person', ...values } as never)
          .execute();
      await expect(bad({ relationship: 'godmother' })).rejects.toThrow();
      await expect(bad({ relationship: 'other' })).rejects.toThrow();
      await expect(bad({ relationship: 'son', relationship_other: 'Eldest' })).rejects.toThrow();
      await expect(
        bad({ relationship: 'other', relationship_other: 'Godmother' })
      ).resolves.toBeDefined();
    });

    it('can change between a listed relationship and "other"', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const b = await newBeneficiary(api);
      const toOther = await api.patch(`/api/beneficiaries/${b.id}`, {
        relationship: 'other',
        relationshipOther: 'Godmother',
      });
      expect(toOther.body).toMatchObject({ relationship: 'other', relationshipOther: 'Godmother' });
      const back = await api.patch(`/api/beneficiaries/${b.id}`, {
        relationship: 'friend',
        relationshipOther: null,
      });
      expect(back.body).toMatchObject({ relationship: 'friend', relationshipOther: null });
    });

    it('refuses an update that leaves "other" without words, or words without "other"', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const b = await newBeneficiary(api);
      expect(
        (await api.patch(`/api/beneficiaries/${b.id}`, { relationship: 'other' })).status
      ).toBe(422);
      expect(
        (await api.patch(`/api/beneficiaries/${b.id}`, { relationshipOther: 'Eldest' })).status
      ).toBe(422);
      const other = (await api.post('/api/beneficiaries', person)).body;
      expect(
        (await api.patch(`/api/beneficiaries/${other.id}`, { relationshipOther: null })).status
      ).toBe(422);
      expect(
        (await api.patch(`/api/beneficiaries/${other.id}`, { relationshipOther: 'Mentor' })).body
          .relationshipOther
      ).toBe('Mentor');
    });

    it('does not apply to an organisation', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const res = await api.post('/api/beneficiaries', {
        kind: 'institution',
        name: 'Grace Chapel',
        institutionType: 'church',
        relationshipOther: 'Our church',
      });
      expect(res.status).toBe(400);
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
        relationship: 'daughter',
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
        { ...church, relationship: 'cousin' },
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
        { name: 'Ada', relationship: 'aunt', institutionType: 'church' },
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
        bad({ kind: 'institution', institution_type: 'church', relationship: 'cousin' })
      ).rejects.toThrow();
      await expect(bad({ kind: 'institution', institution_type: null })).rejects.toThrow();
      await expect(
        bad({ kind: 'person', relationship: 'son', institution_type: 'church' })
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
        (await api.patch(`/api/beneficiaries/${org.id}`, { relationship: 'cousin' })).status
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

  describe('gift conditions', () => {
    const today = new Date();
    const yearsAgo = (n: number) =>
      `${today.getFullYear() - n}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

    // An asset, two people, and a lawyer to hold things.
    const setup = async () => {
      const user = await registerTestUser(app);
      const api = as(user.bearer);
      const asset = await newAsset(api);
      const ada = await newBeneficiary(api, { name: 'Ada' });
      const chidi = await newBeneficiary(api, { name: 'Chidi' });
      const lawyer = (await api.post('/api/executors', { kind: 'lawyer', name: 'Barr. Adeyemi' }))
        .body;
      const put = (entries: object[]) =>
        api.put(`/api/assets/${asset.id}/allocations`, { entries });
      const minAge = (extra: object = {}) => ({
        kind: 'min_age',
        minAge: 25,
        ifUnmet: 'redistribute',
        holderId: lawyer.id,
        ...extra,
      });
      return { user, api, asset, ada, chidi, lawyer, put, minAge };
    };

    it('saves a minimum-age condition on a share and returns it', async () => {
      const { put, ada, minAge, lawyer } = await setup();
      const res = await put([{ beneficiaryId: ada.id, sharePercent: 100, condition: minAge() }]);
      expect(res.status).toBe(200);
      expect(res.body[0].condition).toEqual({
        kind: 'min_age',
        minAge: 25,
        text: null,
        ifUnmet: 'redistribute',
        fallbackBeneficiaryId: null,
        holderId: lawyer.id,
      });
    });

    it('saves a free-text condition, and one on a specific bequest', async () => {
      const { put, ada, lawyer } = await setup();
      const res = await put([
        {
          beneficiaryId: ada.id,
          specificBequest: 'The Camry',
          condition: {
            kind: 'other',
            text: 'When she has finished her degree',
            ifUnmet: 'residuary',
            holderId: lawyer.id,
          },
        },
      ]);
      expect(res.status).toBe(200);
      expect(res.body[0].condition).toMatchObject({
        kind: 'other',
        text: 'When she has finished her degree',
        ifUnmet: 'residuary',
      });
    });

    it('lets "if unmet" name a fallback person, and only then', async () => {
      const { put, ada, chidi, minAge } = await setup();
      const named = await put([
        {
          beneficiaryId: ada.id,
          sharePercent: 100,
          condition: minAge({ ifUnmet: 'named_beneficiary', fallbackBeneficiaryId: chidi.id }),
        },
      ]);
      expect(named.status).toBe(200);
      expect(named.body[0].condition.fallbackBeneficiaryId).toBe(chidi.id);

      const missing = await put([
        {
          beneficiaryId: ada.id,
          sharePercent: 100,
          condition: minAge({ ifUnmet: 'named_beneficiary' }),
        },
      ]);
      expect(missing.status).toBe(400);
      expect(missing.body.error).toMatch(/^Invalid .*fallbackBeneficiaryId: Name who receives it/);

      const stray = await put([
        {
          beneficiaryId: ada.id,
          sharePercent: 100,
          condition: minAge({ fallbackBeneficiaryId: chidi.id }),
        },
      ]);
      expect(stray.status).toBe(400);
    });

    it.each([
      ['an age of 0', { minAge: 0 }],
      ['an age over 100', { minAge: 101 }],
      ['a fractional age', { minAge: 24.5 }],
      ['no holder', { holderId: undefined }],
      ['an unknown "if unmet" plan', { ifUnmet: 'forfeit' }],
    ])('rejects %s', async (_label, bad) => {
      const { put, ada, minAge } = await setup();
      const res = await put([{ beneficiaryId: ada.id, sharePercent: 100, condition: minAge(bad) }]);
      expect(res.status).toBe(400);
    });

    it('rejects an empty free-text condition', async () => {
      const { put, ada, lawyer } = await setup();
      const res = await put([
        {
          beneficiaryId: ada.id,
          sharePercent: 100,
          condition: { kind: 'other', text: '   ', ifUnmet: 'residuary', holderId: lawyer.id },
        },
      ]);
      expect(res.status).toBe(400);
    });

    it("refuses another user's executor as holder, and another user's person as fallback", async () => {
      const { put, ada, minAge } = await setup();
      const bob = as((await registerTestUser(app)).bearer);
      const bobsLawyer = (await bob.post('/api/executors', { kind: 'lawyer', name: 'Barr. Bello' }))
        .body;
      const bobsPerson = await newBeneficiary(bob, { name: 'Bola' });
      const holder = await put([
        {
          beneficiaryId: ada.id,
          sharePercent: 100,
          condition: minAge({ holderId: bobsLawyer.id }),
        },
      ]);
      expect(holder.status).toBe(422);
      expect(holder.body.error).toBe('Holder not found');
      const fallback = await put([
        {
          beneficiaryId: ada.id,
          sharePercent: 100,
          condition: minAge({ ifUnmet: 'named_beneficiary', fallbackBeneficiaryId: bobsPerson.id }),
        },
      ]);
      expect(fallback.status).toBe(422);
    });

    it('refuses a gift that falls back to the person it is for', async () => {
      const { put, ada, minAge } = await setup();
      const res = await put([
        {
          beneficiaryId: ada.id,
          sharePercent: 100,
          condition: minAge({ ifUnmet: 'named_beneficiary', fallbackBeneficiaryId: ada.id }),
        },
      ]);
      expect(res.status).toBe(422);
    });

    it('the database refuses a half-filled condition the service never saw', async () => {
      const { user, asset, ada, lawyer } = await setup();
      const bad = (values: object) =>
        db
          .insertInto('allocation')
          .values({
            owner_id: user.account.id,
            asset_id: asset.id,
            beneficiary_id: ada.id,
            share_percent: 100,
            ...values,
          } as never)
          .execute();
      const ok = {
        condition_kind: 'min_age',
        condition_min_age: 21,
        condition_if_unmet: 'residuary',
        condition_holder_id: lawyer.id,
      };
      await expect(bad({ ...ok, condition_holder_id: null })).rejects.toThrow();
      await expect(bad({ ...ok, condition_if_unmet: null })).rejects.toThrow();
      await expect(bad({ ...ok, condition_min_age: null })).rejects.toThrow();
      await expect(bad({ ...ok, condition_if_unmet: 'named_beneficiary' })).rejects.toThrow();
      await expect(bad({ condition_min_age: 21 })).rejects.toThrow();
      // The kind decides which numbers belong:
      await expect(bad({ ...ok, condition_days: 30 })).rejects.toThrow(); // days only for "survives"
      await expect(bad({ ...ok, condition_kind: 'marriage' })).rejects.toThrow(); // an age only for "min_age"
      await expect(
        bad({ ...ok, condition_kind: 'survives', condition_min_age: null })
      ).rejects.toThrow(); // "survives" needs its days
      await expect(
        bad({ ...ok, condition_kind: 'other', condition_min_age: null })
      ).rejects.toThrow(); // "other" needs its words
      await expect(bad({ ...ok, condition_kind: 'honesty' })).rejects.toThrow(); // not a kind
      await expect(bad(ok)).resolves.toBeDefined();
    });

    it.each([
      { kind: 'marriage' },
      { kind: 'education', text: 'University of Lagos' },
      { kind: 'nysc' },
      { kind: 'survives', days: 30 },
      { kind: 'min_age', minAge: 18, text: 'or earlier if she marries' },
      { kind: 'other', text: 'She looks after my mother' },
    ])('saves and returns %j', async shape => {
      const { put, ada, lawyer } = await setup();
      const res = await put([
        {
          beneficiaryId: ada.id,
          sharePercent: 100,
          condition: { ifUnmet: 'residuary', holderId: lawyer.id, ...shape },
        },
      ]);
      expect(res.status).toBe(200);
      expect(res.body[0].condition).toMatchObject(shape);
    });

    it('stores no note as null, and keeps an optional note only on kinds that allow one', async () => {
      const { put, ada, lawyer } = await setup();
      const res = await put([
        {
          beneficiaryId: ada.id,
          sharePercent: 100,
          condition: { kind: 'marriage', ifUnmet: 'residuary', holderId: lawyer.id, text: '   ' },
        },
      ]);
      expect(res.body[0].condition.text).toBeNull();
    });

    it.each([
      ['survives with no days', { kind: 'survives' }],
      ['survives with 0 days', { kind: 'survives', days: 0 }],
      ['survives with more than a year', { kind: 'survives', days: 366 }],
      ['survives with fractional days', { kind: 'survives', days: 1.5 }],
      ['"other" with no words', { kind: 'other' }],
      ['an unknown kind', { kind: 'honesty' }],
      ['a note over 500 characters', { kind: 'marriage', text: 'x'.repeat(501) }],
    ])('rejects %s', async (_label, shape) => {
      const { put, ada, lawyer } = await setup();
      const res = await put([
        {
          beneficiaryId: ada.id,
          sharePercent: 100,
          condition: { ifUnmet: 'residuary', holderId: lawyer.id, ...shape },
        },
      ]);
      expect(res.status).toBe(400);
    });

    it('a seed-style conditional gift of every kind survives a save and reload together', async () => {
      const { put, api, asset, ada, chidi, lawyer } = await setup();
      const both = await put([
        {
          beneficiaryId: ada.id,
          sharePercent: 50,
          condition: { kind: 'nysc', ifUnmet: 'redistribute', holderId: lawyer.id },
        },
        {
          beneficiaryId: chidi.id,
          sharePercent: 50,
          condition: { kind: 'survives', days: 30, ifUnmet: 'residuary', holderId: lawyer.id },
        },
      ]);
      expect(both.status).toBe(200);
      const reloaded = await api.get(`/api/assets/${asset.id}/allocations`);
      expect(
        reloaded.body.map((a: { condition: { kind: string } }) => a.condition.kind).sort()
      ).toEqual(['nysc', 'survives']);
    });

    it('saving without a condition clears the old one', async () => {
      const { put, api, asset, ada, minAge } = await setup();
      await put([{ beneficiaryId: ada.id, sharePercent: 100, condition: minAge() }]);
      await put([{ beneficiaryId: ada.id, sharePercent: 100 }]);
      const now = await api.get(`/api/assets/${asset.id}/allocations`);
      expect(now.body[0].condition).toBeNull();
    });

    it('stops you removing an executor who is holding a gift, until it is released', async () => {
      const { put, api, ada, lawyer, minAge } = await setup();
      await put([{ beneficiaryId: ada.id, sharePercent: 100, condition: minAge() }]);
      const blocked = await api.del(`/api/executors/${lawyer.id}`);
      expect(blocked.status).toBe(409);
      await put([{ beneficiaryId: ada.id, sharePercent: 100 }]);
      expect((await api.del(`/api/executors/${lawyer.id}`)).status).toBe(204);
    });

    it("stops you removing a person who is a gift's fallback", async () => {
      const { put, api, ada, chidi, minAge } = await setup();
      await put([
        {
          beneficiaryId: ada.id,
          sharePercent: 100,
          condition: minAge({ ifUnmet: 'named_beneficiary', fallbackBeneficiaryId: chidi.id }),
        },
      ]);
      expect((await api.del(`/api/beneficiaries/${chidi.id}`)).status).toBe(409);
    });

    it('warns when an age condition cannot be checked, and stops once the date of birth is known', async () => {
      const { put, api, ada, minAge } = await setup();
      await put([{ beneficiaryId: ada.id, sharePercent: 100, condition: minAge() }]);
      const codes = async () =>
        (await api.get('/api/inventory/report')).body.issues.map((i: { code: string }) => i.code);
      expect(await codes()).toContain('gift_age_unverifiable');
      await api.patch(`/api/beneficiaries/${ada.id}`, { dateOfBirth: yearsAgo(30) });
      expect(await codes()).not.toContain('gift_age_unverifiable');
    });

    it('warns about a gift to someone under 18 with no condition, not once it has one', async () => {
      const { put, api, ada, minAge } = await setup();
      await api.patch(`/api/beneficiaries/${ada.id}`, { dateOfBirth: yearsAgo(10) });
      await put([{ beneficiaryId: ada.id, sharePercent: 100 }]);
      const report = async () => (await api.get('/api/inventory/report')).body.issues;
      expect(await report()).toContainEqual(
        expect.objectContaining({
          code: 'gift_to_minor_unconditional',
          severity: 'warning',
          message: expect.stringContaining('Ada is under 18'),
        })
      );
      await put([{ beneficiaryId: ada.id, sharePercent: 100, condition: minAge() }]);
      expect((await report()).map((i: { code: string }) => i.code)).not.toContain(
        'gift_to_minor_unconditional'
      );
    });

    it("never warns about an adult's unconditional gift", async () => {
      const { put, api, ada } = await setup();
      await api.patch(`/api/beneficiaries/${ada.id}`, { dateOfBirth: yearsAgo(40) });
      await put([{ beneficiaryId: ada.id, sharePercent: 100 }]);
      const codes = (await api.get('/api/inventory/report')).body.issues.map(
        (i: { code: string }) => i.code
      );
      expect(codes).not.toContain('gift_to_minor_unconditional');
    });
  });

  describe('date of birth', () => {
    it('is optional and kept exactly as given', async () => {
      const api = as((await registerTestUser(app)).bearer);
      expect((await newBeneficiary(api)).dateOfBirth).toBeNull();
      const b = await newBeneficiary(api, { name: 'Chidi', dateOfBirth: '2012-06-15' });
      expect(b.dateOfBirth).toBe('2012-06-15');
      expect((await api.get(`/api/beneficiaries/${b.id}`)).body.dateOfBirth).toBe('2012-06-15');
    });

    it('can be set and cleared on an existing person', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const b = await newBeneficiary(api);
      const set = await api.patch(`/api/beneficiaries/${b.id}`, { dateOfBirth: '1990-01-31' });
      expect(set.body.dateOfBirth).toBe('1990-01-31');
      const cleared = await api.patch(`/api/beneficiaries/${b.id}`, { dateOfBirth: null });
      expect(cleared.body.dateOfBirth).toBeNull();
    });

    it.each([
      ['a date in the future', '2999-01-01'],
      ['a date that does not exist', '2023-02-30'],
      ['a date before 1900', '1899-12-31'],
      ['the wrong format', '15/06/2012'],
    ])('rejects %s', async (_label, dateOfBirth) => {
      const api = as((await registerTestUser(app)).bearer);
      const res = await api.post('/api/beneficiaries', {
        name: 'A',
        relationship: 'son',
        dateOfBirth,
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/^Invalid dateOfBirth/);
    });

    it('is for people only', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const create = await api.post('/api/beneficiaries', {
        kind: 'institution',
        name: 'Grace Chapel',
        institutionType: 'church',
        dateOfBirth: '2000-01-01',
      });
      expect(create.status).toBe(400);
      const org = (
        await api.post('/api/beneficiaries', {
          kind: 'institution',
          name: 'Grace Chapel',
          institutionType: 'church',
        })
      ).body;
      expect(
        (await api.patch(`/api/beneficiaries/${org.id}`, { dateOfBirth: '2000-01-01' })).status
      ).toBe(422);
    });
  });

  describe('ageInYears', () => {
    it.each([
      ['the day before the birthday', '2000-06-15', new Date(2025, 5, 14), 24],
      ['on the birthday itself', '2000-06-15', new Date(2025, 5, 15), 25],
      ['the day after', '2000-06-15', new Date(2025, 5, 16), 25],
      ['an earlier month', '2000-06-15', new Date(2025, 0, 1), 24],
      ['a later month', '2000-06-15', new Date(2025, 11, 31), 25],
      ['a baby', '2025-01-01', new Date(2025, 5, 1), 0],
    ])('%s', (_label, dob, on, expected) => {
      expect(ageInYears(dob, on)).toBe(expected);
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
        { beneficiaryId: a.id, sharePercent: 100, specificBequest: null, condition: null },
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

  describe('organization directory', () => {
    const entries = [
      { name: 'Grace Chapel, Ikeja', institutionType: 'church' as const, state: 'Lagos' },
      { name: 'Grace Hospital', institutionType: 'hospital' as const, state: 'Lagos' },
      { name: 'Hope Clinic', institutionType: 'hospital' as const, state: 'Ogun' },
    ];

    it('searches, filters and pages, and needs a session', async () => {
      const api = as((await registerTestUser(app)).bearer);
      await addDirectoryEntries(db, entries);
      const names = (r: { body: { items: { name: string }[] } }) => r.body.items.map(i => i.name);

      const byName = await api.get('/api/organization-directory?q=grace');
      expect(names(byName).sort()).toEqual(['Grace Chapel, Ikeja', 'Grace Hospital']);
      expect(byName.body).toMatchObject({ page: 1, total: 2, totalPages: 1 });

      const typo = await api.get('/api/organization-directory?q=gracee');
      expect(names(typo)).toContain('Grace Hospital');

      const byType = await api.get('/api/organization-directory?type=hospital');
      expect(names(byType)).toEqual(['Grace Hospital', 'Hope Clinic']);
      const byState = await api.get('/api/organization-directory?type=hospital&state=Ogun');
      expect(names(byState)).toEqual(['Hope Clinic']);

      const first = await api.get('/api/organization-directory?limit=2&page=1');
      const second = await api.get('/api/organization-directory?limit=2&page=2');
      expect(first.body).toMatchObject({ total: 3, totalPages: 2, limit: 2 });
      expect(names(first)).toHaveLength(2);
      expect(names(second)).toHaveLength(1);
      const past = await api.get('/api/organization-directory?limit=2&page=9');
      expect(past.body).toMatchObject({ items: [], total: 3 });

      expect((await api.get('/api/organization-directory?limit=1000')).status).toBe(400);
      expect((await api.get('/api/organization-directory?type=bogus')).status).toBe(400);
      expect((await api.get('/api/organization-directory/states')).body).toEqual(['Lagos', 'Ogun']);
      expect((await request(app).get('/api/organization-directory')).status).toBe(401);
    });

    it('adding the same entries twice adds nothing', async () => {
      expect(await addDirectoryEntries(db, [entries[2]!])).toBe(1);
      expect(await addDirectoryEntries(db, [entries[2]!])).toBe(0);
    });

    it('links an organisation to an entry from the list, and only an organisation', async () => {
      const api = as((await registerTestUser(app)).bearer);
      await addDirectoryEntries(db, [entries[0]!]);
      const [entry] = (await api.get('/api/organization-directory?q=grace')).body.items;
      const org = await api.post('/api/beneficiaries', {
        kind: 'institution',
        name: entry.name,
        institutionType: entry.institutionType,
        directoryId: entry.id,
      });
      expect(org.status).toBe(201);
      expect(org.body.directoryId).toBe(entry.id);
      const manual = await api.post('/api/beneficiaries', {
        kind: 'institution',
        name: 'Home Fellowship',
        institutionType: 'church',
      });
      expect(manual.body.directoryId).toBeNull();
      const person = await api.post('/api/beneficiaries', {
        name: 'Ada',
        relationship: 'daughter',
        directoryId: entry.id,
      });
      expect(person.status).toBe(400);
      const missing = await api.post('/api/beneficiaries', {
        kind: 'institution',
        name: 'Nowhere',
        institutionType: 'church',
        directoryId: '00000000-0000-4000-8000-000000000000',
      });
      expect(missing.status).toBe(422);
    });
  });

  describe('executors', () => {
    it('accepts a priest and rejects an unknown kind', async () => {
      const api = as((await registerTestUser(app)).bearer);
      const priest = await api.post('/api/executors', {
        kind: 'priest',
        name: 'Fr Emmanuel Ogbolu',
      });
      expect(priest.status).toBe(201);
      expect(priest.body.kind).toBe('priest');
      expect((await api.post('/api/executors', { kind: 'bishop', name: 'x' })).status).toBe(400);
    });

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
      expect((await api.get('/api/inventory/report')).body).toEqual({
        ok: true,
        counts: { error: 0, warning: 0, info: 0 },
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        issues: [],
      });
    });

    it('pages the issues, worst first, and counts them all', async () => {
      const api = as((await registerTestUser(app)).bearer);
      for (const description of ['A', 'B', 'C']) {
        await api.post('/api/assets', { type: 'cash', description });
      }
      // Three uncovered assets are three errors, plus "add a beneficiary" is a fourth.
      await api.post('/api/beneficiaries', { name: 'Ada', relationship: 'daughter' });
      const first = await api.get('/api/inventory/report?limit=2&page=1');
      const second = await api.get('/api/inventory/report?limit=2&page=2');
      expect(first.body).toMatchObject({ ok: false, total: 5, page: 1, limit: 2, totalPages: 3 });
      expect(first.body.issues).toHaveLength(2);
      expect(second.body.page).toBe(2);
      expect(second.body.issues).toHaveLength(2);
      expect(first.body.counts.error).toBe(3);
      const severities = [...first.body.issues, ...second.body.issues].map(
        (i: { severity: string }) => i.severity
      );
      expect(severities).toEqual(
        [...severities].sort((a, b) => 'ewi'.indexOf(a[0]!) - 'ewi'.indexOf(b[0]!))
      );
      expect((await api.get('/api/inventory/report?limit=1000')).status).toBe(400);
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
      expect((await bob.get('/api/inventory/report')).body).toMatchObject({
        ok: true,
        total: 0,
        issues: [],
      });
    });
  });
});
