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

  function workloadFactor(w) {
    if (w === "web") return 0.9;
    if (w === "db") return 1.1;
    if (w === "video") return 1.35;
    if (w === "compute") return 1.5;
    return 1.0;
  }

  function render(rows) {
    const el = $("results");
    el.innerHTML = "";
    rows.forEach(r => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      el.appendChild(div);
    });
  }

  function calc() {
    const workload = $("workload").value;
    const concurrency = +$("concurrency").value;
    const cpuPct = +$("cpuPerWorker").value;
    const peak = +$("peak").value;
    const target = +$("targetUtil").value;

    const avg = concurrency * (cpuPct / 100);
    const eff = avg * peak * workloadFactor(workload);
    const cores = eff / (target / 100);

    const rec = Math.ceil(cores);

    let bottleneck = "Balanced";
    if (target > 80) bottleneck = "CPU Risk (high utilization target)";
    if (rec > 32) bottleneck = "CPU Heavy Workload";

    render([
      { label: "Effective Demand", value: `${eff.toFixed(2)} cores` },
      { label: "Required Cores", value: `${cores.toFixed(2)}` },
      { label: "Recommended", value: `${rec} cores` },
      { label: "Primary Constraint", value: bottleneck }
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "compute",
      step: "cpu-sizing",
      data: {
        cores: rec,
        eff,
        workload
      }
    }));

    showContinue();
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", () => {
    $("results").innerHTML = `<div class="muted">Enter values and calculate.</div>`;
    invalidate();
  });

  ["workload","concurrency","cpuPerWorker","peak","targetUtil"].forEach(id => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  $("continue").addEventListener("click", () => {
    window.location.href = "/tools/compute/ram-sizing/";
  });
})();
