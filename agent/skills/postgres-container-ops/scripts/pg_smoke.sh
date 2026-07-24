#!/usr/bin/env bash
set -u

CONTAINER="${1:-postgres}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found"
  exit 2
fi

echo "[pg] container: $CONTAINER"
docker ps --format '{{.Names}}' | grep -Fx "$CONTAINER" >/dev/null || {
  echo "[pg] container not running"
  exit 1
}

docker exec "$CONTAINER" pg_isready || exit 1
docker exec "$CONTAINER" psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" -c 'select now();' >/dev/null || exit 1

echo "[pg] smoke PASS"
