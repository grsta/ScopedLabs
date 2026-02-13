# Airflow Requirement

Calculates CFM needed to remove heat from equipment.

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
- Run from project root: visit \/tools/thermal/airflow-requirement/\
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
  "slug": "airflow-requirement",
  "title": "Airflow Requirement",
  "category": "thermal",
  "access": "Free",
  "version": "0.1.0",
  "created": "2026-02-05T18:25:49"
}
