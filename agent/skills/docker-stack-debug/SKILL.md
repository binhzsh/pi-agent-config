---
name: docker-stack-debug
description: Diagnose Docker Compose stack failures quickly with container state, logs, port conflicts, and health checks. Use when services fail to start, restart-loop, expose wrong ports, or become unhealthy.
---
# Docker Stack Debug

Triage Docker-based app failures with a fast, ordered workflow.

## Triage Flow

1. Inspect compose state and health of each container.
2. Identify first failing service, not downstream symptoms.
3. Read recent logs for the failing service before global logs.
4. Verify bound ports and conflicts on host.
5. Verify required volumes/env vars/secrets are present.

## Recovery Strategy

1. Apply smallest reversible fix first.
2. Rebuild only the service that changed.
3. Avoid full stack restart unless dependency graph requires it.
4. Re-check health after each action.

## Output Contract

Return:
- Root cause hypothesis.
- Evidence lines from logs/status.
- Exact fix applied.
- Verification result.
