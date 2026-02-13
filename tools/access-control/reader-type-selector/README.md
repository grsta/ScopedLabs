# Reader Type Selector

Helps choose between keypad, card, mobile, biometric, or multi-tech readers.

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
- Run from project root: visit \/tools/access-control/reader-type-selector/\
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
  "slug": "reader-type-selector",
  "title": "Reader Type Selector",
  "category": "access-control",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T17:55:46"
}
