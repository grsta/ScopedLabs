# ScopedLabs — New Tool Factory (PowerShell)
# Run from the /tools directory.
#
# Creates a new tool folder and seeds the 4 required files:
#   /tools/<category>/<tool-slug>/
#     index.html
#     script.js
#     README.md
#     access.json
#
# Example:
#   .\new-tool.ps1 -Category power -Slug inverter-efficiency -Title "Inverter Efficiency" -Description "Estimate inverter losses and delivered watts."
#
# Notes:
# - Safe by default: will NOT overwrite existing files.
# - Uses absolute /assets paths (works from nested tool routes).
# - Keep slugs lowercase with hyphens.

param(
  [Parameter(Mandatory=$true)][string]$Category,
  [Parameter(Mandatory=$true)][string]$Slug,
  [Parameter(Mandatory=$true)][string]$Title,
  [Parameter(Mandatory=$true)][string]$Description,
  [string[]]$Tags = @(),
  [ValidateSet("Free","Pro","Advanced")][string]$Access = "Free",
  [string]$Version = "0.1.0",
  [string]$CssVersion = "1",
  [switch]$ForceOverwrite
)

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path $Path)) { New-Item -ItemType Directory -Path $Path | Out-Null }
}

function Write-FileSafe {
  param(
    [string]$Path,
    [string]$Content,
    [switch]$Force
  )
  if ((Test-Path $Path) -and (-not $Force)) {
    Write-Host "Exists  $Path (skipped)"
    return
  }
  $Content | Out-File -FilePath $Path -Encoding UTF8
  Write-Host "Wrote   $Path"
}

function Category-DisplayName {
  param([string]$cat)
  switch ($cat.ToLower()) {
    "power" { return "Power & Runtime" }
    "network" { return "Network" }
    "video-storage" { return "Video & Storage" }
    "thermal" { return "Thermal" }
    "performance" { return "Performance" }
    default { return ($cat.Substring(0,1).ToUpper() + $cat.Substring(1)) }
  }
}

# Basic slug validation
if ($Slug -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') {
  Write-Error "Slug must be lowercase with hyphens only (example: ups-runtime-estimator)."
  exit 1
}

$toolDir = Join-Path (Join-Path "." $Category) $Slug
Ensure-Dir $toolDir

$categoryLabel = Category-DisplayName $Category
$created = (Get-Date).ToString("s")

# Seed index.html (ScopedLabs tool template)
$indexHtml = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>$Title • ScopedLabs</title>

  <!-- IMPORTANT: absolute paths so nested tools always load the same CSS -->
  <link rel="stylesheet" href="/assets/style.css?v=$CssVersion" />
</head>

<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/">
        <span class="brand-dot"></span>
        <span class="brand-text">ScopedLabs</span>
      </a>

      <nav class="site-nav" aria-label="Primary">
        <a class="nav-pill" href="/">Home</a>
        <a class="nav-pill" href="/tools/">Tools</a>
        <a class="nav-pill" href="/about/">About</a>
      </nav>
    </div>
  </header>

  <main class="container page">
    <div class="crumbs">
      <a href="/tools/">Tools</a>
      <span class="sep">/</span>
      <a href="/tools/$Category/">$categoryLabel</a>
      <span class="sep">/</span>
      <span>$Title</span>
    </div>

    <h1>$Title</h1>
    <p class="subhead">$Description</p>

    <section class="card tool-card">
      <h2>Inputs</h2>

      <div class="form-grid">
        <label class="field">
          <span class="label">Input A</span>
          <input id="a" type="number" min="0" step="1" value="100" />
        </label>

        <label class="field">
          <span class="label">Input B</span>
          <input id="b" type="number" min="0" step="1" value="50" />
        </label>
      </div>

      <div class="actions">
        <button id="calc" class="btn btn-primary">Calculate</button>
        <button id="reset" class="btn">Reset</button>
      </div>
    </section>

    <section class="card tool-card">
      <h2>Results</h2>
      <div id="results" class="results">
        <div class="muted">Enter values and press Calculate.</div>
      </div>
    </section>
  </main>

  <script src="/assets/app.js?v=1"></script>
  <script src="./script.js"></script>
</body>
</html>
"@

# Seed script.js (safe starter)
$scriptJs = @"
(function () {
  const \$ = (id) => document.getElementById(id);

  function num(id) {
    const v = parseFloat(\$(id).value);
    return Number.isFinite(v) ? v : 0;
  }

  function render(rows) {
    const el = \$("results");
    el.innerHTML = "";
    rows.forEach(r => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `<span class="result-label">\${r.label}</span><span class="result-value">\${r.value}</span>`;
      el.appendChild(div);
    });
  }

  function calc() {
    const a = num("a");
    const b = num("b");

    // TODO: replace this placeholder math with your real logic
    const sum = a + b;

    render([
      { label: "A + B", value: sum.toFixed(2) }
    ]);
  }

  function reset() {
    \$("a").value = 100;
    \$("b").value = 50;
    \$("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  \$("calc").addEventListener("click", calc);
  \$("reset").addEventListener("click", reset);
})();
"@

# Seed README.md
$readme = @"
# $Title

$Description

## Status
- Page created
- Inputs wired
- Math logic: TODO
- Results displaying

## Files
- \`index.html\` — tool UI (ScopedLabs template)
- \`script.js\` — calculation logic + events
- \`access.json\` — tool metadata + access tier

## Notes
- Run from project root: visit \`/tools/$Category/$Slug/\`
"@

# Seed access.json
# (Write as pretty JSON without needing external modules)
$tagsJson = ""
if ($Tags.Count -gt 0) {
  $escaped = $Tags | ForEach-Object { '"' + ($_ -replace '"','\"') + '"' }
  $tagsJson = "  ""tags"": [ " + ($escaped -join ", ") + " ],`n"
} else {
  $tagsJson = "  ""tags"": [],`n"
}

$accessJson = @"
{
  "slug": "$Slug",
  "title": "$Title",
  "category": "$Category",
  "access": "$Access",
$tagsJson  "version": "$Version",
  "created": "$created"
}
"@

Write-FileSafe -Path (Join-Path $toolDir "index.html") -Content $indexHtml -Force:$ForceOverwrite
Write-FileSafe -Path (Join-Path $toolDir "script.js") -Content $scriptJs -Force:$ForceOverwrite
Write-FileSafe -Path (Join-Path $toolDir "README.md") -Content $readme -Force:$ForceOverwrite
Write-FileSafe -Path (Join-Path $toolDir "access.json") -Content $accessJson -Force:$ForceOverwrite

Write-Host ""
Write-Host "Done. New tool seeded at: $toolDir"
