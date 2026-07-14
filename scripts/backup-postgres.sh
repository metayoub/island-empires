#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_DIR:=./backups}"

mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/island-empires-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
pg_dump "$DATABASE_URL" | gzip > "$file"
gzip -t "$file"
echo "$file"
