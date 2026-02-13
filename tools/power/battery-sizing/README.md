# Battery Sizing

Estimate required battery capacity (Wh and Ah) based on load, desired runtime, system voltage, depth of discharge, and efficiency.

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
- Run from project root: visit \/tools/power/battery-sizing/\
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
  "slug": "battery-sizing",
  "title": "Battery Sizing",
  "category": "power",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-04T19:56:43"
}
