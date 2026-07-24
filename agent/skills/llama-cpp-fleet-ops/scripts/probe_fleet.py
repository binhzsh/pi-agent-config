#!/usr/bin/env python3
import argparse
import json
import sys
import time
import urllib.error
import urllib.request


def norm(url: str) -> str:
    u = url.rstrip("/")
    if not u.endswith("/v1"):
        u += "/v1"
    return u


def get_models(base: str, timeout: float):
    target = base + "/models"
    t0 = time.perf_counter()
    req = urllib.request.Request(target, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", errors="replace")
        data = json.loads(body)
    ms = (time.perf_counter() - t0) * 1000
    ids = [m.get("id") for m in data.get("data", []) if isinstance(m, dict) and isinstance(m.get("id"), str)]
    return int(ms), ids


def main():
    p = argparse.ArgumentParser(description="Probe llama.cpp OpenAI-compatible endpoint fleet from OpenCode config")
    p.add_argument("config")
    p.add_argument("--timeout", type=float, default=4.0)
    args = p.parse_args()

    with open(args.config, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    providers = cfg.get("provider", {})
    if not isinstance(providers, dict) or not providers:
        print("No providers found")
        return 1

    total = 0
    fail = 0
    for pid, pcfg in providers.items():
        if not isinstance(pcfg, dict):
            continue
        total += 1
        base = (((pcfg.get("options") or {}).get("baseURL")) if isinstance(pcfg.get("options"), dict) else None)
        models = pcfg.get("models") if isinstance(pcfg.get("models"), dict) else {}
        expected = []
        for _, mcfg in models.items():
            if isinstance(mcfg, dict) and isinstance(mcfg.get("name"), str):
                expected.append(mcfg["name"])

        print(f"\n[{pid}]")
        if not isinstance(base, str) or not base:
            fail += 1
            print("  ERROR missing baseURL")
            continue

        try:
            latency_ms, served = get_models(norm(base), args.timeout)
            missing = [m for m in expected if m not in served]
            print(f"  latency_ms: {latency_ms}")
            print(f"  served: {', '.join(served) if served else '(none)'}")
            if missing:
                fail += 1
                print(f"  ERROR missing configured models: {', '.join(missing)}")
            else:
                print("  OK")
        except urllib.error.HTTPError as e:
            fail += 1
            print(f"  ERROR http {e.code}")
        except urllib.error.URLError as e:
            fail += 1
            print(f"  ERROR connect {e.reason}")
        except Exception as e:
            fail += 1
            print(f"  ERROR {type(e).__name__}: {e}")

    print(f"\nSummary: providers={total} failures={fail}")
    return 2 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
