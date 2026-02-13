$TOOLS_ROOT = "E:\ScopedLabs\tools"
$LIST = "E:\ScopedLabs\tools\_factory\maintenance\free_vs_pro_tools.txt"

if (!(Test-Path $LIST)) { throw "Missing list file: $LIST" }

# --- Parse list into: category -> { free:Set, pro:Set }
$tiers = @{}
$cat = $null
$mode = $null

Get-Content $LIST | ForEach-Object {
  $ln = ($_ -replace "\r","").Trim()
  if (!$ln) { return }

  if ($ln -match '^(FREE|PRO)$') { $mode = $ln.ToLower(); return }

  # Category header lines (emoji or ALL CAPS style)
  if ($ln -match '^[^\w]*[A-Z0-9].*$' -and $ln -notmatch '^[a-z0-9-]+$') {
    # normalize category folder name guess:
    # you can keep these headers pretty; folder name comes from actual scan
    $cat = $ln
    if (!$tiers.ContainsKey($cat)) {
      $tiers[$cat] = @{ free = New-Object System.Collections.Generic.HashSet[string]
                        pro  = New-Object System.Collections.Generic.HashSet[string] }
    }
    return
  }

  # slug line
  if ($cat -and $mode -and ($ln -match '^[a-z0-9-]+$')) {
    [void]$tiers[$cat][$mode].Add($ln)
  }
}

# --- Scan actual category folders
$catFolders = Get-ChildItem $TOOLS_ROOT -Directory |
  Where-Object { $_.Name -notmatch '^_' } |
  Sort-Object Name

# Build folder truth: categoryFolder -> toolSlug list
$truth = @{}
foreach ($c in $catFolders) {
  $slugs = Get-ChildItem $c.FullName -Directory |
    Where-Object { $_.Name -notmatch '^_' } |
    Sort-Object Name |
    Select-Object -ExpandProperty Name
  $truth[$c.Name] = $slugs
}

# --- Show summary + missing from list (by folder category)
"Category`tFolderCount`tListCount`tMissingCount"
foreach ($k in $truth.Keys | Sort-Object) {
  $folderSlugs = $truth[$k]

  # find matching tier block by fuzzy match on category header text
  $matchKey = ($tiers.Keys | Where-Object { $_ -match [regex]::Escape($k) } | Select-Object -First 1)
  $listed = New-Object System.Collections.Generic.HashSet[string]
  if ($matchKey) {
    $tiers[$matchKey].free | ForEach-Object { [void]$listed.Add($_) }
    $tiers[$matchKey].pro  | ForEach-Object { [void]$listed.Add($_) }
  }

  $missing = @($folderSlugs | Where-Object { -not $listed.Contains($_) })
  "$k`t$($folderSlugs.Count)`t$($listed.Count)`t$($missing.Count)"
  if ($missing.Count -gt 0) {
    "  Missing: " + ($missing -join ", ")
  }
}

