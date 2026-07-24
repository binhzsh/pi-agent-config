---
name: postgres-container-ops
description: Operate PostgreSQL running in Docker containers, including readiness checks, safe config changes, backup/restore, and connectivity debugging. Use when app DB connections fail, schema migrations break, or containerized Postgres needs maintenance.
---
# Postgres Container Ops

Handle Postgres container incidents and maintenance with reversible steps.

## Triage

1. Confirm container state and readiness (`pg_isready`).
2. Verify DB credentials, host/port, and network path from client container.
3. Inspect recent DB logs for authentication and startup errors.

## Safe Changes

1. Prefer runtime-safe SQL and env fixes before file edits.
2. If config file edit is required, capture original line and reason.
3. Restart only the DB container after config changes.

## Data Safety

1. Create a backup before invasive changes.
2. Verify backup file size and basic readability.
3. Time-box restore tests for critical databases.

## Scripts

```bash
bash scripts/pg_smoke.sh postgres
bash scripts/pg_backup.sh postgres appdb /tmp/appdb.sql
```
