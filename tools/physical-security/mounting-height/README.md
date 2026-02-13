# Mounting Height Planner

Provides guidance for mounting height based on scene depth and coverage goals.

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
- Run from project root: visit \/tools/physical-security/mounting-height/\
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
  "slug": "mounting-height",
  "title": "Mounting Height Planner",
  "category": "physical-security",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T17:34:59"
}
