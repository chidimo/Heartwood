import type { DbClient } from '@heartwood/database';

export const findAccountByEmail = (db: DbClient, email: string) =>
  db
    .selectFrom('account')
    .selectAll()
    .where(eb => eb(eb.fn('lower', ['email']), '=', email.toLowerCase()))
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

export const findAccountById = (db: DbClient, id: string) =>
  db
    .selectFrom('account')
    .select(['id', 'email', 'name', 'address'])
    .where('id', '=', id)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

export const insertAccount = (
  db: DbClient,
  values: { email: string; name: string; password_hash: string }
) =>
  db
    .insertInto('account')
    .values(values)
    .returning(['id', 'email', 'name', 'address'])
    .executeTakeFirstOrThrow();

export const updateAccountProfile = (
  db: DbClient,
  id: string,
  values: { name?: string; address?: string | null }
) =>
  db
    .updateTable('account')
    .set({ ...values, updated_at: new Date() })
    .where('id', '=', id)
    .where('deleted_at', 'is', null)
    .returning(['id', 'email', 'name', 'address'])
    .executeTakeFirst();

export const insertRefreshToken = (
  db: DbClient,
  values: { account_id: string; token_hash: string; expires_at: Date }
) => db.insertInto('refresh_token').values(values).execute();

export const findRefreshToken = (db: DbClient, tokenHash: string) =>
  db
    .selectFrom('refresh_token')
    .select(['id', 'account_id', 'expires_at', 'revoked_at'])
    .where('token_hash', '=', tokenHash)
    .executeTakeFirst();

export const revokeRefreshToken = (db: DbClient, id: string) =>
  db
    .updateTable('refresh_token')
    .set({ revoked_at: new Date() })
    .where('id', '=', id)
    .where('revoked_at', 'is', null)
    .execute();

export const revokeAllRefreshTokens = (db: DbClient, accountId: string) =>
  db
    .updateTable('refresh_token')
    .set({ revoked_at: new Date() })
    .where('account_id', '=', accountId)
    .where('revoked_at', 'is', null)
    .execute();
