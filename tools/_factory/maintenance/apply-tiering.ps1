$ErrorActionPreference = "Stop"

$ROOT  = "E:\ScopedLabs"
$TOOLS = Join-Path $ROOT "tools"
$LIST  = Join-Path $ROOT "tools\_factory\maintenance\free_vs_pro_tools.txt"

if (!(Test-Path $LIST))  { throw "List file not found: $LIST" }
if (!(Test-Path $TOOLS)) { throw "Tools folder not found: $TOOLS" }

# Real category folders (source of truth)
$catFolders = Get-ChildItem -Path $TOOLS -Directory |
  Where-Object { $_.Name -notmatch '^_' } |
  Select-Object -ExpandProperty Name

$catSet = New-Object System.Collections.Generic.HashSet[string] ([StringComparer]::OrdinalIgnoreCase)
$catFolders | ForEach-Object { [void]$catSet.Add($_) }

# Parse list into FREE + PRO sets: "category/slug"
$freeSet = New-Object System.Collections.Generic.HashSet[string] ([StringComparer]::OrdinalIgnoreCase)
$proSet  = New-Object System.Collections.Generic.HashSet[string] ([StringComparer]::OrdinalIgnoreCase)

$cat  = $null
$mode = $null  # "free" | "pro"

Get-Content -LiteralPath $LIST | ForEach-Object {
  $line = ($_ -replace "`r","").Trim()
  if (!$line) { return }

  $u = $line.ToUpperInvariant()
  if ($u -eq "FREE") { $mode = "free"; return }
  if ($u -eq "PRO")  { $mode = "pro";  return }

  # Category line: must match a real folder
  if ($catSet.Contains($line)) {
    $cat = $line.ToLowerInvariant()
    $mode = $null
    return
  }

  # Slug line (a-z0-9-)
  if ($cat -and $mode -and $line -match '^[a-z0-9\-]+$') {
    $key = "$cat/$($line.ToLowerInvariant())"
    if ($mode -eq "free") { [void]$freeSet.Add($key) }
    if ($mode -eq "pro")  { [void]$proSet.Add($key) }
  }
}

Write-Host ("FREE tools loaded: {0}" -f $freeSet.Count)
Write-Host ("PRO  tools loaded: {0}" -f $proSet.Count)

# Safe UTF-8 no BOM writer
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
function Write-Utf8NoBom([string]$path, [string]$text) {
  [System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
}

# Keep pro.js present (your site expects it)
$scriptTag = '<script src="/assets/pro.js?v=0207"></script>'

$scanned    = 0
$updated    = 0
$injected   = 0
$setTier    = 0
$setProtect = 0
$cleared    = 0
$skipped    = 0

Get-ChildItem -Path $TOOLS -Recurse -Filter "index.html" | ForEach-Object {

  $scanned++
  $path = $_.FullName

  # tools\<cat>\<slug>\index.html
  $rel = $path.Substring($TOOLS.Length).TrimStart("\")
  $parts = $rel.Split([char[]]"\", [System.StringSplitOptions]::RemoveEmptyEntries)
  if ($parts.Length -lt 3) { $skipped++; return }

  $folderCat = $parts[0].ToLowerInvariant()
  $slug      = $parts[1].ToLowerInvariant()
  $key       = "$folderCat/$slug"

  # Determine tier from list sets
  $tier = $null
  if ($freeSet.Contains($key)) { $tier = "free" }
  elseif ($proSet.Contains($key)) { $tier = "pro" }
  else { $skipped++; return } # not in your tier list => ignore

  $text = [System.IO.File]::ReadAllText($path)
  $changed = $false

  # 1) Ensure pro.js is present before </body>
  if ($text -notlike "*$scriptTag*") {
    if ($text -match "(?i)</body>") {
      $text = [regex]::Replace($text, "(?i)</body>", "$scriptTag`r`n</body>", 1)
      $changed = $true
      $injected++
    }
  }

  # 2) Set body data-tier correctly (free/pro)
  if ($text -match "(?i)<body\b[^>]*\bdata-tier\s*=\s*['""](free|pro)['""]") {
    $text2 = [regex]::Replace($text, "(?i)\bdata-tier\s*=\s*['""](free|pro)['""]", "data-tier=`"$tier`"", 1)
    if ($text2 -ne $text) { $text = $text2; $changed = $true; $setTier++ }
  } elseif ($text -match "(?i)<body\b") {
    $text2 = [regex]::Replace($text, "(?i)<body\b", "<body data-tier=`"$tier`"", 1)
    if ($text2 -ne $text) { $text = $text2; $changed = $true; $setTier++ }
  }

  # 3) data-protected behavior:
  #    - PRO: ensure data-protected="true"
  #    - FREE: remove data-protected entirely if present
  if ($tier -eq "pro") {
    if ($text -notmatch "(?i)\bdata-protected\s*=\s*['""]true['""]") {
      if ($text -match "(?i)<body\b") {
        # If attribute exists but not true, normalize; else inject
        if ($text -match "(?i)\bdata-protected\s*=") {
          $text2 = [regex]::Replace($text, "(?i)\bdata-protected\s*=\s*['""][^'""]*['""]", "data-protected=`"true`"", 1)
        } else {
          $text2 = [regex]::Replace($text, "(?i)<body\b", "<body data-protected=`"true`"", 1)
        }
        if ($text2 -ne $text) { $text = $text2; $changed = $true; $setProtect++ }
      }
    }
  } else {
    if ($text -match "(?i)\s+data-protected\s*=\s*['""][^'""]*['""]") {
      $text2 = [regex]::Replace($text, "(?i)\s+data-protected\s*=\s*['""][^'""]*['""]", "", 1)
      if ($text2 -ne $text) { $text = $text2; $changed = $true; $cleared++ }
    }
  }

  if ($changed) {
    Write-Utf8NoBom $path $text
    $updated++
    Write-Host "Updated -> $key ($tier)"
  } else {
    $skipped++
  }
}

Write-Host ""
Write-Host "DONE"
Write-Host ("Scanned: {0}" -f $scanned)
Write-Host ("Updated files: {0}" -f $updated)
Write-Host ("Injected script: {0}" -f $injected)
Write-Host ("Set data-tier: {0}" -f $setTier)
Write-Host ("Set data-protected (pro): {0}" -f $setProtect)
Write-Host ("Cleared data-protected (free): {0}" -f $cleared)
Write-Host ("Skipped/no change: {0}" -f $skipped)

