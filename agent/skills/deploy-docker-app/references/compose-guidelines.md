# Compose Guidelines

Open this file when the app docs are incomplete, when the host already has multiple stacks, or when you need a quick decision rule for ports, naming, storage, and verification.

## Source priority

1. Official app documentation
2. Official repository README, docs folder, release notes, or container examples
3. Official image registry documentation
4. Official Hugging Face or Civitai page for app-specific container guidance

If these disagree, favor the newest official container instructions from the project itself.

## Service naming

- Match nearby stacks.
- Prefer one short service name, usually the app name in lowercase.
- Avoid suffixes like `-service`, `-container`, or `-app` unless siblings use them.

Examples:

- Good: `openwebui`, `comfyui`, `immich`, `paperless`
- Avoid: `my-openwebui-service`

## Directory layout

Keep persistent data inside the selected stack directory.

Typical layout:

```text
stack-dir/
├── docker-compose.yml
├── .env
├── config/
├── data/
├── models/
└── logs/
```

Only create the subdirectories the app actually needs.

## Port selection

- Start with the official default port.
- Check whether it is already used locally.
- If occupied, pick a nearby unused port and keep the container-side port unchanged.
- Prefer binding to localhost only when the app is intended for a reverse proxy or local-only access.

Examples:

- `127.0.0.1:3001:3000` behind a reverse proxy
- `8081:8080` when `8080` is already taken

## Network selection

- Use the default Compose network unless the app must communicate with an existing reverse proxy, database, or shared service.
- Join an existing external network only after confirming its exact name from local Compose files or `docker network ls`.

## Environment variables

- Keep required settings explicit.
- Put secrets in `.env` when practical.
- Reuse existing host conventions for `PUID`, `PGID`, `TZ`, and reverse-proxy labels when those conventions are already present.
- Do not add speculative tuning flags.

## Volume rules

- Prefer relative bind mounts in the stack directory.
- Match the paths expected by the image docs.
- Create host directories before deploy when the image expects them to exist.
- Fix ownership or permissions when logs show access failures.

## Verification checklist

- `docker compose config` succeeds.
- `docker compose up -d` exits successfully.
- `docker compose ps` shows the service running or healthy.
- `docker compose logs --tail=200` shows no fatal errors.
- The documented UI, API, or health endpoint responds if applicable.

## Failure patterns

- Port already allocated: choose a free host port.
- Permission denied on mounted data: fix directory ownership or container UID/GID mapping.
- Missing dependency: add the required service or network from official docs.
- Container exits immediately: inspect entrypoint arguments, required env vars, and model/data path mounts.
