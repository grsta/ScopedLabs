# GPU VRAM Planner

Provides VRAM sizing guidance for multi-stream decode, AI inference, and display wall workloads.

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
- Run from project root: visit \/tools/compute/gpu-vram/\
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
  "slug": "gpu-vram",
  "title": "GPU VRAM Planner",
  "category": "compute",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T17:22:19"
}
