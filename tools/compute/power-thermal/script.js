(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;
  let context = null;

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
    context = loadContext();
    if (!context) return;

    const el = $("flow-note");
    el.style.display = "block";

    el.innerHTML = `
      <div style="display:grid; gap:10px;">
        <div style="font-weight:600;">System Context:</div>

        ${context.vms ? `
        <div class="result-row">
          <span>VM Capacity</span><span>${context.vms}</span>
        </div>` : ""}

        ${context.limiting ? `
        <div class="result-row">
          <span>Constraint</span><span>${context.limiting}</span>
        </div>` : ""}
      </div>
    `;
  }

  function calc() {
    const nodes = +$("nodes").value;
    const watts = +$("watts").value;
    const peak = +$("peak").value;
    const overhead = +$("overhead").value;

    const totalW = nodes * watts * peak * (1 + overhead / 100);
    const btu = totalW * 3.412;
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
    `;

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "compute",
      step: "power-thermal",
      data: { totalW, tons }
    }));

    showContinue();
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", () => {
    $("results").innerHTML = `<div class="muted">Run calculation.</div>`;
    invalidate();
  });

  ["nodes","watts","peak","overhead"].forEach(id => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  $("continue").addEventListener("click", () => {
    window.location.href = "/tools/compute/raid-rebuild-time/";
  });

  loadFlow();
})();
