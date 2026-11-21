import type { DbClient } from '@heartwood/database';

export type AuditAction = 'create' | 'update' | 'delete';

/**
 * Records who changed what and when ([security.md](docs/standards/security.md) Rule 5). Pass the
 * transaction that made the change so the change and its audit row commit together. The snapshot is
 * stored in the database only and must never be logged.
 */
export const recordAudit = async (
  db: DbClient,
  entry: {
    actorId: string;
    entity: string;
    entityId: string;
    action: AuditAction;
    snapshot?: Record<string, unknown> | null;
  }
): Promise<void> => {
  await db
    .insertInto('audit_log')
    .values({
      actor_id: entry.actorId,
      entity: entry.entity,
      entity_id: entry.entityId,
      action: entry.action,
      snapshot: entry.snapshot ? JSON.stringify(entry.snapshot) : null,
    })
    .execute();
};
