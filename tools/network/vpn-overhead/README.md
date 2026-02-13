# VPN Overhead Calculator

Accounts for tunneling and encryption overhead to determine effective payload bandwidth across VPN links.

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
- Run from project root: visit \/tools/network/vpn-overhead/\
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
  "slug": "vpn-overhead",
  "title": "VPN Overhead Calculator",
  "category": "network",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-04T22:25:50"
}
