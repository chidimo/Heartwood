import bcrypt from 'bcryptjs';
import type { DbClient } from '@heartwood/database';
import type { AuthResponse, LoginInput, PublicAccount, RegisterInput } from '@heartwood/shared';
import {
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_MS,
  hashRefreshToken,
  newRefreshToken,
  signAccessToken,
} from '../../lib/tokens';
import { conflict, unauthorized } from '../../utils/http-error';
import {
  findAccountByEmail,
  findAccountById,
  findRefreshToken,
  insertAccount,
  insertRefreshToken,
  revokeAllRefreshTokens,
  revokeRefreshToken,
} from './account.repository';

const BCRYPT_ROUNDS = 12;

// Compared against when the email is unknown, so a missing account takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

const issueTokens = async (db: DbClient, account: PublicAccount, secret: string) => {
  const refresh = newRefreshToken();
  await insertRefreshToken(db, {
    account_id: account.id,
    token_hash: refresh.hash,
    expires_at: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return {
    accessToken: signAccessToken(account.id, secret),
    refreshToken: refresh.token,
    expiresIn: ACCESS_TTL_SECONDS,
  };
};

export const registerAccount = async (
  db: DbClient,
  input: RegisterInput,
  secret: string
): Promise<AuthResponse> => {
  if (await findAccountByEmail(db, input.email)) {
    throw conflict('An account with this email already exists');
  }
  const password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  return db.transaction().execute(async trx => {
    const account = await insertAccount(trx, {
      email: input.email,
      name: input.name,
      password_hash,
    });
    return { account, ...(await issueTokens(trx, account, secret)) };
  });
};

export const loginAccount = async (
  db: DbClient,
  input: LoginInput,
  secret: string
): Promise<AuthResponse> => {
  const found = await findAccountByEmail(db, input.email);
  const matches = await bcrypt.compare(input.password, found?.password_hash ?? DUMMY_HASH);
  // Same message whether the email or the password was wrong.
  if (!found || !matches) throw unauthorized('Incorrect email or password');
  const account = { id: found.id, email: found.email, name: found.name };
  return { account, ...(await issueTokens(db, account, secret)) };
};

/** Trades a refresh token for a new pair. The old token is single-use. */
export const refreshSession = async (
  db: DbClient,
  refreshToken: string,
  secret: string
): Promise<AuthResponse> => {
  const stored = await findRefreshToken(db, hashRefreshToken(refreshToken));
  if (!stored) throw unauthorized('Session expired');
  if (stored.revoked_at) {
    // A used token came back: treat the whole session family as stolen.
    await revokeAllRefreshTokens(db, stored.account_id);
    throw unauthorized('Session expired');
  }
  if (stored.expires_at <= new Date()) throw unauthorized('Session expired');
  const account = await findAccountById(db, stored.account_id);
  if (!account) throw unauthorized('Session expired');

  return db.transaction().execute(async trx => {
    await revokeRefreshToken(trx, stored.id);
    return { account, ...(await issueTokens(trx, account, secret)) };
  });
};

export const logoutSession = async (db: DbClient, refreshToken: string): Promise<void> => {
  const stored = await findRefreshToken(db, hashRefreshToken(refreshToken));
  if (stored) await revokeRefreshToken(db, stored.id);
};

export const getAccount = async (db: DbClient, id: string): Promise<PublicAccount> => {
  const account = await findAccountById(db, id);
  if (!account) throw unauthorized();
  return account;
};
