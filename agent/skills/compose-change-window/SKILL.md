---
name: compose-change-window
description: Execute low-risk Docker Compose updates with pre-checks, scoped rollout, and post-change verification. Use when updating images, changing env vars, rebuilding one service, or recovering from failed compose deployments.
---
# Compose Change Window

Perform controlled compose changes without destabilizing unrelated services.

## Pre-check

1. Validate compose config before any rollout.
2. Snapshot current container status.
3. Identify target services and dependencies.

## Rollout

1. Pull/build only required services.
2. Restart only changed services first.
3. Tail logs for changed services and verify health.

## Verification

1. Confirm expected services are healthy.
2. Confirm no new restart loops.
3. Confirm exposed ports still match expected bindings.

## Script

```bash
bash scripts/compose_rollout.sh --service api --logs 80
```
