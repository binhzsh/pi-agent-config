/**
 * Self-Check Extension
 *
 * `/selfcheck` — one-shot health report for the custom integration suite:
 *   - Resolved config endpoints (searxng, Ollama offload + embeddings)
 *   - Reachability of each endpoint
 *   - Memory DB presence
 *   - custom-config.json validity
 *
 * Turns "silently degraded" into "visibly reported". Zero external deps.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadConfig, configPath } from "./lib/config.js";

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

async function ping(url: string, timeoutMs = 3000): Promise<{ ok: boolean; detail: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const ms = Date.now() - start;
    return { ok: res.ok, detail: `HTTP ${res.status} in ${ms}ms` };
  } catch (e: any) {
    return { ok: false, detail: e?.name === "AbortError" ? `timeout >${timeoutMs}ms` : e?.message || "unreachable" };
  } finally {
    clearTimeout(t);
  }
}

async function runChecks(): Promise<Check[]> {
  const cfg = loadConfig(true);
  const checks: Check[] = [];

  // custom-config.json
  checks.push({
    name: "custom-config.json",
    ok: existsSync(configPath),
    detail: existsSync(configPath) ? configPath : `missing (using defaults) — ${configPath}`,
  });

  // memory DB
  const memDb = join(homedir(), ".pi", "memory", "memory.db");
  const memOk = existsSync(memDb);
  checks.push({
    name: "memory.db",
    ok: memOk,
    detail: memOk ? `${(statSync(memDb).size / 1024).toFixed(0)} KB` : "not found",
  });

  // SearXNG (search endpoint)
  const sx = await ping(`${cfg.searxngUrl}/search?q=healthcheck&format=json`);
  checks.push({ name: `SearXNG (${cfg.searxngUrl})`, ok: sx.ok, detail: sx.detail });

  // Ollama offload (chat/compaction model endpoint)
  const offloadBase = cfg.offloadUrl.replace(/\/v1\/.*$/, "");
  const off = await ping(`${offloadBase}/v1/models`);
  checks.push({ name: `Ollama offload (${offloadBase})`, ok: off.ok, detail: `${off.detail} — model ${cfg.offloadModel}` });

  // Ollama embeddings (semantic memory) — real embed so a missing model is caught.
  const emb = await pingEmbed(cfg.embeddingsUrl, cfg.embeddingsModel);
  checks.push({ name: `Ollama embeddings (${cfg.embeddingsModel})`, ok: emb.ok, detail: emb.detail });

  return checks;
}

/** POST a tiny embed request; ok only if a non-empty vector comes back. */
async function pingEmbed(url: string, model: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt: "healthcheck" }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const data = (await res.json()) as { embedding?: number[] };
    const dim = Array.isArray(data.embedding) ? data.embedding.length : 0;
    return dim > 0 ? { ok: true, detail: `${dim}-dim` } : { ok: false, detail: "empty embedding" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "unreachable" };
  }
}

function render(checks: Check[]): string {
  const lines = checks.map((c) => `${c.ok ? "✅" : "❌"} ${c.name} — ${c.detail}`);
  const failed = checks.filter((c) => !c.ok).length;
  const summary = failed === 0 ? "All systems healthy." : `${failed}/${checks.length} check(s) failing.`;
  return `Integration self-check:\n\n${lines.join("\n")}\n\n${summary}`;
}

export default function selfCheckExtension(pi: ExtensionAPI) {
  pi.registerCommand("selfcheck", {
    description: "Health-check custom integrations (config, memory, searxng, Ollama offload + embeddings)",
    async handler(_args, ctx) {
      ctx.ui.notify("Running integration self-check…", "info");
      try {
        const checks = await runChecks();
        const report = render(checks);
        const anyFail = checks.some((c) => !c.ok);
        ctx.ui.notify(report, anyFail ? "warning" : "info");
      } catch (e: any) {
        ctx.ui.notify(`Self-check error: ${e?.message || e}`, "error");
      }
    },
  });

  // Also expose as a tool so the agent can self-diagnose mid-session.
  pi.registerTool({
    name: "self_check",
    label: "Integration Self-Check",
    description:
      "Check the health of custom integrations: config file, memory DB, SearXNG search endpoint, and the local Ollama offload + embeddings endpoints. Use when web search, memory, or compaction seems broken.",
    parameters: { type: "object", properties: {}, required: [] },
    async execute() {
      const checks = await runChecks();
      return {
        content: [{ type: "text", text: render(checks) }],
        details: { tool: "self_check", failing: checks.filter((c) => !c.ok).map((c) => c.name) },
      };
    },
  });
}
