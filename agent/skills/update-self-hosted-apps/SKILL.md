---
name: update-self-hosted-apps
description: "Check self-hosted app and system updates on a Docker-based host, then apply selected upgrades. Use when Codex needs to inspect running containers and compose files, detect whether images are pinned or floating in YAML, research current upstream releases and docs online, identify apt package upgrades plus dependency or conflict risks, ask the user which apps or whether all apps and system packages should be updated, and then perform and verify the selected updates."
---

# Update Self Hosted Apps

Inspect first, verify upstream versions second, ask the user what to update third, and only then apply changes.
Do not update blindly.

## Scope

- Cover Docker containers managed by Compose plus general Ubuntu package updates.
- Focus on:
  - running container image versions
  - compose image tags and whether they are pinned or floating
  - latest upstream container releases and upgrade notes
  - apt package upgrades, held packages, dependency problems, and simulated conflicts

## Local discovery

- Start with the bundled inventory script:

```bash
python3 scripts/inventory_updates.py
```

- The script summarizes:
  - running containers and current image references
  - compose files under common roots
  - service image tags from YAML
  - whether each tag is pinned, floating, or missing
  - apt upgradable packages and a simulated upgrade summary

- If the host uses nonstandard compose roots, search manually and include them.
- Treat `latest`, `main`, `master`, `develop`, and missing tags as floating.

## Online verification

- After local inventory, go online and verify the latest relevant upstream version for each selected app.
- Prefer sources in this order:
  1. Official GitHub repository releases, tags, or docs
  2. Official image registry docs or README
  3. Official vendor docs site
- Use exact dates when discussing recent releases or update recency.
- Check for breaking changes, migration notes, required dependency changes, and image tag changes before proposing an update.

Open `references/update-guidelines.md` for source and risk heuristics.

## Reporting

- Return a concise report grouped by:
  - container apps with updates available
  - apps already current
  - apps using floating tags
  - apt package updates
  - conflicts or blockers

- For each app include:
  - compose file path
  - service name
  - current image reference
  - tag type: pinned or floating
  - latest upstream version
  - notable upgrade notes or breaking changes
  - recommended action

- For apt include:
  - count of upgradable packages
  - notable security-sensitive packages
  - held packages or simulated dependency issues if found

## User choice

- After the report, ask the user to choose:
  - one or more specific apps
  - all app updates
  - whether to also run general system updates via `sudo apt update && sudo apt upgrade`
- Do not apply app or apt updates until the user answers.

## Update workflow

1. Back up the relevant compose file before editing it.
2. If the service uses a pinned tag and the user chose to update it, edit the tag to the selected new version.
3. If the service uses a floating tag, usually keep the tag and pull the latest image unless upstream docs recommend pinning first.
4. Validate the compose file if practical.
5. Pull and recreate only the selected service or stack.
6. Re-check logs, health status, and published ports.
7. For apt updates, refresh package metadata, perform the upgrade, and inspect any kept-back or broken packages.

## Conflict checks

- Before applying changes, inspect:
  - `apt-mark showhold`
  - simulated upgrade output from `apt-get -s upgrade`
  - container health and dependency ordering in Compose
  - breaking change notes from upstream releases
- If a dependency or migration blocker exists, stop and explain it before changing the system.

## Guardrails

- Never update everything automatically without user confirmation.
- Never rewrite many image tags at once without confirming the exact target set.
- Prefer focused service restarts over full-stack restarts when the user selected a subset.
- If an update could cause downtime or a schema migration, warn the user before applying it.
- Always verify the selected updates completed successfully and note any remaining manual follow-up.
