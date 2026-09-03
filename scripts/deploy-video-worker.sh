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
current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "main" ]]; then
  echo "ERROR: Shared broker deployment requires main; observed branch=$current_branch." >&2
  exit 2
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: cloudflare-platform checkout has local changes; refusing production deployment." >&2
  git status --short
  exit 2
fi

"$npm_bin" ci
"$npm_bin" install --prefix shared/video-worker --no-package-lock
"$npm_bin" test --prefix shared/video-worker
"$npm_bin" run deploy:video:store

echo "[READY] blackhole-video-worker deployed with centralized tenant capability bindings."
