#!/usr/bin/env python3
import argparse
import json
import sys
import urllib.error
import urllib.request
from urllib.parse import urljoin


def fetch_models(base_url: str, timeout: float):
    target = base_url.rstrip("/") + "/models"
    req = urllib.request.Request(target, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", errors="replace")
        data = json.loads(body)
        ids = []
        for item in data.get("data", []):
            mid = item.get("id")
            if isinstance(mid, str):
                ids.append(mid)
        return resp.status, ids


def normalize_base_url(url: str):
    url = url.rstrip("/")
    if url.endswith("/v1"):
        return url + "/"
    return url + "/v1/"


def main():
    ap = argparse.ArgumentParser(description="Check OpenAI-compatible endpoints declared in OpenCode config")
    ap.add_argument("config", help="Path to config.json")
    ap.add_argument("--timeout", type=float, default=5.0, help="HTTP timeout in seconds (default: 5)")
    args = ap.parse_args()

    with open(args.config, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    providers = cfg.get("provider", {})
    if not isinstance(providers, dict) or not providers:
        print("No providers found in config.")
        return 1

    failures = 0
    for provider_id, provider_cfg in providers.items():
        options = provider_cfg.get("options", {}) if isinstance(provider_cfg, dict) else {}
        base_url = options.get("baseURL") if isinstance(options, dict) else None
        models_cfg = provider_cfg.get("models", {}) if isinstance(provider_cfg, dict) else {}
        expected = []
        if isinstance(models_cfg, dict):
            for model_id, model_cfg in models_cfg.items():
                if isinstance(model_cfg, dict) and isinstance(model_cfg.get("name"), str):
                    expected.append(model_cfg["name"])
                elif isinstance(model_id, str):
                    expected.append(model_id)

        print(f"\n[{provider_id}]")
        if not isinstance(base_url, str) or not base_url.strip():
            print("  ERROR: missing options.baseURL")
            failures += 1
            continue

        probe = normalize_base_url(base_url)
        print(f"  baseURL: {base_url}")
        print(f"  probe:   {urljoin(probe, 'models')}")
        try:
            status, served = fetch_models(probe, args.timeout)
            print(f"  status:  {status}")
            print(f"  served:  {', '.join(served) if served else '(none)'}")

            missing = [m for m in expected if m not in served]
            if missing:
                failures += 1
                print(f"  ERROR: configured models not served: {', '.join(missing)}")
            else:
                print("  OK: configured models are present")
        except urllib.error.HTTPError as e:
            failures += 1
            print(f"  ERROR: HTTP {e.code} from endpoint")
        except urllib.error.URLError as e:
            failures += 1
            print(f"  ERROR: connection failed ({e.reason})")
        except json.JSONDecodeError:
            failures += 1
            print("  ERROR: endpoint response is not JSON")
        except Exception as e:
            failures += 1
            print(f"  ERROR: {type(e).__name__}: {e}")

    print("\nSummary:")
    if failures:
        print(f"  FAIL ({failures} issue group{'s' if failures != 1 else ''})")
        return 2
    print("  PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
