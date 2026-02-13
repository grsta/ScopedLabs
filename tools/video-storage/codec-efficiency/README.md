# Codec Efficiency Comparison

Estimates relative storage savings between H.264, H.265, and newer codecs.

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
- Run from project root: visit \/tools/video-storage/codec-efficiency/\
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
  "slug": "codec-efficiency",
  "title": "Codec Efficiency Comparison",
  "category": "video-storage",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-04T23:00:12"
}
