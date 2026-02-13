# Panel Capacity Planner

Calculates required panel I/O capacity based on door count and devices.

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
- Run from project root: visit \/tools/access-control/panel-capacity/\
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
  "slug": "panel-capacity",
  "title": "Panel Capacity Planner",
  "category": "access-control",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T17:57:03"
}
