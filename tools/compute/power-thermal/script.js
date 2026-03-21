(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;
  let upstream = null;

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

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.category !== "compute") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function renderFlowContext(parsed) {
    if (!parsed || !parsed.data) return;

    upstream = parsed;
    const d = parsed.data;
    const el = $("flow-note");
    el.style.display = "block";

    if (parsed.step === "gpu-vram") {
      if (d.gpu === "none") {
        el.innerHTML = `
          <div style="display:grid; gap:10px;">
            <div style="font-weight:600;">System Context:</div>

            <div class="result-row">
              <span>GPU Requirement</span>
              <span>Not Required</span>
            </div>

            <div class="result-row">
              <span>Pipeline Path</span>
              <span>CPU-only system</span>
            </div>
          </div>
        `;
        return;
      }

      el.innerHTML = `
        <div style="display:grid; gap:10px;">
          <div style="font-weight:600;">System Context:</div>

          <div class="result-row">
            <span>GPU Step</span>
            <span>Included</span>
          </div>

          <div class="result-row">
            <span>Estimated VRAM</span>
            <span>${Number(d.vram).toFixed(2)} GB</span>
          </div>
        </div>
      `;
      return;
    }

    if (parsed.step === "vm-density") {
      el.innerHTML = `
        <div style="display:grid; gap:10px;">
          <div style="font-weight:600;">System Context:</div>

          ${d.vms != null ? `
          <div class="result-row">
            <span>VM Capacity</span>
            <span>${d.vms}</span>
          </div>` : ""}

          ${d.limiting ? `
          <div class="result-row">
            <span>Primary Constraint</span>
            <span>${d.limiting}</span>
          </div>` : ""}
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div style="display:grid; gap:10px;">
        <div style="font-weight:600;">System Context:</div>
        <div class="result-row">
          <span>Previous Step</span>
          <span>${parsed.step}</span>
        </div>
      </div>
    `;
  }

  function calc() {
    const nodes = Math.max(1, Number($("nodes").value) || 0);
    const watts = Math.max(0, Number($("watts").value) || 0);
    const peak = Number($("peak").value) || 1;
    const overhead = Math.max(0, Number($("overhead").value) || 0);

    let totalW = nodes * watts * peak * (1 + overhead / 100);

    // Optional advisory note if GPU is in play.
    let gpuNote = "GPU not included in this step.";
    if (upstream && upstream.step === "gpu-vram") {
      if (upstream.data?.gpu === "none") {
        gpuNote = "GPU was intentionally skipped for this design.";
      } else if (upstream.data?.vram != null) {
        gpuNote = `GPU is part of this design path (estimated VRAM ${Number(upstream.data.vram).toFixed(2)} GB). Add actual GPU board wattage into node power if not already included.`;
      }
    } else if (upstream && upstream.step === "vm-density") {
      gpuNote = "No GPU step payload was present; using VM density context only.";
    }

    const btu = totalW * 3.412141633;
    const tons = btu / 12000;

    let pressure = "Normal";
    if (totalW > 5000) pressure = "High Rack Load";
    if (totalW > 10000) pressure = "Extreme Rack Load";

    let insight = "Cooling requirements are manageable.";
    if (tons > 3) insight = "Dedicated cooling likely required.";
    if (tons > 6) insight = "Data center-grade cooling required.";

    $("results").innerHTML = `
      <div class="result-row"><span>Total Power</span><span>${totalW.toFixed(0)} W</span></div>
      <div class="result-row"><span>Heat Load</span><span>${btu.toFixed(0)} BTU/hr</span></div>
      <div class="result-row"><span>Cooling</span><span>${tons.toFixed(2)} tons</span></div>
      <div class="result-row"><span>Thermal Pressure</span><span>${pressure}</span></div>
      <div class="result-row"><span>Insight</span><span>${insight}</span></div>
      <div class="result-row"><span>GPU Context</span><span>${gpuNote}</span></div>
    `;

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "compute",
      step: "power-thermal",
      data: {
        totalW,
        btu,
        tons,
        pressure,
        insight,
        gpuNote
      }
    }));

    showContinue();
  }

  $("calc").addEventListener("click", calc);

  $("reset").addEventListener("click", () => {
    $("nodes").value = 10;
    $("watts").value = 450;
    $("peak").value = "1.15";
    $("overhead").value = 8;
    $("results").innerHTML = `<div class="muted">Run calculation.</div>`;
    invalidate();
  });

  ["nodes", "watts", "peak", "overhead"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  $("continue").addEventListener("click", () => {
    window.location.href = "/tools/compute/raid-rebuild-time/";
  });

  renderFlowContext(loadContext());
})();
