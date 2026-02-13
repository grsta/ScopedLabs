# Camera Spacing Planner

alculates recommended spacing to avoid coverage gaps.

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
- Run from project root: visit \/tools/physical-security/camera-spacing/\
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
  "slug": "camera-spacing",
  "title": "Camera Spacing Planner",
  "category": "physical-security",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T17:41:36"
}
