import type { DbClient } from '@heartwood/database';

export const listBeneficiaries = (db: DbClient, ownerId: string) =>
  db
    .selectFrom('beneficiary')
    .selectAll()
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .orderBy('created_at')
    .execute();

export const findBeneficiary = (db: DbClient, ownerId: string, id: string) =>
  db
    .selectFrom('beneficiary')
    .selectAll()
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

export const insertBeneficiary = (
  db: DbClient,
  values: {
    owner_id: string;
    name: string;
    relationship: string;
    contact: string | null;
    contingency_plan: string | null;
    contingency_beneficiary_id: string | null;
  }
) => db.insertInto('beneficiary').values(values).returningAll().executeTakeFirstOrThrow();

export const updateBeneficiary = (
  db: DbClient,
  ownerId: string,
  id: string,
  values: Partial<{
    name: string;
    relationship: string;
    contact: string | null;
    contingency_plan: string | null;
    contingency_beneficiary_id: string | null;
  }>
) =>
  db
    .updateTable('beneficiary')
    .set({ ...values, updated_at: new Date() })
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .returningAll()
    .executeTakeFirst();

export const softDeleteBeneficiary = (db: DbClient, ownerId: string, id: string, actorId: string) =>
  db
    .updateTable('beneficiary')
    .set({ deleted_at: new Date(), deleted_by: actorId })
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .returning('id')
    .executeTakeFirst();

/** Live beneficiaries that name this one as their fallback. */
export const countContingencyReferences = async (db: DbClient, ownerId: string, id: string) => {
  const row = await db
    .selectFrom('beneficiary')
    .select(eb => eb.fn.countAll<string>().as('n'))
    .where('owner_id', '=', ownerId)
    .where('contingency_beneficiary_id', '=', id)
    .where('deleted_at', 'is', null)
    .executeTakeFirstOrThrow();
  return Number(row.n);
};
