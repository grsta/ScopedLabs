<#
verify_scopedlabs.ps1

Goal:
- Detect REAL duplicate tools in category pages (duplicate tool "entries"),
  not duplicate hrefs inside the same entry (e.g., row link + launch button).
- Each tool row/card counts as ONE entry even if it contains multiple <a> tags.

What it checks:
1) Missing category index.html in /tools/<category>/index.html (excluding _factory).
2) HERO_DUPLICATED: hero tool href also appears as a separate tool-row entry (configurable).
3) TOOL_DUPLICATED: the same tool href appears in multiple distinct tool-row entries.

Output:
- Writes CSV report to <Root>\verify_report.csv by default
- Prints summary to console

Usage example:
powershell -ExecutionPolicy Bypass -File .\verify_scopedlabs.ps1 -Root "E:\ScopedLabs"
#>

param(
  [Parameter(Mandatory = $false)]
  [string]$Root = (Get-Location).Path,

  [Parameter(Mandatory = $false)]
  [string]$OutCsv = "",

  # If $true, flags when hero tool is also listed in the free/pro rows.
  # If you intentionally allow hero tool to ALSO appear in the list, set to $false.
  [Parameter(Mandatory = $false)]
  [bool]$FlagHeroAlsoInRows = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Normalize-Href([string]$href) {
  if ([string]::IsNullOrWhiteSpace($href)) { return "" }

  $h = $href.Trim()

  # Ignore external links / anchors / javascript
  if ($h.StartsWith("http")) { return "" }
  if ($h.StartsWith("#")) { return "" }
  if ($h.StartsWith("javascript:", [System.StringComparison]::OrdinalIgnoreCase)) { return "" }

  # Strip query/hash
  $h = ($h -split "\?")[0]
  $h = ($h -split "#")[0]

  # Normalize slashes
  $h = $h -replace "\\", "/"
  if (-not $h.StartsWith("/")) { $h = "/" + $h }

  # Ensure trailing slash for tool paths (your site uses /tools/.../ style)
  if ($h.StartsWith("/tools/") -and -not $h.EndsWith("/")) { $h += "/" }

  return $h
}

function Get-FileText([string]$path) {
  # Read as raw; let PowerShell handle UTF-8/ANSI gracefully
  return Get-Content -LiteralPath $path -Raw
}

function Get-CategoryFolders([string]$toolsRoot) {
  Get-ChildItem -LiteralPath $toolsRoot -Directory |
    Where-Object { $_.Name -ne "_factory" } |
    Sort-Object Name
}

function Extract-HeroHref([string]$html) {
  # Try to find a hero section / card first, then pull the first tool href inside it.
  # This is intentionally tolerant because your markup evolved.

  $heroPatterns = @(
    '(?is)<section[^>]*class="[^"]*\btool-hero\b[^"]*"[^>]*>.*?</section>',
    '(?is)<section[^>]*class="[^"]*\bhero\b[^"]*"[^>]*>.*?</section>',
    '(?is)<div[^>]*class="[^"]*\btool-hero\b[^"]*"[^>]*>.*?</div>',
    '(?is)<div[^>]*class="[^"]*\bhero\b[^"]*"[^>]*>.*?</div>'
  )

  foreach ($p in $heroPatterns) {
    $m = [regex]::Match($html, $p)
    if ($m.Success) {
      $block = $m.Value
      $a = [regex]::Match($block, '(?is)<a[^>]*href="([^"]+)"')
      if ($a.Success) {
        return (Normalize-Href $a.Groups[1].Value)
      }
    }
  }

  return ""
}

function Extract-ToolRowHrefs([string]$html) {
  # Extract ONE canonical href per tool "row/card" by:
  # - finding containers with common classes
  # - taking the first tool link in each container
  #
  # This prevents false duplicates from multiple links inside one row.

  $rows = New-Object System.Collections.Generic.List[string]

  $rowPatterns = @(
    # Most common: tool rows
    '(?is)<a[^>]*class="[^"]*\btool-row\b[^"]*"[^>]*>.*?</a>',
    '(?is)<div[^>]*class="[^"]*\btool-row\b[^"]*"[^>]*>.*?</div>',
    # Alternative: tool cards/lists
    '(?is)<div[^>]*class="[^"]*\btool-card\b[^"]*"[^>]*>.*?</div>',
    '(?is)<li[^>]*class="[^"]*\btool-row\b[^"]*"[^>]*>.*?</li>',
    '(?is)<li[^>]*class="[^"]*\btool-card\b[^"]*"[^>]*>.*?</li>'
  )

  $blocks = New-Object System.Collections.Generic.List[string]

  foreach ($p in $rowPatterns) {
    foreach ($m in [regex]::Matches($html, $p)) {
      $blocks.Add($m.Value) | Out-Null
    }
  }

  # If no row blocks found (markup drift), fall back to scanning for tool links under /tools/<category>/...
  if ($blocks.Count -eq 0) {
    foreach ($m in [regex]::Matches($html, '(?is)<a[^>]*href="([^"]+)"')) {
      $href = Normalize-Href $m.Groups[1].Value
      if ($href.StartsWith("/tools/")) { $rows.Add($href) | Out-Null }
    }
    return $rows
  }

  foreach ($b in $blocks) {
    # Find first anchor link inside block that points to /tools/
    $aMatches = [regex]::Matches($b, '(?is)<a[^>]*href="([^"]+)"')
    $picked = ""
    foreach ($a in $aMatches) {
      $href = Normalize-Href $a.Groups[1].Value
      if ($href.StartsWith("/tools/")) {
        $picked = $href
        break
      }
    }

    if (-not [string]::IsNullOrWhiteSpace($picked)) {
      $rows.Add($picked) | Out-Null
    }
  }

  return $rows
}

function New-Issue([string]$type, [string]$category, [string]$status, [string]$detail) {
  [pscustomobject]@{
    Type     = $type
    Category = $category
    Status   = $status
    Detail   = $detail
  }
}

# -------------------- Main --------------------

$rootFull = (Resolve-Path -LiteralPath $Root).Path
$toolsRoot = Join-Path $rootFull "tools"

if (-not (Test-Path -LiteralPath $toolsRoot)) {
  throw "Tools root not found: $toolsRoot"
}

if ([string]::IsNullOrWhiteSpace($OutCsv)) {
  $OutCsv = Join-Path $rootFull "verify_report.csv"
}

Write-Host "=== ScopedLabs Verify ==="
Write-Host "Root: $rootFull"

$issues = New-Object System.Collections.Generic.List[object]

$categories = Get-CategoryFolders $toolsRoot

foreach ($cat in $categories) {
  $catName = $cat.Name
  $catIndex = Join-Path $cat.FullName "index.html"

  if (-not (Test-Path -LiteralPath $catIndex)) {
    $issues.Add((New-Issue "Category" $catName "MISSING" "index.html missing at $catIndex")) | Out-Null
    continue
  }

  $html = Get-FileText $catIndex

  # Hero href
  $heroHref = Extract-HeroHref $html

  # Row hrefs (one per tool entry)
  $rowHrefs = Extract-ToolRowHrefs $html

  # Normalize and keep only /tools/ links
  $rowHrefsNorm = @()
  foreach ($h in $rowHrefs) {
    $n = Normalize-Href $h
    if ($n.StartsWith("/tools/")) { $rowHrefsNorm += $n }
  }

  # (A) True duplicates in rows: same href appears in multiple distinct rows
  $dupGroups = @($rowHrefsNorm) | Group-Object | Where-Object { $_.Count -gt 1 }
  foreach ($g in $dupGroups) {
    $issues.Add((New-Issue "Tool" $catName "TOOL_DUPLICATED" "Tool entry appears $($g.Count)x in rows: $($g.Name)")) | Out-Null
  }

  # (B) Hero also appears as a row (optional rule)
  if ($FlagHeroAlsoInRows -and -not [string]::IsNullOrWhiteSpace($heroHref)) {
    # Count how many row entries match hero (ignoring multiple anchors inside row, since rows already collapsed)
    $heroInRows = @($rowHrefsNorm | Where-Object { $_ -eq $heroHref }).Count
    if ($heroInRows -gt 0) {
      $issues.Add((New-Issue "Category" $catName "HERO_DUPLICATED" "Hero tool also listed in rows: $heroHref")) | Out-Null
    }
  }
}

# _factory check (optional)
$factoryIndex = Join-Path $toolsRoot "_factory\index.html"
if (-not (Test-Path -LiteralPath $factoryIndex)) {
  $issues.Add((New-Issue "Category" "_factory" "MISSING" "index.html missing at $factoryIndex")) | Out-Null
}

Write-Host ""
Write-Host ("Verification found issues: {0}" -f $issues.Count)

# Write CSV
$issues | Export-Csv -LiteralPath $OutCsv -NoTypeInformation -Encoding UTF8
Write-Host ""
Write-Host "Report saved to: $OutCsv"
