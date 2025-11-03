Start-Sleep -Seconds 1
try {
  $r = Invoke-WebRequest -Uri 'http://localhost:8000' -UseBasicParsing -TimeoutSec 5
  Write-Output ("STATUS:" + $r.StatusCode)
  $content = $r.Content
  if ($content.Length -gt 200) { $content = $content.Substring(0,200) + '...' }
  Write-Output '---PAGE-HEAD---'
  Write-Output $content
} catch {
  Write-Output ('REQUEST-FAILED: ' + $_.Exception.Message)
  exit 1
}
