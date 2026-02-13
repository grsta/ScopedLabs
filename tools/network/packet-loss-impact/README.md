# Packet Loss Impact Estimator

Models how packet loss percentage degrades effective throughput and increases retransmissions.

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
- Run from project root: visit \/tools/network/packet-loss-impact/\
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
  "slug": "packet-loss-impact",
  "title": "Packet Loss Impact Estimator",
  "category": "network",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-04T22:33:49"
}
