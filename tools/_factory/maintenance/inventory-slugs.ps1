$TOOLS = "E:\ScopedLabs\tools"
$out  = "E:\ScopedLabs\tools\_factory\maintenance\_inventory_slugs.txt"

$cats = Get-ChildItem -Path $TOOLS -Directory | Sort-Object Name

$lines = @()
foreach ($c in $cats) {
  $cat = $c.Name
  # tool folders inside category
  $slugs = Get-ChildItem -Path $c.FullName -Directory | Sort-Object Name | Select-Object -ExpandProperty Name
  $lines += "=== $cat ($($slugs.Count)) ==="
  $lines += $slugs
  $lines += ""
}

# UTF-8 no BOM write
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($out, $lines, $utf8NoBom)

Write-Host "Wrote: $out"
