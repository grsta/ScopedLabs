<# 
ScopedLabs Tool Builder
Creates a new tool folder from a clean template and writes:
- index.html
- script.js
- README.md
- access.json

Default target:
  tools\power\battery-bank-sizer\

Run (from repo root):
  Set-Location E:\ScopedLabs
  powershell -ExecutionPolicy Bypass -File .\build-battery-bank-sizer.ps1 -DefaultLevel "Free"
#>

[CmdletBinding()]
param(
  [string]$CategorySlug = "power",
  [string]$ToolSlug     = "battery-bank-sizer",
  [string]$ToolTitle    = "Battery Bank Sizer",
  [ValidateSet("Free","Pro","TBD")]
  [string]$DefaultLevel = "TBD",
  [string[]]$Tags       = @("battery","runtime","dc","inverter","ah","wh"),
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Ensure-Dir($Path) {
  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

function Write-FileIfMissing([string]$Path, [string]$Content) {
  if ((Test-Path $Path) -and (-not $Force)) { return $false }
  $dir = Split-Path $Path -Parent
  Ensure-Dir $dir
  Set-Content -Path $Path -Value $Content -Encoding UTF8
  return $true
}

# Repo root = folder where this script lives (you said you put it in E:\ScopedLabs)
$RepoRoot = $PSScriptRoot
if (-not (Test-Path (Join-Path $RepoRoot "tools"))) {
  throw "I can't find a 'tools' folder next to this script. Put build-battery-bank-sizer.ps1 in the repo root (E:\ScopedLabs)."
}

$ToolDir   = Join-Path $RepoRoot ("tools\{0}\{1}" -f $CategorySlug, $ToolSlug)
$IndexPath = Join-Path $ToolDir "index.html"
$JsPath    = Join-Path $ToolDir "script.js"
$Readme    = Join-Path $ToolDir "README.md"
$Access    = Join-Path $ToolDir "access.json"

Ensure-Dir $ToolDir

# --- index.html (uses absolute /assets paths so styling matches every page) ---
$html = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>$ToolTitle • ScopedLabs</title>

  <!-- IMPORTANT: absolute paths so nested tools always load the same CSS -->
  <link rel="stylesheet" href="/assets/style.css?v=1" />
</head>

<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/">
        <span class="brand-dot"></span>
        <span class="brand-text">ScopedLabs</span>
      </a>

      <nav class="site-nav" aria-label="Primary">
        <a class="nav-pill" href="/">Home</a>
        <a class="nav-pill" href="/tools/">Tools</a>
        <a class="nav-pill" href="/about/">About</a>
      </nav>
    </div>
  </header>

  <main class="container page">
    <div class="crumbs">
      <a href="/tools/">Tools</a>
      <span class="sep">/</span>
      <a href="/tools/$CategorySlug/">Power &amp; Runtime</a>
      <span class="sep">/</span>
      <span>$ToolTitle</span>
    </div>

    <h1>$ToolTitle</h1>
    <p class="subhead">Estimate required battery capacity based on load, runtime, depth of discharge, and efficiency.</p>

    <section class="card tool-card">
      <h2>Inputs</h2>

      <div class="form-grid">
        <label class="field">
          <span class="label">Load (Watts)</span>
          <input id="loadW" type="number" min="0" step="1" value="300" />
        </label>

        <label class="field">
          <span class="label">Desired Runtime (Hours)</span>
          <input id="hours" type="number" min="0" step="0.1" value="8" />
        </label>

        <label class="field">
          <span class="label">System Voltage (V)</span>
          <input id="volts" type="number" min="1" step="1" value="12" />
        </label>

        <label class="field">
          <span class="label">Max Depth of Discharge (%)</span>
          <input id="dod" type="number" min="1" max="100" step="1" value="80" />
        </label>

        <label class="field">
          <span class="label">System Efficiency (%)</span>
          <input id="eff" type="number" min="1" max="100" step="1" value="85" />
        </label>
      </div>

      <div class="actions">
        <button id="calc" class="btn btn-primary">Calculate</button>
        <button id="reset" class="btn">Reset</button>
      </div>
    </section>

    <section class="card tool-card">
      <h2>Results</h2>
      <div id="results" class="results muted">Enter your inputs and press Calculate.</div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <span>© ScopedLabs</span>
    </div>
  </footer>

  <!-- IMPORTANT: load app.js before tool script so nav pill behavior matches everywhere -->
  <script src="/assets/app.js?v=1"></script>
  <script src="./script.js?v=1"></script>
</body>
</html>
"@

# --- script.js ---
$js = @"
(function () {
  const \$ = (id) => document.getElementById(id);

  const defaults = {
    loadW: 300,
    hours: 8,
    volts: 12,
    dod: 80,
    eff: 85
  };

  function number(val) {
    const n = Number(val);
    return Number.isFinite(n) ? n : NaN;
  }

  function fmt(n, digits = 1) {
    return Number.isFinite(n) ? n.toFixed(digits) : "—";
  }

  function calc() {
    const loadW = number(\$("loadW").value);
    const hours = number(\$("hours").value);
    const volts = number(\$("volts").value);
    const dod   = number(\$("dod").value) / 100;
    const eff   = number(\$("eff").value) / 100;

    const out = \$("results");

    if (![loadW, hours, volts, dod, eff].every(Number.isFinite) || loadW <= 0 || hours <= 0 || volts <= 0 || dod <= 0 || eff <= 0) {
      out.textContent = "Check inputs — all values must be > 0.";
      return;
    }

    // Energy needed by load
    const requiredWh_load = loadW * hours;

    // Account for efficiency + depth of discharge
    const requiredWh_bank = requiredWh_load / (eff * dod);

    // Convert to Ah at system voltage
    const requiredAh = requiredWh_bank / volts;

    out.innerHTML =
      "<div><strong>Required energy:</strong> " + fmt(requiredWh_bank, 0) + " Wh</div>" +
      "<div><strong>Equivalent capacity:</strong> " + fmt(requiredAh, 1) + " Ah @ " + fmt(volts, 0) + "V</div>" +
      "<div class='muted' style='margin-top:8px'>Planning-grade estimate. Real results vary with temperature, battery age, and surge loads.</div>";
  }

  function reset() {
    \$("loadW").value = defaults.loadW;
    \$("hours").value = defaults.hours;
    \$("volts").value = defaults.volts;
    \$("dod").value   = defaults.dod;
    \$("eff").value   = defaults.eff;
    \$("results").textContent = "Enter your inputs and press Calculate.";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btnCalc = \$("calc");
    const btnReset = \$("reset");
    if (btnCalc) btnCalc.addEventListener("click", calc);
    if (btnReset) btnReset.addEventListener("click", reset);
  });
})();
"@

# --- README.md ---
$readmeText = @"
# $ToolTitle

**Category:** $CategorySlug  
**Path:** `/tools/$CategorySlug/$ToolSlug/`  
**Access:** $DefaultLevel  

## What it does
Sizes a DC battery bank using:
- Load (W)
- Runtime (hours)
- Voltage (V)
- Depth of discharge (%)
- Efficiency (%)

Outputs:
- Required Wh
- Required Ah @ Voltage

## Notes
- Planning-grade. Validate against equipment specs and real surge behavior.
- Future upgrades (Pro): printable report, saved scenarios, charts.
"@

# --- access.json (safe JSON, no here-string traps) ---
$accessObj = [ordered]@{
  slug    = $ToolSlug
  title   = $ToolTitle
  category= $CategorySlug
  access  = $DefaultLevel
  tags    = $Tags
  version = "0.1.0"
  created = (Get-Date).ToString("s")
}

$created = 0
if (Write-FileIfMissing -Path $IndexPath -Content $html)   { $created++ }
if (Write-FileIfMissing -Path $JsPath    -Content $js)     { $created++ }
if (Write-FileIfMissing -Path $Readme    -Content $readmeText) { $created++ }

# Always (re)write access.json unless Force is off and file exists
if ((-not (Test-Path $Access)) -or $Force) {
  $json = $accessObj | ConvertTo-Json -Depth 6
  Set-Content -Path $Access -Value $json -Encoding UTF8
  $created++
}

Write-Host ""
Write-Host "Done. Created/Updated: $created file(s)"
Write-Host "Tool folder: $ToolDir"
Write-Host "Open: http://localhost:8080/tools/$CategorySlug/$ToolSlug/"
Write-Host ""
Write-Host "Next: add a link row for this tool on /tools/$CategorySlug/index.html (your category list page)."

