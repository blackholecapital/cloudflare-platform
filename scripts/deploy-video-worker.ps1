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
# Windows Git has already validated and updated the checkout. Tell the Linux
# runner to skip the duplicate DrvFS Git scan, which can block for minutes with
# no output on a Windows-mounted repository.
$linuxCommand = "set -o pipefail`nsed 's/\r$//' '$wslScript' | timeout --foreground 35m bash"
$encodedCommand = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($linuxCommand))
$wslCommand = "echo $encodedCommand|base64 -d|bash"

Write-Host ""
Write-Host "==> Deploying only the shared blackhole-video-worker"
Write-Host "    WSL distribution: $Distribution"
Write-Host "    Linux user: $LinuxUser"
Write-Host "    Repository: $wslRoot"
Write-Host "    A hard 35-minute Linux-side timeout applies to the complete relay run."
& wsl.exe -d $Distribution -u $LinuxUser -- env "CLOUDFLARE_PLATFORM_DIR=$wslRoot" "CLOUDFLARE_PLATFORM_CHECKOUT_VERIFIED=1" bash -c $wslCommand
Assert-ExitCode "Shared video broker deployment failed."

Write-Host "[READY] Shared video broker deployed from its owning repository."
