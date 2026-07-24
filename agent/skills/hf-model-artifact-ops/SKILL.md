---
name: hf-model-artifact-ops
description: Manage large Hugging Face model artifacts for local inference, including resumable downloads, integrity checks, and disk-space planning. Use when adding new GGUF/safetensors models, recovering partial downloads, or validating model files before serving.
---
# HF Model Artifact Ops

Manage large model files with integrity and capacity controls.

## Workflow

1. Estimate required disk before download.
2. Use resumable download strategy.
3. Verify final size/hash before putting model into service.
4. Keep deterministic naming for model variants and quant levels.

## Recovery

1. If download stalls, resume rather than restart.
2. If checksum fails, quarantine file and re-fetch.
3. Keep one known-good previous model during upgrades.

## Script

```bash
bash scripts/verify_file.sh models/my-model.gguf --sha256 <expected>
```
