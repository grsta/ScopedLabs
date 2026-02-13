# ScopedLabs README Builder
# Run this from the /tools directory.
# Safe behavior: creates README.md only if missing (does NOT overwrite).

function TitleCase-FromSlug {
  param([string]$slug)

  if ([string]::IsNullOrWhiteSpace($slug)) { return $slug }

  # Convert slug like "video-storage" or "ups-runtime" -> "Video Storage" / "UPS Runtime"
  $parts = $slug -split '-'
  $words = @()

  foreach ($p in $parts) {
    if ([string]::IsNullOrWhiteSpace($p)) { continue }

    switch ($p.ToLower()) {
      "ups" { $words += "UPS"; continue }
      "poe" { $words += "PoE"; continue }
      "mtu" { $words += "MTU"; continue }
      "raid" { $words += "RAID"; continue }
      "stt" { $words += "STT"; continue }
      "tts" { $words += "TTS"; continue }
    }

    $words += ($p.Substring(0,1).ToUpper() + $p.Substring(1).ToLower())
  }

  return ($words -join " ")
}

function CategoryLabel {
  param([string]$categorySlug)

  switch ($categorySlug.ToLower()) {
    "power" { return "Power" }
    "network" { return "Network" }
    "video-storage" { return "Video & Storage" }
    "thermal" { return "Thermal" }
    "performance" { return "Performance" }
    default { return (TitleCase-FromSlug $categorySlug) }
  }
}

# Ensure we're in the /tools folder
$root = Get-Location
Write-Host "ScopedLabs README Builder"
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
  $category = CategoryLabel $t.CategorySlug
  $toolName = TitleCase-FromSlug $t.ToolSlug
  $readmePath = Join-Path $t.FullPath "README.md"

  if (Test-Path $readmePath) {
    Write-Host "Exists  $($t.CategorySlug)\$($t.ToolSlug)\README.md"
    $skipped++
    continue
  }

  $content = @"
# $toolName

Category: $category  
Status: Placeholder  
Access Level: TBD

---

## Purpose
(What problem does this tool solve? 1–2 sentences.)

---

## What This Tool Does
- (Core output #1)
- (Core output #2)
- (Core output #3)

---

## What This Tool Does NOT Do
- (Explicitly list out-of-scope items to prevent creep.)

---

## Inputs (Expected)
- (Input #1)
- (Input #2)
- (Input #3)

---

## Outputs (Expected)
- (Output #1)
- (Output #2)
- (Output #3)

---

## Assumptions & Notes
- (Assumption #1)
- (Assumption #2)

---

## Free vs Pro Consideration
- (Why this should be Free / Pro / TBD.)

---

## Future Enhancements (Optional)
- (Reasonable extension #1)
- (Reasonable extension #2)

---

## Internal Notes
- (Anything helpful for future-you / future agents.)
"@

  New-Item -ItemType File -Path $readmePath -Value $content -Force | Out-Null
  Write-Host "Created $($t.CategorySlug)\$($t.ToolSlug)\README.md"
  $created++
}

Write-Host "`nDone."
Write-Host "Created: $created"
Write-Host "Skipped (already existed): $skipped"
