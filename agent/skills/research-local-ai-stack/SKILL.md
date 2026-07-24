---
name: research-local-ai-stack
description: "Research current AI and LLM models, apps, and tools with awareness of the local machine and existing model inventory. Use when Codex needs to inspect available hardware and storage, read `/mnt/fast_pool/fast_models`, review local `llamacpp_models` files for already-downloaded GGUF models, browse official sources such as GitHub and Hugging Face for recent or notable releases or refreshed model revisions, and return a ranked list of what is new, relevant, worth trying, or worth updating on this host."
---

# Research Local AI Stack

Inspect the host first, then research online, then rank findings against what is already installed and what the machine can realistically run.
Do not recommend in a vacuum.

## Scope

- Cover models, apps, and tools across local LLMs, multimodal models, image or video generation, speech, TTS, embeddings, inference runtimes, and useful self-hosted AI apps when relevant to the user request.
- Prefer official and primary sources.
- Treat "latest", "recent", "new", "hot", and "interesting" as time-sensitive and verify them online before answering.

## Local inventory first

- Start by profiling the host and model store before doing online research.
- Use the bundled script:

```bash
python3 scripts/profile_local_ai_host.py
```

- The script summarizes:
  - CPU, RAM, GPU, and VRAM
  - free space for `/mnt/fast_pool`
  - model and checkpoint files under `/mnt/fast_pool/fast_models`
  - top-level collections already present
  - a dedicated inventory of local `llamacpp_models` GGUF files

- If the script cannot collect a field, continue and report the missing probe briefly.
- If the user points to a different model directory, use that instead of the default.

## Research workflow

1. Inspect the local profile and identify obvious constraints or opportunities.
2. Search official sources for recent releases or active projects in the requested category.
3. For local models in `llamacpp_models`, check whether the same family has a newer or improved upstream GGUF or publisher revision.
4. Check release dates, repository activity, model cards, hardware requirements, license, and deployment path.
5. Compare each candidate to the local inventory to avoid repeating what the user already has unless the upstream revision is meaningfully better.
6. Return a ranked short list with fit notes grounded in this machine.

## Source priority

- Prefer sources in this order:
  1. Official GitHub repository, releases page, or docs
  2. Official Hugging Face model card, collection, or organization page
  3. Official vendor or project website
  4. Official Civitai page when the release lives there
- When checking existing `llamacpp_models`, also prefer the original publisher or quantizer page that produced the local file, such as Unsloth or another official team page, before relying on mirrors.
- Avoid secondary blog posts, reposts, and ranking sites unless they add signal that primary sources do not provide.
- Use exact dates in the answer when discussing recency.

For category heuristics and ranking criteria, open `references/research-guidelines.md`.

## Ranking rules

- Favor items that fit the local machine without heroic assumptions.
- Penalize items that clearly exceed available VRAM, storage, or deployment complexity unless the user explicitly wants stretch options.
- Call out whether a candidate is:
  - immediately runnable
  - runnable with quantization or offload
  - better suited for remote or cloud use
- Highlight deltas versus the current local inventory: new capability, better quality, faster inference, lower memory, or simpler deployment.
- For local GGUF models already present, highlight whether an upstream refresh offers a better quant, a newer base model revision, bug fixes, tokenizer fixes, or materially improved quality.

## Output shape

- Return a concise ranked list, not a raw dump.
- For each item include:
  - name
  - category
  - why it is notable now
  - why it fits or does not fit this host
  - source links
  - whether it overlaps with existing local models
- When relevant, split results into:
  - new things to try
  - existing local models worth refreshing
- Separate "best fits now" from "interesting but heavy" when useful.

## Guardrails

- Do not claim something is the latest unless you verified it online.
- Do not recommend downloading large duplicates of models already present unless there is a clear quality or usability gain.
- Do not suggest replacing a local GGUF with a newer upstream file unless you can point to the source page and explain what improved.
- Do not rely on stale memory for release timing, model availability, or requirements.
- If the local inventory path is unavailable, say so and continue with hardware-only recommendations.
