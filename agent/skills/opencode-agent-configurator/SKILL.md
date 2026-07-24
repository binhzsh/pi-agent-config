---
name: opencode-agent-configurator
description: Design and update OpenCode agent profiles (Build/Plan/custom agents) with correct tool permissions, model choice, and task-specific prompts. Use when creating new agents, hardening existing ones, or separating planning from execution workflows.
---
# OpenCode Agent Configurator

Create or refine agent definitions for clear separation of responsibility.

## Configure Agent Roles

1. Keep planning agents read-only (`write/edit/bash` disabled unless required).
2. Keep build agents execution-capable with explicit permission boundaries.
3. Create specialized agents only when they have distinct tool/model/prompt needs.

## Configure With Minimal Risk

1. Start with least privilege.
2. Grant write and shell tools only for agents that need implementation rights.
3. Prefer narrower permissions for high-risk tools.

## Prompt Design

1. Keep prompts concise and procedural.
2. Encode completion criteria and non-goals.
3. Include failure handling behavior: what to do when blocked.

## Validation Checklist

1. Verify agent mode (`primary` or `subagent`) is correct.
2. Verify model supports required tool calling quality.
3. Verify permission map matches intended risk level.
4. Run one realistic smoke task per agent.
