/** @type {import('jest').Config} */
module.exports = {
  displayName: 'backend',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/apps/backend/src'],
  globalSetup: '<rootDir>/apps/backend/src/test-utils/global-setup.ts',
  testMatch: ['<rootDir>/apps/backend/src/**/*.test.ts'],
  // Resolve workspace packages straight to source so tests never run against a stale dist.
  moduleNameMapper: {
    '^@heartwood/database$': '<rootDir>/packages/database/src/index.ts',
    '^@heartwood/database/(.*)$': '<rootDir>/packages/database/src/$1',
    '^@heartwood/shared$': '<rootDir>/packages/shared/src/index.ts',
    '^@heartwood/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
  },
  // Tests that share the Postgres container must not run in parallel (see Concord's
  // jest.config.js for the deadlocks this prevents). Harmless now, required once DB tests land.
  maxWorkers: 1,
  transformIgnorePatterns: ['/node_modules/(?!(kysely)/)'],
  transform: {
    '^.+\\.(ts|js)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/apps/backend/tsconfig.json',
        diagnostics: false,
      },
    ],
  },
  // Only collected with --coverage (used in CI), so local runs stay quiet.
  collectCoverageFrom: [
    'apps/backend/src/**/*.ts',
    '!apps/backend/src/**/*.test.ts',
    '!apps/backend/src/test-utils/**',
    '!apps/backend/src/scripts/**',
    '!apps/backend/src/index.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/backend',
  coverageReporters: ['text-summary', 'lcov'],
};
