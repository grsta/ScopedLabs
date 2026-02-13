# Network Growth Simulator

Simulates how increasing device counts and bitrate changes affect total network demand across future periods.

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
- Run from project root: visit \/tools/network/growth-simulator/\
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
  "slug": "growth-simulator",
  "title": "Network Growth Simulator",
  "category": "network",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-04T22:23:11"
}
