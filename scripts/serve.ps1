param(
  [string]$Folder = ".",
  [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'

# Resolve full path and normalize
$Folder = (Resolve-Path -Path $Folder).Path
$baseDir = [System.IO.Path]::GetFullPath($Folder)

function Get-ContentType([string]$path) {
  $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
  switch ($ext) {
    '.html' { 'text/html; charset=utf-8' }
    '.htm'  { 'text/html; charset=utf-8' }
    '.css'  { 'text/css; charset=utf-8' }
    '.js'   { 'application/javascript; charset=utf-8' }
    '.json' { 'application/json; charset=utf-8' }
    '.png'  { 'image/png' }
    '.jpg'  { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.gif'  { 'image/gif' }
    '.svg'  { 'image/svg+xml' }
    '.webp' { 'image/webp' }
    '.ico'  { 'image/x-icon' }
    '.woff' { 'font/woff' }
    '.woff2'{ 'font/woff2' }
    Default { 'application/octet-stream' }
  }
}

# Start TCP listener on localhost
$ip = [System.Net.IPAddress]::Loopback
$listener = [System.Net.Sockets.TcpListener]::new($ip, $Port)
try {
  $listener.Start()
  Write-Host "Static server running at http://localhost:$Port/ serving '$baseDir' (Ctrl+C to stop)" -ForegroundColor Green
} catch {
  Write-Error "Failed to start server on port $Port. Port in use or permissions issue? $_"
  exit 1
}

function Send-Response($stream, [int]$statusCode, [string]$statusText, [byte[]]$body, [string]$contentType) {
  $writer = New-Object System.IO.StreamWriter($stream, ([System.Text.Encoding]::ASCII), 1024, $true)
  $writer.NewLine = "`r`n"
  $writer.Write("HTTP/1.1 {0} {1}\r\n" -f $statusCode, $statusText)
  if ($contentType) { $writer.Write("Content-Type: {0}\r\n" -f $contentType) }
  if ($body) { $writer.Write("Content-Length: {0}\r\n" -f $body.Length) } else { $writer.Write("Content-Length: 0\r\n") }
  $writer.Write("Connection: close\r\n\r\n")
  $writer.Flush()
  if ($body) { $stream.Write($body, 0, $body.Length) }
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    Start-Job -ArgumentList $client, $baseDir -ScriptBlock {
      param($client, $baseDir)
      try {
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, ([System.Text.Encoding]::ASCII), $false, 1024, $true)
        $requestLine = $reader.ReadLine()
        if (-not $requestLine) { return }
        # Example: GET /path HTTP/1.1
        $parts = $requestLine.Split(' ')
        if ($parts.Length -lt 2) { return }
        $method = $parts[0]
        $rawPath = $parts[1]
        # Consume remaining headers (until blank line)
        while ($true) {
          $line = $reader.ReadLine()
          if ($null -eq $line -or $line -eq '') { break }
        }
        if ($method -ne 'GET' -and $method -ne 'HEAD') {
          $msg = [System.Text.Encoding]::UTF8.GetBytes('Method Not Allowed')
          Send-Response -stream $stream -statusCode 405 -statusText 'Method Not Allowed' -body $msg -contentType 'text/plain; charset=utf-8'
          return
        }
        $relPath = [System.Uri]::UnescapeDataString($rawPath.TrimStart('/'))
        if ([string]::IsNullOrWhiteSpace($relPath)) { $relPath = 'index.html' }
        $unsafePath = [System.IO.Path]::Combine($baseDir, $relPath)
        $fullPath = [System.IO.Path]::GetFullPath($unsafePath)
        # Prevent path traversal
        if (-not $fullPath.StartsWith($baseDir, [System.StringComparison]::OrdinalIgnoreCase)) {
          $msg = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
          Send-Response -stream $stream -statusCode 403 -statusText 'Forbidden' -body $msg -contentType 'text/plain; charset=utf-8'
          return
        }
        if (Test-Path $fullPath -PathType Container) {
          $fullPath = Join-Path $fullPath 'index.html'
        }
        if (Test-Path $fullPath -PathType Leaf) {
          try {
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $ctype = Get-ContentType -path $fullPath
            if ($method -eq 'HEAD') { $bytes = $null }
            Send-Response -stream $stream -statusCode 200 -statusText 'OK' -body $bytes -contentType $ctype
          } catch {
            $msg = [System.Text.Encoding]::UTF8.GetBytes('Internal Server Error')
            Send-Response -stream $stream -statusCode 500 -statusText 'Internal Server Error' -body $msg -contentType 'text/plain; charset=utf-8'
          }
        } else {
          $msg = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
          Send-Response -stream $stream -statusCode 404 -statusText 'Not Found' -body $msg -contentType 'text/plain; charset=utf-8'
        }
      } finally {
        try { $stream.Dispose() } catch {}
        $client.Close()
      }
    } | Out-Null
  }
} finally {
  $listener.Stop()
}