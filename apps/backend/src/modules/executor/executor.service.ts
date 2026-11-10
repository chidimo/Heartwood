import type { DbClient } from '@heartwood/database';
import type { ExecutorDto, ExecutorInput, ExecutorUpdate } from '@heartwood/shared';
import { notFoundError } from '../../utils/http-error';
import { recordAudit } from '../audit/audit.service';
import {
  insertExecutor,
  listExecutors as listRows,
  softDeleteExecutor,
  updateExecutor as updateRow,
} from './executor.repository';

const toDto = (row: {
  id: string;
  kind: string;
  name: string;
  contact: string | null;
}): ExecutorDto => ({
  id: row.id,
  kind: row.kind as ExecutorDto['kind'],
  name: row.name,
  contact: row.contact,
});

export const listExecutors = async (db: DbClient, ownerId: string) =>
  (await listRows(db, ownerId)).map(toDto);

export const createExecutor = (db: DbClient, ownerId: string, input: ExecutorInput) =>
  db.transaction().execute(async trx => {
    const row = await insertExecutor(trx, { owner_id: ownerId, ...input });
    const dto = toDto(row);
    await recordAudit(trx, {
      actorId: ownerId,
      entity: 'executor',
      entityId: row.id,
      action: 'create',
      snapshot: { ...dto },
    });
    return dto;
  });

export const updateExecutor = (db: DbClient, ownerId: string, id: string, input: ExecutorUpdate) =>
  db.transaction().execute(async trx => {
    const row = await updateRow(trx, ownerId, id, input);
    if (!row) throw notFoundError('Executor not found');
    const dto = toDto(row);
    await recordAudit(trx, {
      actorId: ownerId,
      entity: 'executor',
      entityId: id,
      action: 'update',
      snapshot: { ...dto },
    });
    return dto;
  });

export const deleteExecutor = (db: DbClient, ownerId: string, id: string) =>
  db.transaction().execute(async trx => {
    if (!(await softDeleteExecutor(trx, ownerId, id, ownerId))) {
      throw notFoundError('Executor not found');
    }
    await recordAudit(trx, {
      actorId: ownerId,
      entity: 'executor',
      entityId: id,
      action: 'delete',
    });
  });
