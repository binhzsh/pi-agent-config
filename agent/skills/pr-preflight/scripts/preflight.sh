#!/usr/bin/env bash
set -u

log() {
  printf '[preflight] %s\n' "$*"
}

run_step() {
  local name="$1"
  shift
  log "RUN  $name"
  if "$@"; then
    log "PASS $name"
    return 0
  fi
  log "FAIL $name"
  return 1
}

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

has_npm_script() {
  local script_name="$1"
  [ -f package.json ] || return 1
  node -e "const p=require('./package.json'); process.exit((p.scripts && p.scripts['$script_name'])?0:1)" >/dev/null 2>&1
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "Not inside a git repository"
  exit 2
fi

FAIL=0

log "Git status snapshot"
git status --short

if [ -f package.json ] && have_cmd node; then
  if has_npm_script lint && have_cmd npm; then run_step "npm lint" npm run -s lint || FAIL=1; fi
  if has_npm_script typecheck && have_cmd npm; then run_step "npm typecheck" npm run -s typecheck || FAIL=1; fi
  if has_npm_script test && have_cmd npm; then run_step "npm test" npm test --silent || FAIL=1; fi
  if has_npm_script build && have_cmd npm; then run_step "npm build" npm run -s build || FAIL=1; fi
fi

if [ -f pyproject.toml ] || [ -f requirements.txt ] || [ -f requirements-dev.txt ]; then
  if have_cmd pytest; then run_step "pytest" pytest -q || FAIL=1; else log "SKIP pytest (not installed)"; fi
fi

if [ -f go.mod ] && have_cmd go; then
  run_step "go test" go test ./... || FAIL=1
fi

if [ -f Cargo.toml ] && have_cmd cargo; then
  run_step "cargo test" cargo test --workspace --all-targets || FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  log "Preflight result: FAIL"
  exit 1
fi

log "Preflight result: PASS"
exit 0
