# Room Cooling Capacity

Calculates required cooling capacity based on heat load and room size.

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
- Run from project root: visit \/tools/thermal/room-cooling-capacity/\
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
  "slug": "room-cooling-capacity",
  "title": "Room Cooling Capacity",
  "category": "thermal",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T18:24:36"
}
