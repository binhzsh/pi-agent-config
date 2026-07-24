#!/usr/bin/env python3
"""Inventory running containers, compose image tags, and apt upgrade signals."""

from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

import yaml


COMPOSE_NAMES = {
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
    "compose.yaml",
}
SEARCH_ROOTS = [
    Path("/mnt/main_pool/Docker"),
    Path("/mnt/main_pool/Applications"),
    Path("/mnt/main_pool/projects"),
]
FLOATING_TAGS = {"latest", "main", "master", "develop"}


def run(cmd: list[str]) -> str:
    try:
        result = subprocess.run(cmd, check=False, capture_output=True, text=True)
    except FileNotFoundError:
        return ""
    if result.returncode != 0:
        return result.stdout.strip() or result.stderr.strip()
    return result.stdout.strip()


def discover_compose_files() -> list[Path]:
    found: list[Path] = []
    seen: set[Path] = set()
    for root in SEARCH_ROOTS:
        if not root.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [
                name
                for name in dirnames
                if not name.startswith(".") and name not in {"__pycache__", "node_modules", "vendor"}
            ]
            for filename in filenames:
                if filename not in COMPOSE_NAMES:
                    continue
                resolved = Path(dirpath, filename).resolve()
                if resolved not in seen:
                    seen.add(resolved)
                    found.append(resolved)
    return sorted(found)


def tag_type(image: str) -> str:
    if "${" in image:
        return "templated-image"
    if "@" in image:
        return "pinned-digest"
    if ":" not in image.rsplit("/", 1)[-1]:
        return "floating-missing-tag"
    tag = image.rsplit(":", 1)[-1]
    if tag in FLOATING_TAGS:
        return "floating-tag"
    return "pinned-tag"


def parse_compose_file(path: Path) -> dict[str, object]:
    try:
        data = yaml.safe_load(path.read_text()) or {}
    except Exception as exc:
        return {"path": str(path), "error": str(exc), "services": []}

    services_out = []
    services = data.get("services", {})
    if isinstance(services, dict):
        for service_name, service in services.items():
            if not isinstance(service, dict):
                continue
            image = service.get("image", "")
            container_name = service.get("container_name", "")
            services_out.append(
                {
                    "service": service_name,
                    "container_name": container_name,
                    "image": image,
                    "tag_type": tag_type(image) if image else "missing-image",
                }
            )
    return {"path": str(path), "services": services_out}


def docker_ps() -> list[dict[str, str]]:
    output = run(
        [
            "docker",
            "ps",
            "--format",
            "{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}",
        ]
    )
    rows = []
    for line in output.splitlines():
        parts = line.split("\t")
        if len(parts) != 4:
            continue
        rows.append(
            {
                "name": parts[0],
                "image": parts[1],
                "status": parts[2],
                "ports": parts[3],
            }
        )
    return rows


def apt_upgrades() -> dict[str, object]:
    upgradable = run(["apt", "list", "--upgradable"])
    held = run(["apt-mark", "showhold"])
    simulated = run(["apt-get", "-s", "upgrade"])
    problems = []
    for line in simulated.splitlines():
        if re.search(r"\b(kept back|unmet dependencies|broken packages)\b", line, re.I):
            problems.append(line.strip())
    lines = [line for line in upgradable.splitlines() if line and not line.startswith("Listing...")]
    return {
        "upgradable_count": len(lines),
        "upgradable_packages": lines[:80],
        "held_packages": [line for line in held.splitlines() if line],
        "simulated_upgrade_problems": problems,
    }


def main() -> None:
    compose_files = discover_compose_files()
    payload = {
        "running_containers": docker_ps(),
        "compose_files": [parse_compose_file(path) for path in compose_files],
        "apt": apt_upgrades(),
    }
    print(json.dumps(payload, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
