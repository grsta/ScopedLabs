# Point-to-Point Wireless Link Planner

Estimates achievable throughput and reliability for point-to-point wireless links.

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
- Run from project root: visit \/tools/wireless/ptp-wireless-link/\
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
  "slug": "ptp-wireless-link",
  "title": "Point-to-Point Wireless Link Planner",
  "category": "wireless",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T17:03:53"
}
