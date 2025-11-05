param(
  [string]$Folder = ".",
  [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'

# Resolve full path and normalize
$Folder = (Resolve-Path -Path $Folder).Path
$baseDir = [System.IO.Path]::GetFullPath($Folder)

# Wrapper serve script: prefer Node.js static server at scripts/server.js
param(
  [string]$Folder = ".",
  [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'

# Resolve full path
$Folder = (Resolve-Path -Path $Folder).Path

function Start-NodeServer {
  $serverScript = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'server.js'
  if (-not (Test-Path $serverScript)) {
    Write-Error "Node server script not found: $serverScript. Expected 'scripts/server.js'."
    exit 1
  }
  # Start node with Folder and Port args
  $args = @($serverScript, '--dir', $Folder, '--port', $Port)
  Write-Host "Starting Node static server: node $($args -join ' ')" -ForegroundColor Green
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'node'
  $psi.Arguments = [string]::Join(' ', $args)
  $psi.WorkingDirectory = Get-Location
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $proc = [System.Diagnostics.Process]::Start($psi)
  $proc | Wait-Process -ErrorAction SilentlyContinue
}

try {
  # Check node availability
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Write-Error "Node.js is not available in PATH. Please install Node.js to use this serve script."
    exit 1
  }
  Start-NodeServer
} catch {
  Write-Error "Failed to start Node server: $_"
  exit 1
}