---
name: mcp-context-governor
description: Add and tune MCP servers in OpenCode while controlling context/token overhead and permission risk. Use when enabling new MCP tools, fixing noisy toolsets, or debugging MCP auth and timeout issues.
---
# MCP Context Governor

Manage MCP servers with context budget and reliability as first-class constraints.

## Add MCP Safely

1. Add one server at a time.
2. Start disabled or behind approval for high-risk tools.
3. Configure timeout and required environment variables explicitly.

## Minimize Context Overhead

1. Enable only MCP servers needed for the active project.
2. Disable broad or rarely used MCP toolsets.
3. Prefer explicit tool mention in prompts to avoid accidental invocation.

## Debug MCP Failures

1. Verify MCP config shape and command/url correctness.
2. For OAuth servers, trigger auth and verify credential state.
3. If tool fetch times out, increase timeout incrementally.
4. If token usage explodes, disable heavy MCPs and re-test.

## Output Contract

When making changes, return:
- The exact config diff applied.
- Why each MCP was enabled/disabled.
- Remaining risk and follow-up verification commands.
