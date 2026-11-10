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

const toDto = (row: Row): BeneficiaryDto => ({
  id: row.id,
  kind: row.kind as BeneficiaryDto['kind'],
  name: row.name,
  relationship: row.relationship,
  institutionType: row.institution_type as BeneficiaryDto['institutionType'],
  contact: row.contact,
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
const checkFitsKind = (kind: string, currentPlan: string | null, input: BeneficiaryUpdate) => {
  if (kind === 'person') {
    if (input.institutionType !== undefined) {
      throw unprocessable('Only an organisation has a type');
    }
    if (input.relationship === null) throw unprocessable('Say how this person is related to you');
    return;
  }
  if (input.relationship) throw unprocessable('An organisation has no relationship to you');
  const plan = input.contingencyPlan === undefined ? currentPlan : input.contingencyPlan;
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
      institution_type: input.institutionType,
      contact: input.contact,
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
    checkFitsKind(existing.kind, existing.contingency_plan, input);
    await checkFallback(trx, ownerId, id, input.contingencyBeneficiaryId);
    const row = await updateRow(trx, ownerId, id, {
      name: input.name,
      relationship: input.relationship,
      institution_type: input.institutionType,
      contact: input.contact,
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
