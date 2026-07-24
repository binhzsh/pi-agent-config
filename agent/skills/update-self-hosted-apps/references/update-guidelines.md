# Update Guidelines

Open this file when ranking update risk, deciding whether a tag is acceptably pinned, or planning the safest upgrade order.

## Tag policy

- Pinned tags are explicit versions such as:
  - `redis:7.2-alpine`
  - `pgvector/pgvector:pg17`
  - `ghcr.io/example/app:v1.4.2`
- Floating tags include:
  - `latest`
  - `main`
  - `master`
  - `develop`
  - no tag at all

Floating tags need extra caution because the running version may drift from the compose file without a visible YAML change.

## Report priorities

### High priority

- Security or stability updates for internet-facing services
- Services with breaking notes or required migrations
- Packages like `openssh-server`, `sudo`, kernel packages, container runtimes, reverse proxies
- Apps using floating tags with no recent verification

### Medium priority

- Routine feature updates with low migration risk
- Internal-only services with clear rollback paths
- Non-critical apt upgrades

### Low priority

- Cosmetic or minor tooling updates
- Services already effectively current

## Upgrade order

1. Read upstream notes
2. Back up compose or env files
3. Update one app or tightly-coupled stack at a time
4. Verify health before moving to the next selection
5. Run apt upgrades last unless a package upgrade is a prerequisite

## Useful checks

- Compose inventory: `python3 scripts/inventory_updates.py`
- Held packages: `apt-mark showhold`
- Simulated upgrade: `apt-get -s upgrade`
- Current containers: `docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}'`
- Service logs after update: `docker compose logs --tail=200 <service>`

## Verification checklist

- Container recreated successfully
- Health checks pass or logs are clean
- Ports are still bound as expected
- No missing environment variables or dependency failures
- `apt upgrade` leaves no broken packages
