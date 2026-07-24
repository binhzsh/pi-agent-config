/**
 * Shared config for custom pi extensions.
 *
 * Centralizes infrastructure endpoints so they aren't hardcoded in multiple
 * extensions. Resolution order (first hit wins):
 *   1. Environment variable override
 *   2. ~/.pi/agent/custom-config.json
 *   3. Built-in default (keeps everything working if the file is missing)
 *
 * This file lives in `extensions/lib/` which has no index.ts, so pi's extension
 * loader ignores it — it is only ever imported by sibling extensions.
 *
 * Zero external dependencies.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface CustomConfig {
  /** SearXNG web-search endpoint (lts2 services server, over VPN). */
  searxngUrl: string;
  /** pi model-registry provider name that serves the offload model (Ollama). */
  offloadProvider: string;
  /** Local Ollama OpenAI-compatible chat endpoint for offloaded work (compaction/summarization). */
  offloadUrl: string;
  /** Model name served by the offload endpoint (unloads when idle under Ollama). */
  offloadModel: string;
  /** How long Ollama keeps the offload model loaded after use (e.g. "30m", "0" = unload immediately). */
  offloadKeepAlive: string;
  /** Local Ollama embeddings endpoint for semantic memory search. */
  embeddingsUrl: string;
  /** Embedding model name served by the embeddings endpoint. */
  embeddingsModel: string;
}

const DEFAULTS: CustomConfig = {
  searxngUrl: "http://10.10.10.11:8888",
  offloadProvider: "ollama",
  offloadUrl: "http://127.0.0.1:11434/v1/chat/completions",
  offloadModel: "gemma4:e4b",
  offloadKeepAlive: "1h",
  embeddingsUrl: "http://127.0.0.1:11434/api/embeddings",
  embeddingsModel: "nomic-embed-text",
};

const CONFIG_PATH = join(homedir(), ".pi", "agent", "custom-config.json");

const ENV_MAP: Record<keyof CustomConfig, string> = {
  searxngUrl: "PI_SEARXNG_URL",
  offloadProvider: "PI_OFFLOAD_PROVIDER",
  offloadUrl: "PI_OFFLOAD_URL",
  offloadModel: "PI_OFFLOAD_MODEL",
  offloadKeepAlive: "PI_OFFLOAD_KEEP_ALIVE",
  embeddingsUrl: "PI_EMBEDDINGS_URL",
  embeddingsModel: "PI_EMBEDDINGS_MODEL",
};

let cached: CustomConfig | null = null;

function readFile(): Partial<CustomConfig> {
  try {
    const raw = readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

/** Load the merged config (env > file > default). Cached after first call. */
export function loadConfig(force = false): CustomConfig {
  if (cached && !force) return cached;
  const file = readFile();
  const out = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS) as (keyof CustomConfig)[]) {
    const env = process.env[ENV_MAP[key]];
    if (env && env.trim()) {
      out[key] = env.trim();
    } else if (typeof file[key] === "string" && (file[key] as string).trim()) {
      out[key] = (file[key] as string).trim();
    }
  }
  cached = out;
  return out;
}

/** Absolute path to the config file (for tooling / diagnostics). */
export const configPath = CONFIG_PATH;
