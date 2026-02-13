# Client Density Planner

alculates expected device counts based on square footage and occupancy density.

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
- Run from project root: visit \/tools/wireless/client-density/\
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
  "slug": "client-density",
  "title": "Client Density Planner",
  "category": "wireless",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T16:52:29"
}
