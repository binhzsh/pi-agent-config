#!/usr/bin/env python3
"""Summarize local hardware and model inventory for AI research tasks."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from collections import Counter
from pathlib import Path


MODEL_ROOT = Path(os.environ.get("FAST_MODELS_DIR", "/mnt/fast_pool/fast_models"))
SCAN_EXTENSIONS = {
    ".gguf",
    ".safetensors",
    ".bin",
    ".pt",
    ".pth",
    ".ckpt",
    ".onnx",
}


def run(cmd: list[str]) -> str:
    try:
        result = subprocess.run(
            cmd,
            check=False,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        return ""
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def get_ram_gib() -> dict[str, float]:
    meminfo = {}
    try:
        for line in Path("/proc/meminfo").read_text().splitlines():
            key, raw = line.split(":", 1)
            parts = raw.strip().split()
            if len(parts) >= 2 and parts[1] == "kB":
                meminfo[key] = int(parts[0])
    except OSError:
        return {}
    total = meminfo.get("MemTotal")
    available = meminfo.get("MemAvailable")
    if not total:
        return {}
    out = {"total_gib": round(total / 1024 / 1024, 1)}
    if available:
        out["available_gib"] = round(available / 1024 / 1024, 1)
    return out


def get_cpu() -> dict[str, object]:
    info: dict[str, object] = {}
    try:
        for line in Path("/proc/cpuinfo").read_text().splitlines():
            if ":" not in line:
                continue
            key, value = [part.strip() for part in line.split(":", 1)]
            if key == "model name" and "model_name" not in info:
                info["model_name"] = value
            elif key == "cpu cores" and "cpu_cores" not in info:
                info["cpu_cores"] = int(value)
            elif key == "siblings" and "threads_per_socket" not in info:
                info["threads_per_socket"] = int(value)
        info["logical_cpus"] = os.cpu_count()
    except OSError:
        pass
    return info


def get_gpu() -> list[dict[str, str]]:
    gpu_info = []
    output = run(
        [
            "nvidia-smi",
            "--query-gpu=name,memory.total,driver_version",
            "--format=csv,noheader,nounits",
        ]
    )
    if output:
        for line in output.splitlines():
            name, memory_mib, driver = [part.strip() for part in line.split(",", 2)]
            gpu_info.append(
                {
                    "name": name,
                    "memory_gib": str(round(int(memory_mib) / 1024, 1)),
                    "driver_version": driver,
                    "vendor": "nvidia",
                }
            )
    return gpu_info


def get_storage(path: Path) -> dict[str, float | str]:
    try:
        usage = shutil.disk_usage(path)
    except FileNotFoundError:
        return {}
    gib = 1024**3
    return {
        "path": str(path),
        "total_gib": round(usage.total / gib, 1),
        "used_gib": round(usage.used / gib, 1),
        "free_gib": round(usage.free / gib, 1),
    }


def scan_models(root: Path) -> dict[str, object]:
    summary: dict[str, object] = {
        "exists": root.exists(),
        "path": str(root),
        "top_level_dirs": [],
        "file_count": 0,
        "extension_counts": {},
        "sample_files": [],
    }
    if not root.exists():
        return summary

    top_level_dirs = sorted([p.name for p in root.iterdir() if p.is_dir()])
    summary["top_level_dirs"] = top_level_dirs

    counts: Counter[str] = Counter()
    samples: list[str] = []
    file_count = 0

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [name for name in dirnames if name not in {".git", ".cache", ".venv", "__pycache__"}]
        for filename in filenames:
            ext = Path(filename).suffix.lower()
            if ext not in SCAN_EXTENSIONS:
                continue
            file_count += 1
            counts[ext] += 1
            if len(samples) < 40:
                samples.append(str(Path(dirpath, filename)))

    summary["file_count"] = file_count
    summary["extension_counts"] = dict(sorted(counts.items()))
    summary["sample_files"] = samples
    return summary


def scan_llamacpp_models(root: Path) -> dict[str, object]:
    llamacpp_root = root / "llamacpp_models"
    summary: dict[str, object] = {
        "exists": llamacpp_root.exists(),
        "path": str(llamacpp_root),
        "gguf_count": 0,
        "gguf_files": [],
    }
    if not llamacpp_root.exists():
        return summary

    gguf_files = sorted(
        [
            path.name
            for path in llamacpp_root.rglob("*.gguf")
            if all(part not in {".git", ".cache", ".venv", "__pycache__"} for part in path.parts)
        ]
    )
    summary["gguf_count"] = len(gguf_files)
    summary["gguf_files"] = gguf_files[:80]
    return summary


def main() -> None:
    output = {
        "cpu": get_cpu(),
        "memory": get_ram_gib(),
        "gpus": get_gpu(),
        "storage": get_storage(MODEL_ROOT if MODEL_ROOT.exists() else MODEL_ROOT.parent),
        "models": scan_models(MODEL_ROOT),
        "llamacpp_models": scan_llamacpp_models(MODEL_ROOT),
    }
    print(json.dumps(output, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
