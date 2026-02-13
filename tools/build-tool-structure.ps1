# ScopedLabs Tool Folder Builder
# Run from /tools directory

$structure = @{
  "power" = @(
    "ups-runtime",
    "battery-sizing",
    "load-growth",
    "redundancy-impact",
    "failure-runtime-loss",
    "scenario-comparator"
  )
  "network" = @(
    "bandwidth-planner",
    "latency-budget",
    "poe-budget",
    "oversubscription",
    "uplink-failure-impact",
    "growth-simulator"
  )
  "video-storage" = @(
    "storage-calculator",
    "retention-planner",
    "bitrate-estimator",
    "raid-impact",
    "archive-cost",
    "failure-days-lost"
  )
  "thermal" = @(
    "heat-load",
    "enclosure-airflow",
    "derating-impact",
    "ambient-risk",
    "fan-failure-impact",
    "safety-margin-check"
  )
  "performance" = @(
    "worst-case-planner",
    "sensitivity-analysis",
    "failure-probability",
    "bottleneck-detector",
    "margin-erosion",
    "stress-envelope"
  )
}

foreach ($category in $structure.Keys) {
  foreach ($tool in $structure[$category]) {
    $path = Join-Path $category $tool
    if (-not (Test-Path $path)) {
      New-Item -ItemType Directory -Path $path | Out-Null
      Write-Host "Created $path"
    } else {
      Write-Host "Exists  $path"
    }
  }
}

Write-Host "`nDone. Folder structure is ready."
