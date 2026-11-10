import type { DbClient } from '@heartwood/database';
import type { BeneficiaryDto, BeneficiaryInput, BeneficiaryUpdate } from '@heartwood/shared';
import { conflict, notFoundError, unprocessable } from '../../utils/http-error';
import { beneficiaryIsAllocated } from '../allocation/allocation.service';
import { recordAudit } from '../audit/audit.service';
import {
  countContingencyReferences,
  findBeneficiary,
  insertBeneficiary,
  listBeneficiaries as listRows,
  softDeleteBeneficiary,
  updateBeneficiary as updateRow,
} from './beneficiary.repository';

type Row = Awaited<ReturnType<typeof findBeneficiary>> & object;

const pad = (n: number) => String(n).padStart(2, '0');

/** A DATE column as "YYYY-MM-DD". pg returns it as a local-midnight Date, so read it back with local fields. */
const dateOnly = (value: Date | string | null): string | null => {
  if (value === null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

const toDto = (row: Row): BeneficiaryDto => ({
  id: row.id,
  kind: row.kind as BeneficiaryDto['kind'],
  name: row.name,
  relationship: row.relationship as BeneficiaryDto['relationship'],
  relationshipOther: row.relationship_other,
  institutionType: row.institution_type as BeneficiaryDto['institutionType'],
  contact: row.contact,
  address: row.address,
  dateOfBirth: dateOnly(row.date_of_birth),
  contingencyPlan: row.contingency_plan as BeneficiaryDto['contingencyPlan'],
  contingencyBeneficiaryId: row.contingency_beneficiary_id,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const listBeneficiaries = async (db: DbClient, ownerId: string) =>
  (await listRows(db, ownerId)).map(toDto);

export const getBeneficiary = async (db: DbClient, ownerId: string, id: string) => {
  const row = await findBeneficiary(db, ownerId, id);
  if (!row) throw notFoundError('Beneficiary not found');
  return toDto(row);
};

/** An update must keep a person a person and an organisation an organisation (the kind never changes). */
const checkFitsKind = (existing: Row, input: BeneficiaryUpdate) => {
  if (existing.kind === 'person') {
    if (input.institutionType !== undefined) {
      throw unprocessable('Only an organisation has a type');
    }
    // The relationship pair as it will be after this update must still make sense.
    const relationship =
      input.relationship === undefined ? existing.relationship : input.relationship;
    const other =
      input.relationshipOther === undefined ? existing.relationship_other : input.relationshipOther;
    if (!relationship) throw unprocessable('Say how this person is related to you');
    if (relationship === 'other' && !other) throw unprocessable('Say what the relationship is');
    if (relationship !== 'other' && other) {
      throw unprocessable('Only "other" needs the relationship in words');
    }
    return;
  }
  if (input.relationship || input.relationshipOther) {
    throw unprocessable('An organisation has no relationship to you');
  }
  if (input.dateOfBirth) throw unprocessable('An organisation has no date of birth');
  const plan =
    input.contingencyPlan === undefined ? existing.contingency_plan : input.contingencyPlan;
  if (plan === 'pass_to_descendants') {
    throw unprocessable('An organisation has no children to pass a gift to');
  }
};

/** A named fallback must be another of this person's own beneficiaries. */
const checkFallback = async (
  db: DbClient,
  ownerId: string,
  selfId: string | null,
  fallbackId: string | null | undefined
) => {
  if (!fallbackId) return;
  if (fallbackId === selfId) throw unprocessable('A beneficiary cannot be their own fallback');
  if (!(await findBeneficiary(db, ownerId, fallbackId))) {
    throw unprocessable('Fallback beneficiary not found');
  }
};

export const createBeneficiary = (db: DbClient, ownerId: string, input: BeneficiaryInput) =>
  db.transaction().execute(async trx => {
    await checkFallback(trx, ownerId, null, input.contingencyBeneficiaryId);
    const row = await insertBeneficiary(trx, {
      owner_id: ownerId,
      kind: input.kind,
      name: input.name,
      relationship: input.relationship,
      relationship_other: input.relationshipOther,
      institution_type: input.institutionType,
      contact: input.contact,
      address: input.address,
      date_of_birth: input.dateOfBirth,
      contingency_plan: input.contingencyPlan,
      contingency_beneficiary_id: input.contingencyBeneficiaryId,
    });
    const dto = toDto(row);
    await recordAudit(trx, {
      actorId: ownerId,
      entity: 'beneficiary',
      entityId: row.id,
      action: 'create',
      snapshot: { ...dto },
    });
    return dto;
  });

export const updateBeneficiary = (
  db: DbClient,
  ownerId: string,
  id: string,
  input: BeneficiaryUpdate
) =>
  db.transaction().execute(async trx => {
    const existing = await findBeneficiary(trx, ownerId, id);
    if (!existing) throw notFoundError('Beneficiary not found');
    checkFitsKind(existing, input);
    await checkFallback(trx, ownerId, id, input.contingencyBeneficiaryId);
    const row = await updateRow(trx, ownerId, id, {
      name: input.name,
      relationship: input.relationship,
      relationship_other: input.relationshipOther,
      institution_type: input.institutionType,
      contact: input.contact,
      address: input.address,
      date_of_birth: input.dateOfBirth,
      contingency_plan: input.contingencyPlan,
      contingency_beneficiary_id: input.contingencyBeneficiaryId,
    });
    if (!row) throw notFoundError('Beneficiary not found');
    const dto = toDto(row);
    await recordAudit(trx, {
      actorId: ownerId,
      entity: 'beneficiary',
      entityId: id,
      action: 'update',
      snapshot: { ...dto },
    });
    return dto;
  });

/** Refuses while the beneficiary still receives something or is someone's fallback. */
export const deleteBeneficiary = (db: DbClient, ownerId: string, id: string) =>
  db.transaction().execute(async trx => {
    if (!(await findBeneficiary(trx, ownerId, id))) throw notFoundError('Beneficiary not found');
    if (await beneficiaryIsAllocated(trx, ownerId, id)) {
      throw conflict('This beneficiary still has allocations. Reassign them first.');
    }
    if ((await countContingencyReferences(trx, ownerId, id)) > 0) {
      throw conflict('This beneficiary is another beneficiary’s fallback. Change that first.');
    }
    await softDeleteBeneficiary(trx, ownerId, id, ownerId);
    await recordAudit(trx, {
      actorId: ownerId,
      entity: 'beneficiary',
      entityId: id,
      action: 'delete',
    });
  });
