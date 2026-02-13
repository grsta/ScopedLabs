# Power & Thermal Estimator

Estimates wattage and heat load (BTU/hr) based on CPU, GPU, drives, and PSU efficiency assumptions.

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
- Run from project root: visit \/tools/compute/power-thermal/\
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
  "slug": "power-thermal",
  "title": "Power & Thermal Estimator",
  "category": "compute",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T17:23:40"
}
