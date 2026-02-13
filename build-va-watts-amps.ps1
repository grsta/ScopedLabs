param(
  [string]$CategorySlug = "power",
  [string]$ToolSlug = "va-watts-amps",
  [string]$ToolTitle = "VA to Watts to Amps Converter",
  [string]$DefaultLevel = "TBD"
)

$ErrorActionPreference = "Stop"

# Root = folder where this script sits
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

$ToolDir = Join-Path $Root ("tools\" + $CategorySlug + "\" + $ToolSlug)

if (!(Test-Path $ToolDir)) {
  New-Item -ItemType Directory -Force -Path $ToolDir | Out-Null
}

# ---------------- index.html ----------------
$indexHtml = @"
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>$ToolTitle • ScopedLabs</title>
<link rel="stylesheet" href="/assets/style.css?v=1">
</head>

<body>

<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/">
      <span class="brand-dot"></span>
      <span class="brand-name">ScopedLabs</span>
    </a>

    <nav class="nav">
      <a class="nav-link" href="/">Home</a>
      <a class="nav-link" href="/tools/">Tools</a>
      <a class="nav-link" href="/about/">About</a>
    </nav>
  </div>
</header>

<main class="container">

<div class="crumbs">
  <a href="/tools/">Tools</a>
  <span>/</span>
  <a href="/tools/power/">Power & Runtime</a>
  <span>/</span>
  <span>$ToolTitle</span>
</div>

<h1 class="page-title">$ToolTitle</h1>
<p class="page-subtitle">
Convert between VA, Watts, and Amps using voltage and power factor.
</p>

<section class="card tool-card">

<h2>Inputs</h2>

<label class="field">
<span>Voltage (V)</span>
<input id="volts" type="number" value="120">
</label>

<label class="field">
<span>Power Factor (0.5 - 1.0)</span>
<input id="pf" type="number" step="0.01" value="0.9">
</label>

<label class="field">
<span>Watts (W)</span>
<input id="watts" type="number" placeholder="Optional">
</label>

<label class="field">
<span>Volt-Amps (VA)</span>
<input id="va" type="number" placeholder="Optional">
</label>

<div class="actions">
<button id="calc" class="btn btn-primary">Calculate</button>
<button id="reset" class="btn">Reset</button>
</div>

</section>

<section class="card tool-card">

<h2>Results</h2>

<div class="results-row">
<strong>Watts:</strong> <span id="outWatts">—</span>
</div>

<div class="results-row">
<strong>VA:</strong> <span id="outVA">—</span>
</div>

<div class="results-row">
<strong>Amps:</strong> <span id="outAmps">—</span>
</div>

<p id="note" class="muted">Enter values and press Calculate.</p>

</section>

</main>

<script src="/assets/app.js?v=1"></script>
<script src="./script.js?v=1"></script>

</body>
</html>
"@

Set-Content -Path (Join-Path $ToolDir "index.html") -Value $indexHtml -Encoding UTF8

# ---------------- script.js ----------------
$scriptJs = @"
const volts = document.getElementById("volts");
const pf = document.getElementById("pf");
const watts = document.getElementById("watts");
const va = document.getElementById("va");

const outWatts = document.getElementById("outWatts");
const outVA = document.getElementById("outVA");
const outAmps = document.getElementById("outAmps");
const note = document.getElementById("note");

document.getElementById("calc").onclick = () => {

  const V = Number(volts.value);
  const PF = Number(pf.value);
  const W = Number(watts.value);
  const VA = Number(va.value);

  if (!V || !PF) {
    note.textContent = "Voltage and Power Factor are required.";
    return;
  }

  let finalWatts;
  let finalVA;

  if (W > 0) {
    finalWatts = W;
    finalVA = W / PF;
  } else if (VA > 0) {
    finalVA = VA;
    finalWatts = VA * PF;
  } else {
    note.textContent = "Enter Watts OR VA.";
    return;
  }

  const amps = finalVA / V;

  outWatts.textContent = Math.round(finalWatts) + " W";
  outVA.textContent = Math.round(finalVA) + " VA";
  outAmps.textContent = amps.toFixed(2) + " A";

  note.textContent = "Calculated using single-phase formulas.";
};

document.getElementById("reset").onclick = () => {
  volts.value = 120;
  pf.value = 0.9;
  watts.value = "";
  va.value = "";
  outWatts.textContent = "—";
  outVA.textContent = "—";
  outAmps.textContent = "—";
  note.textContent = "Enter values and press Calculate.";
};

console.log("VA/Watts/Amps tool loaded");
"@

Set-Content -Path (Join-Path $ToolDir "script.js") -Value $scriptJs -Encoding UTF8

# ---------------- README ----------------
$readme = @"
# VA to Watts to Amps Converter

Converts between VA, Watts, and Amps using voltage and power factor.

Single-phase only.

Formulas:
Watts = VA × PF  
VA = Watts ÷ PF  
Amps = VA ÷ Voltage
"@

Set-Content -Path (Join-Path $ToolDir "README.md") -Value $readme -Encoding UTF8

# ---------------- access.json ----------------
$access = @{
  slug = $ToolSlug
  title = $ToolTitle
  category = $CategorySlug
  access = $DefaultLevel
  version = "0.1.0"
}

$access | ConvertTo-Json | Set-Content (Join-Path $ToolDir "access.json")

Write-Host "Tool created at: tools\$CategorySlug\$ToolSlug"
