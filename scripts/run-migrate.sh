#!/usr/bin/env bash
set -euo pipefail

# Simple idempotent migrate wrapper for drizzle-kit
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

DRIZZLE_SCHEMA_EXISTS=$(psql -tAc "SELECT 1 FROM information_schema.schemata WHERE schema_name='drizzle';" 2>/dev/null || true)
MIGRATIONS_TABLE_EXISTS=$(psql -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='drizzle' AND table_name='__drizzle_migrations';" 2>/dev/null || true)
echo "[wrapper] drizzle_schema=${DRIZZLE_SCHEMA_EXISTS:-0} migrations_table=${MIGRATIONS_TABLE_EXISTS:-0}"

echo "[wrapper] drizzle schema exists: ${DRIZZLE_SCHEMA_EXISTS:-0}, migrations table exists: ${MIGRATIONS_TABLE_EXISTS:-0}"

# If pg cli is unavailable, fall back to direct migrate
if [[ -z "$DRIZZLE_SCHEMA_EXISTS" && -z "$MIGRATIONS_TABLE_EXISTS" ]]; then
  echo "[wrapper] drizzle not initialized; running migrate directly"
  npx drizzle-kit migrate --config drizzle.config.ts
else
  echo "[wrapper] drizzle initialized; running migrate with standard flow" 
  # Run migrate with verbose logging to surface any issues
  OUTPUT=$(npx drizzle-kit migrate --config drizzle.config.ts --log-level verbose 2>&1) || true
  echo "$OUTPUT"
  # If there was an error, print a concise summary for quick triage
  if echo "$OUTPUT" | rg -q "error"; then
    echo "[wrapper] migrate encountered an error. Review the verbose output above for details."
    # Propagate non-zero to indicate failure to external systems
    exit 1
  fi
  # If there were no errors but there are no pending migrations, exit 0 gracefully
  echo "[wrapper] migrate completed (no explicit errors detected)."
  exit 0
fi
