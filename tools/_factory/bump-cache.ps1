# bump-cache.ps1
# Adds/updates ?v=YYYYMMDDHHMMSS on common assets in ALL .html files

$root = (Get-Location).Path
$v = Get-Date -Format "yyyyMMddHHmmss"

$targets = @(
  "/assets/style.css",
  "/assets/app.js",
  "/assets/pro.js",
  "/assets/unlock.js"
)

Get-ChildItem -Path $root -Recurse -Filter *.html | ForEach-Object {
  $path = $_.FullName
  $html = Get-Content -Raw -LiteralPath $path

  foreach ($t in $targets) {
    # Replace existing ?v=... or add if missing
    $pattern = [regex]::Escape($t) + "(\?v=\d+)?"
    $html = [regex]::Replace($html, $pattern, "$t?v=$v")
  }

  Set-Content -LiteralPath $path -Value $html -Encoding UTF8
}

Write-Host "Cache bump applied. v=$v"
