#!/usr/bin/env bash
set -u

CONTAINER="${1:-postgres}"
DB_NAME="${2:-postgres}"
OUT_PATH="${3:-/tmp/postgres-backup.sql}"
DB_USER="${POSTGRES_USER:-postgres}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found"
  exit 2
fi

TMP_FILE="/tmp/${DB_NAME}-backup-$$.sql"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$TMP_FILE" || exit 1
mv "$TMP_FILE" "$OUT_PATH"

echo "[pg] backup written: $OUT_PATH"
wc -c "$OUT_PATH"
