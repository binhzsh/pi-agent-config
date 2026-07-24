#!/usr/bin/env bash
set -u

section() {
  printf '\n### %s ###\n' "$1"
}

safe_run() {
  local label="$1"
  shift
  section "$label"
  if command -v "$1" >/dev/null 2>&1; then
    "$@" 2>&1 || true
  else
    printf 'missing-command: %s\n' "$1"
  fi
}

section "timestamp"
date -Is 2>/dev/null || date

section "os-release"
sed -n '1,20p' /etc/os-release 2>/dev/null || true

safe_run "kernel" uname -a
safe_run "uptime" uptime
safe_run "disk-usage" df -h
safe_run "memory" free -h
safe_run "failed-units" systemctl --failed --no-pager --no-legend
safe_run "listening-sockets" ss -ltnup
safe_run "ufw-status" ufw status verbose
safe_run "upgradable-packages" apt list --upgradable
safe_run "unattended-upgrades" unattended-upgrade --dry-run --debug

section "sshd-config"
if [ -f /etc/ssh/sshd_config ]; then
  grep -E '^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication|ChallengeResponseAuthentication|KbdInteractiveAuthentication|X11Forwarding|AllowUsers|AllowGroups|MaxAuthTries|LoginGraceTime|ClientAliveInterval|ClientAliveCountMax)' /etc/ssh/sshd_config 2>/dev/null || true
else
  printf 'missing-file: /etc/ssh/sshd_config\n'
fi

section "journal-errors"
if command -v journalctl >/dev/null 2>&1; then
  journalctl -p 3 -xb --no-pager -n 200 2>&1 || true
else
  printf 'missing-command: journalctl\n'
fi

section "docker-ps"
if command -v docker >/dev/null 2>&1; then
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>&1 || true
else
  printf 'missing-command: docker\n'
fi

section "docker-socket"
if [ -S /var/run/docker.sock ]; then
  ls -l /var/run/docker.sock 2>&1 || true
else
  printf 'missing-socket: /var/run/docker.sock\n'
fi

section "world-writable-etc-var-www"
find /etc /var/www -xdev -type f -perm -0002 2>/dev/null | sed -n '1,200p'
