# Audit Rubric

Open this file when ranking findings, choosing evidence to show, or deciding whether a remediation is low-risk enough to propose.

## Priority guide

### Critical

- Direct exposure with high compromise risk
- Firewall disabled on an internet-facing host with multiple exposed services
- SSH configured in a clearly unsafe way on a public server
- Docker or app services published broadly with no intended exposure
- Disk full or nearly full in a way that threatens service stability

### High

- Important security updates pending
- Repeated authentication failures or suspicious service errors
- Failed critical services
- Sensitive files with overly broad write permissions
- Containers running with obviously risky settings or unexpected public ports

### Medium

- No unattended update posture
- Log rotation or service restart issues
- Resource pressure likely to cause instability
- Non-critical ports exposed unexpectedly on localhost or LAN

### Low

- Cosmetic hardening gaps
- Informational findings with little current risk

## Report style

- Prefer 3 to 8 findings, not a giant dump.
- Merge duplicates.
- Show the minimum evidence needed to justify the rating.
- Explain user impact, not just technical state.

## Remediation guardrails

- Back up files before edits, for example:
  - `/etc/ssh/sshd_config`
  - `/etc/ufw/user.rules`
  - service-specific config under `/etc`
- Validate before reload or restart:
  - `sshd -t` before restarting SSH
  - `ufw status numbered` before and after firewall changes
  - `docker ps` and `docker logs` after container-related changes
  - `systemctl status <unit>` after service changes

## Example evidence patterns

- Listening ports: `ss -ltnup`
- Failed units: `systemctl --failed`
- Firewall: `ufw status verbose`
- Pending updates: `apt list --upgradable`
- SSH posture: grep key directives from `sshd_config`
- Docker exposure: `docker ps --format '{{.Names}}\t{{.Ports}}'`
