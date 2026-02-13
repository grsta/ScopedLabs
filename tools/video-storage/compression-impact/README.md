# Compression Impact Estimator

Models how changing compression levels affects bitrate and storage consumption.

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
- Run from project root: visit \/tools/video-storage/compression-impact/\
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
  "slug": "compression-impact",
  "title": "Compression Impact Estimator",
  "category": "video-storage",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-04T23:03:29"
}
