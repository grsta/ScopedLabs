# Bottleneck Analyzer

Evaluates CPU, memory, disk, and network indicators to highlight the dominant constraint.

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
- Run from project root: visit \/tools/performance/bottleneck-analyzer/\
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
  "slug": "bottleneck-analyzer",
  "title": "Bottleneck Analyzer",
  "category": "performance",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T18:52:51"
}
