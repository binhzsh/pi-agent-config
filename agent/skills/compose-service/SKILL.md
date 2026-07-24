---
name: compose-service
description: |-
  Scaffold clean Docker Compose services for self-hosted apps. Produces
  compose.yml, .env.example, README runbook, healthchecks, volume layout,
  backup notes, and safe defaults. Use proactively when deploying any app
  locally, in a homelab, or on a VPS via Docker Compose.

  Examples:
  - user: "Set up a PostgreSQL database" → scaffold compose + env + runbook
  - user: "Deploy a Next.js app with Redis" → multi-service compose stack
  - user: "Add a monitoring stack" → compose with Prometheus, Grafana, healthchecks
  - user: "Containerize my app" → Dockerfile + compose + .env.example + README
---

# Compose Service

Scaffold a production-ready Docker Compose stack.

## Purpose

Generate safe, documented, production-grade Docker Compose configurations with
healthchecks, backup procedures, and runbooks.

## When to Use

- Deploying any app locally, in a homelab, or on a VPS
- Adding a new service to an existing Compose stack
- Containerizing an application

## Inputs

- Service description (app type, ports, data stores, dependencies)

## Outputs

- `compose.yml` — services, networks, volumes, healthchecks
- `.env.example` — all configurable variables with safe defaults
- `README.md` — runbook with install, run, backup, upgrade, troubleshoot
- Volume layout with `.gitkeep` files

## Safety Constraints

- Never uses `image: latest` — always pin versions
- Never uses `restart: always` — uses `unless-stopped`
- Never hardcodes secrets — uses `.env` files
- Never exposes ports unnecessarily — internal networks by default
- Never uses `privileged: true` — specific `cap_add` if needed

## Workflow

1. **Understand the service** — app type, ports, data stores, dependencies
2. **Choose images** — prefer official, slim/alpine variants; pin versions
3. **Write `compose.yml`** — services, networks, volumes, healthchecks, restart policies
4. **Write `.env.example`** — all configurable variables with safe defaults
5. **Write `README.md`** — runbook with install, run, backup, upgrade, troubleshoot
6. **Scaffold volume layout** — `data/` directory structure with `.gitkeep` files

## compose.yml Structure

```yaml
services:
  <name>:
    image: <registry/image>:<tag>        # pin version, never "latest"
    container_name: <project>_<name>
    restart: unless-stopped
    env_file: .env
    environment:
      - TZ=${TZ:-UTC}
    healthcheck:
      test: ["CMD", <health-command>]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    networks:
      - internal
    volumes:
      - <name>-data:/data
    depends_on:
      <dependency>:
        condition: service_healthy

networks:
  internal:
    driver: bridge

volumes:
  <name>-data:
    driver: local
```

## Safe Defaults

| Setting | Default | Rationale |
|---|---|---|
| `restart` | `unless-stopped` | Survives reboots, respects manual stops |
| `healthcheck` | always add where supported | Enables health-based startup |
| networks | `internal` (service-to-service) | Least privilege |
| volumes | named for data, bind for config | Portable + overridable |
| ports | only expose what host needs | Reduce attack surface |

## Healthcheck Patterns

| Service | Healthcheck Command |
|---|---|
| PostgreSQL | `pg_isready -U ${DB_USER:-postgres}` |
| MySQL/MariaDB | `mysqladmin ping -u root -p"${MYSQL_ROOT_PASSWORD}"` |
| Redis | `redis-cli ping` |
| Nginx | `curl -fsS http://localhost:80/ \|\| exit 1` |
| Node.js | `wget -qO- http://localhost:${PORT}/health \|\| exit 1` |
| Python (FastAPI) | `curl -fsS http://localhost:${PORT}/health \|\| exit 1` |
| Traefik | `wget -qO- http://localhost:8080/ping` |
| Grafana | `curl -fsS http://localhost:3000/api/health \|\| exit 1` |
| Prometheus | `wget -qO- http://localhost:9090/-/healthy` |

## .env.example

```bash
# Copy to .env and edit before running

# ── Timezone ──────────────────────────────────────────────
TZ=UTC

# ── PostgreSQL ────────────────────────────────────────────
POSTGRES_USER=app
POSTGRES_PASSWORD=changeme
POSTGRES_DB=app
```

## README Runbook

Include: Quick Start, Services table, Data & Volumes, Backup, Upgrade, Troubleshooting, Resource Limits.

## Volume Layout

```
project/
├── compose.yml
├── .env.example
├── .env                    # gitignored
├── README.md
├── config/
│   └── .gitkeep
├── data/
│   └── .gitkeep
└── scripts/
    ├── backup.sh
    └── restore.sh
```

## Anti-Patterns to Avoid

- `restart: always` — traps manually stopped containers
- `image: latest` — non-reproducible
- `ports: "0.0.0.0:..."` — binds all interfaces
- No healthchecks — blind startup ordering
- Bind-mounted data volumes — break portability
- Hardcoded secrets in compose — always use `.env`
- `privileged: true` — overkill
- No resource limits — add `deploy.resources.limits` in production

## Rules

- **Pin versions** — never `latest`; use specific tags
- **Healthchecks everywhere** — if the image supports it, add one
- **Least privilege networking** — internal-only unless host needs access
- **Named volumes for data** — bind mounts for config only
- **Secrets via env files** — never hardcoded in compose
- **Safe restart policy** — `unless-stopped`, not `always`
- **Document everything** — README runbook is mandatory
- **Backup before upgrade** — always, without exception
