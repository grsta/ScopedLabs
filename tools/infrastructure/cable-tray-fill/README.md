# Cable Tray Fill

Calculates cable tray utilization based on cable count and size.

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
- Run from project root: visit \/tools/Infrastructure/cable-tray-fill/\
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
  "slug": "cable-tray-fill",
  "title": "Cable Tray Fill",
  "category": "Infrastructure",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T19:15:13"
}
