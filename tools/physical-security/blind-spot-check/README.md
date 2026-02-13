# Blind Spot Checker

Highlights likely blind spot zones based on FOV and spacing.

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
- Run from project root: visit \/tools/physical-security/blind-spot-check/\
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
  "slug": "blind-spot-check",
  "title": "Blind Spot Checker",
  "category": "physical-security",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T17:43:06"
}
