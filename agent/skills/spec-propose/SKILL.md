---
name: spec-propose
description: |-
  Propose a new change with all artifacts generated in one step. Use when the user
  wants to quickly describe what they want to build and get a complete proposal with
  design, specs, and tasks ready for implementation.

  Examples:
  - user: "/propose add-dark-mode" → create full change with all artifacts
  - user: "/propose user-authentication" → scaffold change with proposal, specs, design, tasks
  - user: "/propose refactor database layer" → create change with skip_specs if pure refactor
  - user: "/propose add API rate limiting" → create change with new capability specs
---

# Propose a New Change

Create a change with all planning artifacts in one step.

## What Gets Created

With the default spec-driven schema:
- `proposal.md` — what & why
- `specs/<capability>/spec.md` — what the system must do (delta spec)
- `design.md` — how to implement
- `tasks.md` — implementation steps

## Directory Setup

First, ensure the openspec directory structure exists:

```bash
mkdir -p openspec/changes
```

If `openspec/config.yaml` doesn't exist, create a minimal one:

```yaml
schema: spec-driven
context: |
  # Project context will be filled in as needed
```

## Steps

### 1. Get the change name

The user should provide a change name (kebab-case) OR a description of what they want to build.

If no clear input: Ask the user what they want to build, then derive a kebab-case name
(e.g., "add user authentication" → `add-user-auth`).

**IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

### 2. Check for existing change

```bash
ls openspec/changes/<name>/ 2>/dev/null
```

If a change with that name already exists, ask the user if they want to continue it
or create a new one with a different name.

### 3. Create the change scaffold

```bash
mkdir -p openspec/changes/<name>/specs
echo "schema: spec-driven" > openspec/changes/<name>/.openspec.yaml
```

### 4. Read project context

```bash
cat openspec/config.yaml 2>/dev/null
```

Extract:
- `context`: project background (constraints — do NOT copy into artifacts)
- `rules`: artifact-specific rules (constraints — do NOT copy into artifacts)

Use graphify for codebase context if available:
```bash
graphify query "<topic>"  # understand architecture
```

### 5. Create proposal.md

Write to `openspec/changes/<name>/proposal.md` using the template at
`spec-workflow/resources/templates/proposal.md`.

**Content guidelines:**
- **Why**: 1-2 sentences on the problem or opportunity
- **What Changes**: Bullet list of specific changes
- **Capabilities**: List new/modified capabilities with kebab-case names
- **Impact**: Affected code, APIs, dependencies, systems

**Critical**: The Capabilities section creates the contract between proposal and specs.
Each capability listed here will need a corresponding spec file.

Every change must either declare at least one capability or set `skip_specs: true`
in `.openspec.yaml` (for pure refactors, tooling, docs).

### 6. Create spec files

For each capability in the proposal's Capabilities section:

```bash
mkdir -p openspec/changes/<name>/specs/<capability>
```

Write to `openspec/changes/<name>/specs/<capability>/spec.md` using the template at
`spec-workflow/resources/templates/spec.md`.

**Content guidelines:**
- Start with `## Purpose` (50+ characters) for new capabilities
- Use `## ADDED Requirements` for new capabilities
- Use `## MODIFIED Requirements` for existing capabilities (copy full requirement block)
- Use `## REMOVED Requirements` for deprecated features (include Reason + Migration)
- Each requirement: `### Requirement: <name>` with SHALL/MUST language
- Each scenario: `#### Scenario: <name>` with WHEN/THEN format
- **CRITICAL**: Scenarios MUST use exactly 4 hashtags (`####`)
- Every requirement MUST have at least one scenario

**Delta operations:**
- **ADDED Requirements**: New capabilities
- **MODIFIED Requirements**: Changed behavior — MUST include full updated content
- **REMOVED Requirements**: Deprecated features — MUST include Reason and Migration
- **RENAMED Requirements**: Name changes only — use FROM:/TO: format

### 7. Create design.md

Write to `openspec/changes/<name>/design.md` using the template at
`spec-workflow/resources/templates/design.md`.

**Content guidelines:**
- **Context**: Current state and constraints needed to explain the approach
- **Goals / Non-Goals**: What this design achieves and explicitly excludes
- **Decisions**: Key technical choices with rationale and alternatives considered
- **Risks / Trade-offs**: Known limitations, format: [Risk] → Mitigation
- **Migration Plan**: Steps to deploy, rollback strategy (if applicable)
- **Open Questions**: Genuinely deferrable unknowns only

**When to skip design.md:**
- Simple, single-file changes with obvious implementation
- No architectural decisions to make
- User explicitly says skip design

### 8. Create tasks.md

Write to `openspec/changes/<name>/tasks.md` using the template at
`spec-workflow/resources/templates/tasks.md`.

**Content guidelines:**
- Group related tasks under `## numbered headings`
- Each task MUST be a checkbox: `- [ ] X.Y Task description`
- Tasks should be small enough to complete in one session
- Order tasks by dependency (what must be done first?)
- Reference specs for what needs to be built, design for how to build it

### 9. Show final status

Display:
- Change name and location
- List of artifacts created with brief descriptions
- What's ready: "All artifacts needed for implementation are ready."
- Prompt: "Run `/apply` or ask me to implement to start working on the tasks."

---

## Artifact Creation Guidelines

- Follow the templates from `spec-workflow/resources/templates/`
- Use `context` and `rules` as constraints — do NOT copy them into the files
- Read dependency artifacts for context before creating new ones
- Use graphify for codebase understanding when relevant
- Keep proposals concise (1-2 pages)
- Specs should be testable — each scenario is a potential test case
- Tasks should be verifiable — you know when each is done

## Guardrails

- Create every artifact the apply phase depends on
- Always read project context before creating artifacts
- If context is critically unclear, ask the user — but prefer making reasonable decisions
- If a change with that name already exists, ask before overwriting
- Verify each artifact file exists after writing
- Don't implement code during propose — that's for `/apply`
