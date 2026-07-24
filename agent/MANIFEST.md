# Custom Extensions Manifest

Inventory of extensions in `~/.pi/agent/extensions/`, their ownership, and their
dependencies. Goal: everything self-contained and self-sustained here — no
third-party install or third-party updater required, except where explicitly
noted as externally owned.

## Self-owned (fully under our control)

| Extension | Purpose | Runtime deps | Endpoint |
|-----------|---------|--------------|----------|
| `memory/` | Persistent memory + self-learning + hybrid (BM25+vector) search | `node:sqlite`, typebox (pi-provided) | local SQLite + Ollama embeddings (soft) |
| `goal/` | Persistent goal tracking | none (pure TS) | — |
| `remember.ts` | `/remember` command → memory | uses `memory/` | — |
| `compaction-offloader.ts` | Offload compaction to local Ollama; prune context | pi API | Ollama offload (config) |
| `searxng-search.ts` | `web_search` tool + `/search` via SearXNG | `node:fetch` | SearXNG (config) |
| `time.ts` | `get_current_time`, `convert_time` (replaces time MCP) | `Intl` | — |
| `web-fetch.ts` | `web_fetch` tool (replaces fetch MCP) | `node:fetch` | — |
| `selfcheck.ts` | `/selfcheck` + `self_check` tool — infra health | `node:fetch` | probes all |
| `pi-status/` | Status bar: agent state, tools, compaction, model info | pi TUI | — |
| `lib/config.ts` | Shared endpoint config (not an extension; no index) | `node:fs` | reads `custom-config.json` |
| `context-manager/` | Context window management: ctx_execute, ctx_index, ctx_search, ctx_execute_file, ctx_purge | `node:fs`, `node:path`, `node:child_process` | sandbox dir |
| `context-stats/` | Context window usage tracking and display | `node:fs`, `node:path` | stats file |
| `safe-guard/` | Destructive command interception via before_tool_use hook | `node:fs`, `node:path` | rules.json |

Shared config resolution: **env var > `~/.pi/agent/custom-config.json` > built-in default**.
Env overrides: `PI_SEARXNG_URL`, `PI_OFFLOAD_PROVIDER`, `PI_OFFLOAD_URL`,
`PI_OFFLOAD_MODEL`, `PI_OFFLOAD_KEEP_ALIVE`, `PI_EMBEDDINGS_URL`, `PI_EMBEDDINGS_MODEL`.

**Local LLM = Ollama (not oMLX).** Both the compaction offload (`offloadModel`,
default `gemma4:e4b`) and embeddings (`embeddingsModel`, `nomic-embed-text`)
run on the local Ollama server (`127.0.0.1:11434`), which unloads idle models
automatically (offload model held `offloadKeepAlive`, default 30m, via the
native `/api/chat` endpoint since `/v1` ignores `keep_alive`). The pi
model-registry provider is `ollama` (see `models.json`);
the old `omlx` provider + `127.0.0.1:8000` server are retired. Both deps are
**soft**: compaction falls back to the default (paid) model and hybrid search
falls back to keyword-only (BM25) if Ollama is down. Run `/memory-reindex` to
(re)embed facts, `/selfcheck` to probe endpoints.

## Externally owned (do NOT edit — will be overwritten by its owner)

| Extension | Owner | Notes |
|-----------|-------|-------|
| `herdr-agent-state.ts` | **herdr** | Header: "managed by herdr; reinstalling or updating overwrites this file." Env-gated — no-op unless `HERDR_ENV=1` with socket + pane set. Forking it would double-report to herdr's socket, so we leave it as herdr's integration file and add custom hooks in *separate* files instead. |

## MCP servers (`../mcp.json`) — external processes we still depend on

Kept because they need engines/APIs we can't vendor:

- `filesystem` — `@modelcontextprotocol/server-filesystem` (npx)
- `context7` — docs lookup (external API/binary)
- `git` — `mcp-server-git` (uvx); bash also covers git
- `playwright` — browser automation (needs Chromium engine)

Removed (now native, see table above): `time` → `time.ts`, `fetch` → `web-fetch.ts`,
`searxng` → `searxng-search.ts`, `pi-stats` → `pi-status/`. Previous config archived at `../mcp.json.pre-native-*`.

## Testing

```bash
cd ~/.pi/agent/extensions/memory
npx tsx --test embed.test.ts store.test.ts injector.test.ts supersede.test.ts
node --test --experimental-strip-types failure-capture.test.ts

cd ~/.pi/agent/extensions/goal
npx tsx --test goal.test.ts
```
