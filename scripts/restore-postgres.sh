#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
backup_file="${1:-}"

if [ -z "$backup_file" ]; then
  echo "Usage: scripts/restore-postgres.sh <backup.sql.gz>" >&2
  exit 1
fi

gzip -dc "$backup_file" | psql "$DATABASE_URL"
