# Fan CFM Sizing

Calculates fan airflow needed to dissipate heat.

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
- Run from project root: visit \/tools/thermal/fan-cfm-sizing/\
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
  "slug": "fan-cfm-sizing",
  "title": "Fan CFM Sizing",
  "category": "thermal",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T18:29:28"
}
