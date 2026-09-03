#!/usr/bin/env bash
set -euo pipefail

repo_root="${CLOUDFLARE_PLATFORM_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
worker_dir="$repo_root/shared/video-worker"
worker_url="https://blackhole-video-worker.cryptocapitalgroupfl.workers.dev/health"

log() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

resolve_linux_tool() {
  local tool="$1"
  local tool_path
  tool_path="$(command -v "$tool" 2>/dev/null || true)"
  case "$tool_path" in
    ""|/mnt/*|*.cmd|*.exe) return 1 ;;
    *) printf '%s\n' "$tool_path" ;;
  esac
}

log "Starting Linux relay preflight"
printf 'Repository: %s\n' "$repo_root"
printf 'Checkout already verified by Windows Git: %s\n' "${CLOUDFLARE_PLATFORM_CHECKOUT_VERIFIED:-0}"

npm_bin="$(resolve_linux_tool npm || true)"
if [[ -z "$npm_bin" ]]; then
  log "Loading Linux Node through NVM"
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
    hash -r
  fi
  npm_bin="$(resolve_linux_tool npm || true)"
fi
[[ -n "$npm_bin" ]] || fail "Linux npm not found; refusing to use the Windows toolchain."
printf 'Linux npm: %s\n' "$npm_bin"

curl_bin="$(resolve_linux_tool curl || true)"
[[ -n "$curl_bin" ]] || fail "Linux curl not found."
printf 'Linux curl: %s\n' "$curl_bin"

if [[ "${CLOUDFLARE_PLATFORM_CHECKOUT_VERIFIED:-0}" != "1" ]]; then
  log "Validating the checkout with Linux Git"
  current_branch="$(timeout 2m git -C "$repo_root" branch --show-current)" \
    || fail "Linux Git branch inspection failed or exceeded 2 minutes."
  [[ "$current_branch" == "main" ]] \
    || fail "Shared broker deployment requires main; observed branch=$current_branch."
  status_output="$(timeout 2m git -C "$repo_root" status --porcelain)" \
    || fail "Linux Git status inspection failed or exceeded 2 minutes."
  if [[ -n "$status_output" ]]; then
    git -C "$repo_root" status --short
    fail "cloudflare-platform checkout has local changes; refusing production deployment."
  fi
else
  printf 'Skipping duplicate Linux Git scan of the Windows-mounted checkout.\n'
fi

cd "$repo_root"

# Wrangler must never stop at a hidden dashboard/config confirmation when this
# runner is invoked through PowerShell -> WSL. The committed config is the
# authority for non-secret relay settings; Cloudflare preserves existing secrets.
export CI=true
export WRANGLER_SEND_METRICS=false

log "Installing the relay's dependencies only"
timeout 10m "$npm_bin" install   --prefix "$worker_dir"   --no-package-lock   --no-audit   --no-fund   || fail "Relay dependency installation failed or exceeded 10 minutes."

log "Testing the relay"
timeout 5m "$npm_bin" test --prefix "$worker_dir"   || fail "Relay tests failed or exceeded 5 minutes."

log "Publishing blackhole-video-worker non-interactively"
timeout 15m "$npm_bin" run deploy:video:store   || fail "Wrangler deployment failed or exceeded 15 minutes."

log "Verifying the live relay"
health_json=""
for attempt in 1 2 3 4 5 6; do
  health_json="$("$curl_bin" --fail --silent --show-error --max-time 20 "$worker_url" || true)"
  if [[ -n "$health_json" ]] && node -e '
    const health = JSON.parse(process.argv[1]);
    if (
      health.ok !== true
      || health.service !== "blackhole-video-worker"
      || health.livekitConfigured !== true
      || health.agentName !== "blackhole-avatar"
    ) process.exit(1);
  ' "$health_json"; then
    printf '%s\n' "$health_json"
    echo "[READY] blackhole-video-worker is live as the shared LiveKit relay."
    exit 0
  fi
  printf 'Relay readiness attempt %s/6 has not passed yet.\n' "$attempt"
  sleep 5
done

fail "Relay deployed, but its public health contract did not become ready: ${health_json:-no response}"
