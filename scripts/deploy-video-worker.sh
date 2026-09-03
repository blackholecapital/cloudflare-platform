#!/usr/bin/env bash
set -euo pipefail

repo_root="${CLOUDFLARE_PLATFORM_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

resolve_linux_tool() {
  local tool="$1"
  local tool_path
  tool_path="$(command -v "$tool" 2>/dev/null || true)"
  case "$tool_path" in
    ""|/mnt/*|*.cmd|*.exe) return 1 ;;
    *) printf '%s\n' "$tool_path" ;;
  esac
}

npm_bin="$(resolve_linux_tool npm || true)"
if [[ -z "$npm_bin" ]]; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
    hash -r
  fi
  npm_bin="$(resolve_linux_tool npm || true)"
fi
if [[ -z "$npm_bin" ]]; then
  echo "ERROR: Linux npm not found; refusing to use the Windows toolchain." >&2
  exit 127
fi

cd "$repo_root"
"$npm_bin" install
"$npm_bin" install --prefix shared/video-worker
"$npm_bin" run deploy:video:store

echo "[READY] blackhole-video-worker deployed with centralized tenant capability bindings."
