# ScopedLabs Tool Placeholder Page Builder
# Run from /tools directory.
# Safe behavior: creates index.html only if missing (does NOT overwrite).

function TitleCase-FromSlug {
  param([string]$slug)

  if ([string]::IsNullOrWhiteSpace($slug)) { return $slug }

  $parts = $slug -split '-'
  $words = @()

  foreach ($p in $parts) {
    if ([string]::IsNullOrWhiteSpace($p)) { continue }

    switch ($p.ToLower()) {
      "ups" { $words += "UPS"; continue }
      "poe" { $words += "PoE"; continue }
      "mtu" { $words += "MTU"; continue }
      "raid" { $words += "RAID"; continue }
    }

    $words += ($p.Substring(0,1).ToUpper() + $p.Substring(1).ToLower())
  }

  return ($words -join " ")
}

function CategoryLabel {
  param([string]$categorySlug)

  switch ($categorySlug.ToLower()) {
    "power" { return "Power & Runtime" }
    "network" { return "Network & Throughput" }
    "video-storage" { return "Video & Storage" }
    "thermal" { return "Thermal & Environment" }
    "performance" { return "Performance & Risk" }
    default { return (TitleCase-FromSlug $categorySlug) }
  }
}

function CategoryPath {
  param([string]$categorySlug)
  return "/tools/$categorySlug/"
}

$root = Get-Location
Write-Host "ScopedLabs Placeholder Builder"
Write-Host "Working directory: $root`n"

# Find tool folders: /tools/<category>/<tool>/
$toolDirs = Get-ChildItem -Directory -Path . | ForEach-Object {
  $cat = $_.Name
  Get-ChildItem -Directory -Path $_.FullName | ForEach-Object {
    [PSCustomObject]@{
      CategorySlug = $cat
      ToolSlug     = $_.Name
      FullPath     = $_.FullName
    }
  }
}

if (-not $toolDirs -or $toolDirs.Count -eq 0) {
  Write-Host "No tool folders found. Make sure you're running this from /tools."
  exit 1
}

$created = 0
$skipped = 0

foreach ($t in $toolDirs) {
  $toolName = TitleCase-FromSlug $t.ToolSlug
  $catLabel = CategoryLabel $t.CategorySlug
  $catUrl   = CategoryPath $t.CategorySlug

  $indexPath = Join-Path $t.FullPath "index.html"
  if (Test-Path $indexPath) {
    Write-Host "Exists  $($t.CategorySlug)\$($t.ToolSlug)\index.html"
    $skipped++
    continue
  }

  $html = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <title>$toolName • ScopedLabs</title>
  <meta name="description" content="$toolName — $catLabel tool (placeholder)." />

  <link rel="stylesheet" href="/assets/style.css?v=tool-000" />
  <script src="/assets/app.js?v=tool-000" defer></script>
</head>

<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="ScopedLabs Home">
        <span class="brand-dot" aria-hidden="true"></span>
        <span class="brand-name">ScopedLabs</span>
      </a>

      <nav class="nav">
        <a class="nav-link" href="/tools/">Tools</a>
        <a class="nav-link" href="$catUrl">$catLabel</a>
        <a class="nav-link" href="/upgrade/">Upgrade</a>
      </nav>
    </div>
  </header>

  <main class="section">
    <div class="container">
      <div class="section-head">
        <div class="pill">🚧 Under Construction</div>
        <h1 class="section-title">$toolName</h1>
        <p class="section-subtitle">$catLabel • Placeholder page. This tool is scoped and reserved — implementation coming soon.</p>
      </div>

      <div class="card card-wide">
        <div class="card-title">What to expect</div>
        <div class="card-text">
          This tool will follow ScopedLabs standards:
          <br/>• Transparent assumptions
          <br/>• Defensible outputs
          <br/>• No sales bias
        </div>

        <div style="height:14px"></div>

        <div class="hero-actions">
          <a class="btn btn-primary" href="$catUrl">Back to $catLabel</a>
          <a class="btn btn-ghost" href="/tools/">All Categories</a>
        </div>

        <div class="hero-note">Tip: Each tool folder contains a README.md defining scope, inputs/outputs, and future notes.</div>
      </div>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-left">
        <div class="footer-brand">ScopedLabs</div>
        <div class="footer-tagline">Analytical tools for power, systems, and performance.</div>
      </div>
      <div class="footer-links">
        <a href="/tools/">Tools</a>
        <a href="/about/">About</a>
      </div>
    </div>
  </footer>
</body>
</html>
"@

  New-Item -ItemType File -Path $indexPath -Value $html -Force | Out-Null
  Write-Host "Created $($t.CategorySlug)\$($t.ToolSlug)\index.html"
  $created++
}

Write-Host "`nDone."
Write-Host "Created: $created"
Write-Host "Skipped (already existed): $skipped"
