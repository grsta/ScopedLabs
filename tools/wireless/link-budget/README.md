# RF Link Budget Calculator

Computes received signal strength using transmit power, antenna gains, and path loss.

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
- Run from project root: visit \/tools/wireless/link-budget/\
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
  "slug": "link-budget",
  "title": "RF Link Budget Calculator",
  "category": "wireless",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T16:56:46"
}
