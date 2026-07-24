---
name: local-model-ops
description: Diagnose and fix local OpenAI-compatible model endpoint issues in OpenCode, including unreachable base URLs, bad model IDs, and tool-calling instability. Use when requests fail, model switching breaks, or local inference quality/latency regresses.
---
# Local Model Ops

Stabilize local model usage in OpenCode with a deterministic triage workflow.

## Execute Triage

1. Read OpenCode config from `~/.config/opencode/config.json` or project-local config.
2. Enumerate provider IDs, `options.baseURL`, and configured model names.
3. Run `scripts/check_openai_endpoints.py` against the config.
4. Classify failures into one of these buckets:
- Network/connectivity: connection refused, timeout, DNS failure.
- API mismatch: endpoint responds but not OpenAI-compatible.
- Model mismatch: configured model ID not returned by `/v1/models`.
- Runtime degradation: model answers but is too slow or inconsistent at tool calls.

## Apply Fixes

1. Prefer the smallest possible config patch.
2. Keep provider IDs stable unless explicitly asked to rename.
3. If `/v1/models` returns different IDs, update model `name` values to exact server-side IDs.
4. For repeated tool-calling failures, route coding tasks to a stronger tool-calling model and keep weaker model as fallback.
5. Re-run endpoint checks after each patch.

## Verify

1. Confirm every configured provider returns HTTP 200 for `/v1/models`.
2. Confirm each configured model name exists in server model list.
3. Run one smoke prompt per affected provider before concluding.

## Script

Use:

```bash
python3 scripts/check_openai_endpoints.py ~/.config/opencode/config.json
```

Optional timeout (seconds):

```bash
python3 scripts/check_openai_endpoints.py ~/.config/opencode/config.json --timeout 4
```
