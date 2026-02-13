# Scenario Comparator

Compare two UPS/power scenarios side-by-side (load, battery Wh/Ah, efficiency) to see runtime and risk changes.

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
- Run from project root: visit \/tools/power/scenario-comparator/\
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
  "slug": "scenario-comparator",
  "title": "Scenario Comparator",
  "category": "power",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-04T20:53:58"
}
