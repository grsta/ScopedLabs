param(
  [Parameter(Mandatory=$true)]
  [ValidateSet(
    "access-control",
    "compute",
    "infrastructure",
    "network",
    "performance",
    "physical-security",
    "power",
    "thermal",
    "video-storage",
    "wireless"
  )]
  [string]$Category
)

# ===== CONFIG =====
# Slugs = folder names inside tools/<category>/<slug>/
$PRO = @{
  "power" = @(
    "worst-case-runtime",
    "scenario-comparator",
    "load-growth",
    "inverter-efficiency"
  )
  "network" = @(
    "oversubscription"
  )
  "video-storage" = @(
    "raid-impact"
  )
  "thermal" = @()
  "performance" = @()
  "access-control" = @()
  "compute" = @()
  "infrastructure" = @()
  "physical-security" = @()
  "wireless" = @()
}

# Optional: override display titles
$TITLE_OVERRIDES = @{
  # "ups-runtime" = "UPS Runtime"
}

# ===== PATHS =====
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")  # tools/_factory -> tools -> root
$toolsDir = Join-Path $root "tools"
$catDir = Join-Path $toolsDir $Category

if (!(Test-Path $catDir)) {
  Write-Host "ERROR: Category folder not found: $catDir" -ForegroundColor Red
  exit 1
}

function Titleize-Slug([string]$slug) {
  if ($TITLE_OVERRIDES.ContainsKey($slug)) { return $TITLE_OVERRIDES[$slug] }

  $parts = $slug -split "-"
  $t = ($parts | ForEach-Object {
    if ($_ -match "^(ups|va|poe|ptz|ip|dhcp|dns)$") { $_.ToUpper() }
    else { $_.Substring(0,1).ToUpper() + $_.Substring(1) }
  }) -join " "
  return $t
}

function Is-ToolFolder([string]$path) {
  return (Test-Path (Join-Path $path "index.html"))
}

# ===== DISCOVER TOOLS =====
$folders = Get-ChildItem -Path $catDir -Directory | Where-Object {
  $_.Name -notmatch "^_" -and (Is-ToolFolder $_.FullName)
} | Sort-Object Name

if ($folders.Count -eq 0) {
  Write-Host "No tool folders found in: $catDir" -ForegroundColor Yellow
  exit 0
}

$proSlugs = @()
if ($PRO.ContainsKey($Category)) { $proSlugs = $PRO[$Category] }

# ===== GENERATE ROWS =====
$freeLines = @()
$proLines  = @()

foreach ($f in $folders) {
  $slug = $f.Name
  $title = Titleize-Slug $slug
  $href = "/tools/$Category/$slug/"
  $isPro = $proSlugs -contains $slug

  if ($isPro) {
    $proLines += "<div class=""tool-row pro"">"
    $proLines += "  <div class=""left"">"
    $proLines += "    <span class=""lock"">LOCK</span>"
    $proLines += "    <h3>$title</h3>"
    $proLines += "    <span class=""pill"">PRO</span>"
    $proLines += "  </div>"
    $proLines += "  <a class=""btn btn-primary"" href=""/upgrade/"">View Pro Features</a>"
    $proLines += "</div>"
    $proLines += ""
  } else {
    $freeLines += "<div class=""tool-row"">"
    $freeLines += "  <div class=""left"">"
    $freeLines += "    <h3>$title</h3>"
    $freeLines += "    <span class=""pill free"">FREE</span>"
    $freeLines += "  </div>"
    $freeLines += "  <a class=""btn"" href=""$href"">Launch Tool</a>"
    $freeLines += "</div>"
    $freeLines += ""
  }
}

# ===== WRITE FILES =====
$outFree = Join-Path $catDir "_rows_free.html"
$outPro  = Join-Path $catDir "_rows_pro.html"

$freeLines -join "`r`n" | Set-Content -Path $outFree -Encoding UTF8
$proLines  -join "`r`n" | Set-Content -Path $outPro  -Encoding UTF8

Write-Host ""
Write-Host "DONE: Generated rows files" -ForegroundColor Green
Write-Host "  FREE: $outFree"
Write-Host "  PRO : $outPro"
Write-Host ""
Write-Host "Paste FREE rows into the top list, and PRO rows into the Advanced/Other section."
Write-Host ""
