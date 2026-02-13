# Failure Runtime Loss

Estimate runtime reduction caused by single-point failures, component losses, and partial system outages.

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
- Run from project root: visit \/tools/power/failure-runtime-loss/\
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
  "slug": "failure-runtime-loss",
  "title": "Failure Runtime Loss",
  "category": "power",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-04T20:13:41"
}
