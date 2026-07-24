---
name: gpu-capacity-router
description: Route workloads based on live GPU capacity and model footprint to prevent OOM and latency spikes. Use when multiple AI services share one GPU, after model swaps, or when inference suddenly slows or fails under load.
---
# GPU Capacity Router

Use live GPU telemetry to decide where and when to run model workloads.

## Snapshot

1. Collect GPU memory used/free and utilization.
2. Compare active workloads against model memory footprints.
3. Identify overload windows and contention sources.

## Routing Strategy

1. Reserve headroom for at least one fallback service.
2. Avoid concurrent heavy jobs that exceed safe VRAM threshold.
3. Prefer lower-quant or smaller models during peak contention.

## Operational Guardrails

1. Apply one routing change at a time.
2. Re-check telemetry within 1-2 minutes after each change.
3. Keep rollback mapping to prior model assignments.

## Script

```bash
bash scripts/gpu_snapshot.sh
```
