#!/usr/bin/env bash
set -u

FILE="${1:-}"
FLAG="${2:-}"
EXPECTED="${3:-}"

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "file not found: $FILE"
  exit 2
fi

echo "[file] path: $FILE"
wc -c "$FILE"

if [ "$FLAG" = "--sha256" ]; then
  if [ -z "$EXPECTED" ]; then
    echo "missing expected sha256"
    exit 2
  fi
  ACTUAL="$(sha256sum "$FILE" | awk '{print $1}')"
  echo "[file] sha256: $ACTUAL"
  if [ "$ACTUAL" != "$EXPECTED" ]; then
    echo "[file] checksum mismatch"
    exit 1
  fi
  echo "[file] checksum PASS"
else
  echo "[file] no checksum provided"
fi
