#!/bin/bash
# Creates all service databases on first Postgres boot.
# Runs automatically via docker-entrypoint-initdb.d.
set -e

POSTGRES_USER="${POSTGRES_USER:-postgres}"

databases=(
  "audit_log"
  "identity"
  "campaign_manager"
  "consent_manager"
  "settlement"
)

for db in "${databases[@]}"; do
  echo "Creating database: $db"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE $db'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
EOSQL
done
