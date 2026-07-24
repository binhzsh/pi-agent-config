---
name: audit-server-security
description: "Audit server security, system health, and vulnerability exposure, then remediate selected issues. Use when Codex needs to inspect a Linux host for risky services, exposed ports, firewall gaps, failed units, package-update posture, SSH hardening issues, Docker exposure, disk or memory pressure, and other operational security problems; produce a prioritized report with recommendations; ask the user which finding to fix; then implement and verify the selected remediation."
---

# Audit Server Security

Collect evidence first, produce a prioritized report second, and remediate only the user-selected findings third.
Do not blur diagnosis and remediation.

## Scope

- Cover baseline security and general system health on Linux hosts.
- Focus on findings that are actionable from the terminal: exposed services, firewall posture, package update posture, failed services, suspicious listening ports, Docker socket or published-port exposure, SSH hardening gaps, disk pressure, memory pressure, and obvious misconfigurations.
- Treat remediation as opt-in per finding. The user chooses what to fix after seeing the report.

## Prerequisites

- Start with non-destructive read-only inspection.
- Use the bundled collector:

```bash
bash scripts/collect_security_baseline.sh
```

- If a command is missing, continue and note the missing probe in the report.
- Only escalate or apply changes when the user has selected a specific remediation target.

## Audit workflow

1. Run the collector and inspect the raw output.
2. Review key configuration files and live state as needed to confirm findings.
3. Produce a report grouped by priority: critical, high, medium, low.
4. For each finding, include evidence, impact, and a concrete recommendation.
5. Ask the user which issue or issues to resolve.
6. Remediate only the selected issue set.
7. Re-run the relevant checks and report what changed.

## What to inspect

- OS and kernel version
- uptime, load, memory, swap, and disk usage
- failed `systemd` units
- listening TCP and UDP ports
- firewall status with `ufw` when available
- package updates and unattended upgrade posture
- SSH daemon settings when `sshd_config` exists
- Docker containers, published ports, restart status, and risky socket exposure
- recent authentication or service failures from `journalctl`
- world-writable files in sensitive areas when practical

Open `references/rubric.md` for ranking guidance and remediation guardrails.

## Report shape

- Keep the report concise and evidence-based.
- For each finding include:
  - title
  - priority
  - why it matters
  - concrete evidence
  - recommended fix
  - estimated risk of the fix

- End the report with a short "recommended first actions" section.
- Then ask the user which finding to resolve. If several are independent and low-risk, offer a small batch.

## Remediation rules

- Never make broad hardening changes without user selection.
- Prefer the smallest safe change that resolves the selected finding.
- Back up config files before editing them.
- Validate syntax before restarting services.
- If a fix could impact connectivity, especially SSH, firewall, or networking, warn the user clearly before applying it.
- After each fix, verify with the exact command that proves the issue is resolved.

## Guardrails

- Do not claim a vulnerability exists without evidence from the host state or an authoritative source.
- Do not install heavyweight scanners by default; use built-in tools first.
- Do not delete logs, reset firewall rules, or disable services unless that is the chosen remediation and the impact is understood.
- If root access is required and not available, stop at the report and state the exact command that needs elevated privileges.
