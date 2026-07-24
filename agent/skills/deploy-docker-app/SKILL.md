---
name: deploy-docker-app
description: "Research and deploy self-hosted apps with Docker or Docker Compose. Use when Codex needs to look up official install or container guidance for an app, inspect an existing host's Docker layout, generate a `docker-compose.yml` in a user-selected directory, create same-directory persistent mounts, choose ports and network settings that fit the host, deploy the stack, and verify it starts without errors."
---

# Deploy Docker App

Research the app from official sources first, then build a host-aware Compose stack and verify it runs cleanly.
Prefer deterministic local inspection over assumptions.

## Prerequisite check

- Confirm Docker is installed: `docker --version`.
- Detect Compose command:
  - Prefer `docker compose version`.
  - Fallback to `docker-compose --version` only if the plugin is unavailable.
- If Docker or Compose is missing, stop and tell the user exactly what is missing.

## Source selection

- Start online. Use official documentation from the app vendor first.
- Prefer sources in this order:
  1. Official docs site
  2. Official GitHub repository or container registry documentation
  3. Official Hugging Face, Civitai, or model/publisher page if the app is published there
- Avoid blog posts and random Compose examples unless official sources are incomplete.
- Resolve image name, required environment variables, data directories, supported ports, health checks, GPU requirements, and any required sidecar services before writing Compose.
- If official sources conflict, follow the app repository's current container instructions and note the conflict in the final response.

For reusable heuristics and Compose rules, open `references/compose-guidelines.md`.

## Host inspection

- Identify the target directory from the user request. If the directory does not exist, create it.
- Inspect nearby Docker projects before choosing names or ports:
  - search for existing `compose.yml`, `docker-compose.yml`, and `.env` files
  - inspect existing networks, container names, and published ports
  - look for reverse proxy conventions, shared external networks, UID/GID patterns, timezone settings, and volume style
- Reuse local naming conventions. Keep the new service name short and consistent with sibling stacks.
- Do not claim a host port that is already in use. If the default port is busy, pick a nearby free port and document it.

Useful commands:

```bash
find /path/to/root -maxdepth 3 \( -name 'compose.yml' -o -name 'docker-compose.yml' -o -name '.env' \)
docker ps --format '{{.Names}}\t{{.Ports}}'
docker network ls
ss -ltnp
```

## Compose authoring

- Write the stack inside the selected directory as `docker-compose.yml` unless neighboring stacks use `compose.yml`.
- Mount persistent data inside that same directory. Prefer bind mounts such as:
  - `./data:/data`
  - `./config:/config`
  - `./models:/models`
- Keep all persistent paths relative to the stack directory unless official docs require otherwise.
- Only expose the minimum ports needed.
- Prefer named networks only when the app needs to join an existing shared network; otherwise let Compose create the default project network.
- Add restart policy unless official docs say otherwise.
- Add health checks when the image or docs provide a reliable probe.
- Use `.env` only when it improves clarity or keeps secrets out of the Compose file.
- Do not invent environment variables. Every variable must come from official docs or a justified host convention.

## Deploy

- Validate before starting:

```bash
docker compose -f docker-compose.yml config
```

- If using legacy Compose, translate the command to `docker-compose -f docker-compose.yml config`.
- Pull and start the stack from the target directory:

```bash
docker compose pull
docker compose up -d
```

## Verify

- Confirm the service is running:

```bash
docker compose ps
docker compose logs --tail=200
```

- Check for restart loops, missing files, permission errors, port conflicts, schema migrations that failed, or dependency connection failures.
- If the app exposes HTTP, test it with `curl` against the selected host port or documented health endpoint.
- If the app is not HTTP-based, verify through container health status, logs, and any documented CLI readiness check.
- If startup fails, fix the configuration and retest before finishing.

## Guardrails

- Never overwrite unrelated stacks or modify existing Compose files unless the user asked for that explicitly.
- Never use anonymous Docker volumes for required persistent app data when a same-directory bind mount is viable.
- Do not leave the stack half-deployed. Either finish with a healthy deployment or report the exact blocker.
- Call out manual follow-up only when it cannot be automated safely, such as credentials the user must provide.
