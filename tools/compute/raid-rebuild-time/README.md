# RAID Rebuild Time Estimator

Estimates rebuild time based on drive size, array type, and rebuild throughput assumptions to understand risk windows.

## Status
- Page created
- Inputs wired
- Math logic: TODO
- Results displaying

## Files
- \index.html\ â€” tool UI (ScopedLabs template)
- \script.js\ â€” calculation logic + events
- \ccess.json\ â€” tool metadata + access tier

## Notes
- Run from project root: visit \/tools/compute/raid-rebuild-time/\
"@

# Seed access.json
# (Write as pretty JSON without needing external modules)
 = ""
if (.Count -gt 0) {
   =  | ForEach-Object { '"' + ( -replace '"','\"') + '"' }
   = "  ""tags"": [ " + ( -join ", ") + " ],
"
} else {
   = "  ""tags"": [],
"
}

 = @"
{
  "slug": "raid-rebuild-time",
  "title": "RAID Rebuild Time Estimator",
  "category": "compute",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T17:19:46"
}
