# Roaming Threshold Planner

Estimates RSSI thresholds to encourage timely roaming between access points.

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
- Run from project root: visit \/tools/wireless/roaming-thresholds/\
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
  "slug": "roaming-thresholds",
  "title": "Roaming Threshold Planner",
  "category": "wireless",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T17:01:00"
}
