# Research Guidelines

Open this file when you need selection heuristics, category ideas, or a tighter rubric for comparing new releases against the local host.

## Local baseline for this environment

Current known baseline from inspection at skill creation time:

- CPU: AMD Ryzen 7 5700G, 8 cores / 16 threads
- RAM: 62 GiB total
- GPU: NVIDIA GeForce RTX 3090
- VRAM: 24 GiB
- Model storage root: `/mnt/fast_pool/fast_models`
- Storage free on `/mnt/fast_pool`: about 129 GiB on 2026-03-13

Existing top-level model collections already present:

- `ace-models`
- `llamacpp_models`
- `music_models`
- `tts_models`
- `upscaler`
- `vllm_models`
- `wan2gp`

Local `llamacpp_models` examples already detected:

- `Qwen3.5-9B-UD-Q4_K_XL.gguf`
- `GLM-4.7-Flash-UD-Q4_K_XL.gguf`
- `Qwen3.5-35B-A3B-UD-Q4_K_XL.gguf`
- `gpt-oss-20b-F16.gguf`
- `mmproj-F16.gguf`

Example model families already detected locally:

- Qwen / Qwen image
- GLM
- GPT-OSS
- AceStep
- Wan 2.2
- Flux
- Hunyuan Video
- LongCat

Re-check with the script at runtime. Do not assume this snapshot is still current.

## Search buckets

When the user asks broadly, search across these buckets and keep only the strongest candidates:

1. Local text LLMs and reasoning models
2. Multimodal or vision-language models
3. Image generation and editing
4. Video generation
5. Speech, music, and TTS
6. Embeddings and rerankers
7. Inference runtimes and self-hosted apps

## Local model refresh checks

When local GGUF files already exist in `llamacpp_models`, do not limit the answer to brand-new models. Also check whether the existing families have newer upstream revisions worth replacing or adding.

For each local GGUF family:

1. Infer the family from the filename.
2. Search the original publisher or quantizer first.
3. Verify whether a newer release, refreshed quant, or improved variant exists.
4. Compare the candidate against the local file on:
   - release date
   - quant type
   - context length or architecture revision
   - known bug fixes or tokenizer fixes
   - practical quality or speed improvement

Examples of acceptable update reasons:

- newer base model revision
- improved quantization from the same trusted publisher
- bug-fixed GGUF export
- better instruction or reasoning variant

Weak reasons that should usually be rejected:

- same model with a different filename but no clear improvement
- mirror reposts with no provenance
- larger download with no meaningful benefit on this host

## Fit heuristics for this host

- 24 GB VRAM is strong for:
  - 7B to 14B models at high quality
  - many 20B-class quantized inference workloads
  - image generation and many video workflows with quantization, lower resolution, or staged pipelines
- 62 GB system RAM supports CPU offload, larger quantized models, and sizeable caches.
- Roughly 129 GB free storage means large downloads are possible, but duplicate multi-file checkpoints should still be justified.

## What to reward

- Clearly newer release or significant recent improvement
- High utility per GB or per VRAM
- Distinct capability not already covered locally
- Meaningful refresh path for a local `llamacpp_models` file already on disk
- Good docs, active repository, and practical deployment path
- Strong community traction when verified through official stars, releases, or model card activity

## What to penalize

- Redundant variants of models already present with little proven benefit
- Recommending a replacement for a local GGUF without a clear upstream improvement
- Unclear licensing or missing model card details
- Hardware requirements that exceed 24 GB VRAM without a plausible quantized path
- Dead repositories, abandoned demos, or unsupported checkpoints

## Output rubric

Prefer a table or flat list with these fields:

- Name
- Type
- Release or update date
- Fit for this host
- Why it is new or interesting
- Overlap with local inventory
- Source
