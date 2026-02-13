# Rack RU Planner

Calculates total RU consumed by installed equipment.

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
- Run from project root: visit \/tools/Infrastructure/rack-ru-planner/\
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
  "slug": "rack-ru-planner",
  "title": "Rack RU Planner",
  "category": "Infrastructure",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T19:12:02"
}
