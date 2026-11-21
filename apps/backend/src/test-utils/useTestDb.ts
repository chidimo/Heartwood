import { closeTestDb, getTestDb } from './db';
import { resetTestDb } from './resetTestDb';

// Call at the top of a describe block: resets the database before each test, closes the
// connection after all of them, and returns the shared test connection.
export function useTestDb() {
  const db = getTestDb();
  beforeEach(resetTestDb);
  afterAll(closeTestDb);
  return db;
}
