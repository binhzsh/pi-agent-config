# pi-status

Persistent status bar for Pi that shows what the agent is doing in real-time.

## What it shows

- **Agent state**: idle ● / active ● with turn count and elapsed time
- **Active tools**: tool names and partial results as they execute
- **Compaction**: when context is being compacted (with reason)
- **Model info**: current model and thinking level
- **Streaming preview**: last 80 chars of the assistant's streaming response

## Installation

Place in `~/.pi/agent/extensions/pi-status/` for auto-discovery:

```bash
mkdir -p ~/.pi/agent/extensions/pi-status
# Copy index.ts there
```

Or load via CLI:

```bash
pi -e ~/.pi/agent/extensions/pi-status/index.ts
```

## Usage

The status bar appears below the editor automatically. Toggle with:

```
/status
```

## Events tracked

| Event | What it shows |
|-------|--------------|
| `agent_start` / `agent_end` | Active/idle state, turn count, elapsed time |
| `turn_start` / `turn_end` | Turn counter updates |
| `message_start` / `message_update` / `message_end` | Partial assistant message preview |
| `tool_execution_start` / `tool_execution_update` / `tool_execution_end` | Active tools with progress |
| `session_before_compact` / `session_compact` | Compaction state and reason |
| `model_select` | Current model |
| `thinking_level_select` | Current thinking level |

## How it works

1. Listens to Pi's extension events for agent lifecycle, tool execution, and compaction
2. Maintains a shared state object updated by event handlers
3. Creates a TUI widget rendered below the editor
4. Event handlers call `invalidate()` to trigger re-renders
5. Widget reads current theme on each render for theme-change support
