---
name: llama-cpp-fleet-ops
description: Operate and troubleshoot multiple local llama.cpp OpenAI-compatible endpoints as a fleet. Use when adding/removing model servers, validating /v1/models across ports, diagnosing per-endpoint drift, or choosing fallback routing between coding and vision models.
---
# Llama.cpp Fleet Ops

Treat local inference endpoints as a fleet with health and compatibility checks.

## Baseline

1. Read OpenCode provider config and enumerate endpoints.
2. Probe each endpoint for `/v1/models` reachability and model IDs.
3. Flag drift between configured model names and served IDs.

## Routing Guidance

1. Reserve strongest tool-calling endpoint for coding/editing tasks.
2. Keep one low-latency fallback endpoint for degraded operation.
3. Route multimodal/vision tasks only to servers with explicit vision model IDs.

## Change Procedure

1. Change one endpoint at a time.
2. Re-probe fleet after each config change.
3. Capture latency, error-rate, and model-list stability before concluding.

## Script

```bash
python3 scripts/probe_fleet.py ~/.config/opencode/config.json
```
