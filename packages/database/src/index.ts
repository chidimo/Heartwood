import type { Kysely, Transaction } from 'kysely';

import { getDb } from './db';
import { type DB } from './db.types';

export { getDb };
export type DbClient = Kysely<DB>;
export type DbTransaction = Transaction<DB>;

export type * from './db.types';
