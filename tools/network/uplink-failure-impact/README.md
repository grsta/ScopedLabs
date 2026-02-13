# Uplink Failure Impact

Estimates how traffic shifts to remaining links when an uplink fails and evaluates resulting congestion risk.

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
- Run from project root: visit \/tools/Network/uplink-failure-impact/\
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
  "slug": "uplink-failure-impact",
  "title": "Uplink Failure Impact",
  "category": "Network",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-04T22:19:40"
}
