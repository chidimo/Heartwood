#!/usr/bin/env bash
# Brings up the test Postgres container, runs the backend Jest suite against it, and tears
# the container down afterwards whether or not the tests passed. Extra args go to jest.
set -uo pipefail

cd "$(dirname "$0")/.."

export TEST_DATABASE_URL="postgresql://test:test@localhost:5433/heartwood_test"

if ! docker compose -f docker-compose.test.yml up -d --wait; then
  echo "Failed to start the test database container." >&2
  exit 1
fi

npx jest --config jest.config.js "$@"
EXIT_CODE=$?

docker compose -f docker-compose.test.yml down

exit $EXIT_CODE
