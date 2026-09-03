[CmdletBinding()]
param(
  [string]$Distribution = "AI-Linux",
  [string]$LinuxUser = "daddy"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Assert-ExitCode([string]$Message) {
  if ($LASTEXITCODE -ne 0) { throw $Message }
}

if (-not (Test-Path (Join-Path $repoRoot ".git"))) {
  throw "Cloudflare platform checkout not found: $repoRoot"
}

$dirty = @(& git.exe -C $repoRoot status --porcelain)
Assert-ExitCode "Could not inspect the cloudflare-platform checkout."
if ($dirty.Count -gt 0) {
  throw "cloudflare-platform checkout has local changes. Commit or stash them before production deployment."
}

Write-Host ""
Write-Host "==> Updating the shared broker owner checkout with Windows Git"
& git.exe -C $repoRoot switch main
Assert-ExitCode "Could not switch cloudflare-platform to main."
& git.exe -C $repoRoot pull --ff-only origin main
Assert-ExitCode "Could not update cloudflare-platform main."

if ($repoRoot -notmatch "^([A-Za-z]):\\(.*)$") {
  throw "cloudflare-platform must be checked out on a Windows drive, for example F:\\ai\\cloudflare-platform."
}
$drive = $Matches[1].ToLowerInvariant()
$relative = $Matches[2].Replace("\", "/")
$wslRoot = "/mnt/$drive/$relative"
$wslScript = "$wslRoot/scripts/deploy-video-worker.sh"
# Pass the script path as argv[1]. Never interpolate a Windows-derived path
# into Bash source; apostrophes and other shell characters must remain data.
$wslCommand = 'set -o pipefail; sed ''s/\r$//'' "$1" | bash'

Write-Host ""
Write-Host "==> Deploying only the shared blackhole-video-worker"
& wsl.exe -d $Distribution -u $LinuxUser -- env "CLOUDFLARE_PLATFORM_DIR=$wslRoot" bash -c $wslCommand bash $wslScript
Assert-ExitCode "Shared video broker deployment failed."

Write-Host "[READY] Shared video broker deployed from its owning repository."
