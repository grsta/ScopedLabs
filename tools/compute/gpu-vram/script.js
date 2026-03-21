(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;

  function showContinue() {
    $("continue-wrap").style.display = "block";
    $("continue").disabled = false;
    hasResult = true;
  }

  function hideContinue() {
    $("continue-wrap").style.display = "none";
    $("continue").disabled = true;
    hasResult = false;
  }

  function invalidate() {
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    hideContinue();
  }

  function loadContext() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.category !== "compute") return null;

    return parsed.data;
  }

  function loadFlow() {
    const context = loadContext();
    if (!context) return;

    const el = $("flow-note");
    el.style.display = "block";

    el.innerHTML = `
      <div style="display:grid; gap:10px;">
        <div style="font-weight:600;">System Context:</div>

        ${context.vms ? `<div class="result-row"><span>VMs</span><span>${context.vms}</span></div>` : ""}
        ${context.limiting ? `<div class="result-row"><span>Constraint</span><span>${context.limiting}</span></div>` : ""}
      </div>
    `;
  }

  function calc() {
    const mode = $("gpuMode").value;

    if (mode === "no") {
      $("results").innerHTML = `
        <div class="result-row"><span>GPU Requirement</span><span>Not Required</span></div>
        <div class="result-row"><span>Insight</span><span>CPU + RAM design is sufficient</span></div>
      `;

      sessionStorage.setItem(FLOW_KEY, JSON.stringify({
        category: "compute",
        step: "gpu-vram",
        data: { gpu: "none" }
      }));

      showContinue();
      return;
    }

    const modelGb = +$("modelGb").value;
    const batch = +$("batch").value;
    const perSampleMb = +$("perSampleMb").value;
    const jobs = +$("jobs").value;
    const overhead = +$("overhead").value;

    const batchMem = (batch * perSampleMb) / 1024;
    const raw = modelGb + batchMem;
    const total = raw * jobs * (1 + overhead / 100);

    let pressure = "Balanced";
    if (total > 16) pressure = "High VRAM Demand";
    if (total > 40) pressure = "Extreme VRAM Demand";

    $("results").innerHTML = `
      <div class="result-row"><span>VRAM Required</span><span>${total.toFixed(2)} GB</span></div>
      <div class="result-row"><span>GPU Pressure</span><span>${pressure}</span></div>
    `;

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "compute",
      step: "gpu-vram",
      data: { vram: total }
    }));

    showContinue();
  }

  $("calc").addEventListener("click", calc);

  $("reset").addEventListener("click", () => {
    $("results").innerHTML = `<div class="muted">Run calculation.</div>`;
    invalidate();
  });

  ["gpuMode","modelGb","batch","perSampleMb","jobs","overhead"].forEach(id => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  $("continue").addEventListener("click", () => {
    window.location.href = "/tools/compute/power-thermal/";
  });

  loadFlow();
})();

