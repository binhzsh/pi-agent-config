#!/usr/bin/env bash
set -u

SERVICE=""
LOGS=60

while [ "$#" -gt 0 ]; do
  case "$1" in
    --service) SERVICE="$2"; shift 2 ;;
    --logs) LOGS="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 2 ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found"
  exit 2
fi

if ! docker compose config >/dev/null; then
  echo "compose config invalid"
  exit 1
fi

echo "[compose] status before"
docker compose ps

if [ -n "$SERVICE" ]; then
  echo "[compose] rolling service: $SERVICE"
  docker compose up -d "$SERVICE" || exit 1
  echo "[compose] logs: $SERVICE"
  docker compose logs --tail="$LOGS" "$SERVICE"
else
  echo "[compose] rolling full stack"
  docker compose up -d || exit 1
  echo "[compose] logs: all"
  docker compose logs --tail="$LOGS"
fi

echo "[compose] status after"
docker compose ps
