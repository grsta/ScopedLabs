# RAM Sizing Helper

Calculates recommended RAM based on OS baseline, application footprint, caching, and VM overhead.

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
- Run from project root: visit \/tools/compute/ram-sizing/\
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
  "slug": "ram-sizing",
  "title": "RAM Sizing Helper",
  "category": "compute",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T17:15:22"
}
