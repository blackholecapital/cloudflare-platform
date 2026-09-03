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
$wslCommand = "set -o pipefail; sed 's/\r$//' '$wslScript' | bash"

Write-Host ""
Write-Host "==> Deploying only the shared blackhole-video-worker"
& wsl.exe -d $Distribution -u $LinuxUser -- env "CLOUDFLARE_PLATFORM_DIR=$wslRoot" bash -c $wslCommand
Assert-ExitCode "Shared video broker deployment failed."

Write-Host "[READY] Shared video broker deployed from its owning repository."
