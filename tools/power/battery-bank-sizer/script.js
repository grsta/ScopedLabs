(() => {

const $ = (id) => document.getElementById(id);

const els = {
  load: $("load"),
  hours: $("hours"),
  voltage: $("voltage"),
  dod: $("dod"),
  eff: $("efficiency"),
  results: $("results"),
  calc: $("calc"),
  reset: $("reset"),
  next: $("next-step-row")
};

let lastResult = null;

// ===== PIPELINE IMPORT =====
function loadFromPipeline() {
  try {
    const raw = sessionStorage.getItem("sl_pipeline_payload");
    if (!raw) return;

    const data = JSON.parse(raw);

    const flow = $("flowNote");

    const load = data.designLoadWatts || data.loadWatts;
    const runtime = data.runtimeHours || data.targetRuntimeHours;

    if (load && els.load) els.load.value = Math.round(load);
    if (runtime && els.hours) els.hours.value = runtime;

    flow.innerHTML = `
      <strong>Pipeline Import</strong><br>
      Imported from ${data.source || "UPS Runtime"}<br><br>
      ${load ? `Load: ${load} W<br>` : ""}
      ${runtime ? `Runtime: ${runtime} hrs<br>` : ""}
      <br>Review and calculate.
    `;

    flow.hidden = false;

  } catch (e) {
    console.warn(e);
  }
}

// ===== CALC =====
function calculate() {
  const load = parseFloat(els.load.value);
  const hours = parseFloat(els.hours.value);
  const voltage = parseFloat(els.voltage.value);
  const dod = parseFloat(els.dod.value) / 100;
  const eff = parseFloat(els.eff.value) / 100;

  if ([load, hours, voltage, dod, eff].some(v => !isFinite(v))) {
    els.results.innerHTML = "Invalid input";
    return;
  }

  const wh = load * hours;
  const adjWh = wh / eff;
  const totalWh = adjWh / dod;
  const ah = totalWh / voltage;

  lastResult = { totalWh, ah, load, hours };

  els.results.innerHTML = `
    <div><strong>Required Energy:</strong> ${totalWh.toFixed(1)} Wh</div>
    <div><strong>Battery Capacity:</strong> ${ah.toFixed(1)} Ah @ ${voltage}V</div>
  `;

  els.next.style.display = "block";

  // ===== SAVE PIPELINE =====
  sessionStorage.setItem("sl_pipeline_payload", JSON.stringify({
    category: "power",
    step: "battery-bank-sizer",
    source: "battery-bank-sizer",
    ts: Date.now(),
    designLoadWatts: load,
    runtimeHours: hours,
    requiredWh: totalWh
  }));
}

// ===== RESET =====
function reset() {
  els.results.innerHTML = "Enter values and calculate.";
  els.next.style.display = "none";
}

// ===== INPUT CHANGE INVALIDATION =====
["load","hours","voltage","dod","efficiency"].forEach(id=>{
  const el = $(id);
  if (!el) return;
  el.addEventListener("input", ()=>{
    els.next.style.display = "none";
  });
});

// events
els.calc.addEventListener("click", calculate);
els.reset.addEventListener("click", reset);

// init
loadFromPipeline();

})();
