# Failure Days Lost Estimator

Calculates how many days of footage may be lost during a storage failure event.

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
- Run from project root: visit \/tools/video-storage/failure-days-lost/\
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
  "slug": "failure-days-lost",
  "title": "Failure Days Lost Estimator",
  "category": "video-storage",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-04T22:58:10"
}
