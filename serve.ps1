# Server statico minimo per provare QualityTime in locale.
# Uso:  powershell -ExecutionPolicy Bypass -File serve.ps1
# Poi apri:  http://localhost:8080
param([int]$Port = 8080)

$root = $PSScriptRoot
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "QualityTime in ascolto su http://localhost:$Port/  (CTRL+C per fermare)"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".csv"  = "text/csv; charset=utf-8"
  ".webmanifest" = "application/manifest+json"
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
    if ([string]::IsNullOrEmpty($path)) { $path = "index.html" }
    $file = Join-Path $root $path
    if (Test-Path $file -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $ctype = $mime[$ext]; if (-not $ctype) { $ctype = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ctx.Response.ContentType = $ctype
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - $path")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.Close()
  }
} finally {
  $listener.Stop()
}
