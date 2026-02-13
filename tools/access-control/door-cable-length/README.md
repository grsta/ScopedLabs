# Door Cable Length Estimator

Provides rough cable length estimates based on layout and pathways.

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
- Run from project root: visit \/tools/access-control/door-cable-length/\
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
  "slug": "door-cable-length",
  "title": "Door Cable Length Estimator",
  "category": "access-control",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T18:03:31"
}
