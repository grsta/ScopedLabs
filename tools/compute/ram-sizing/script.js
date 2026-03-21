(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;
  let cpuContext = null;

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

  function render(rows) {
    const el = $("results");
    el.innerHTML = "";
    rows.forEach((r) => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      el.appendChild(div);
    });
  }

  function workloadFactor(w) {
    if (w === "db") return 1.3;
    if (w === "virtualization") return 1.25;
    if (w === "analytics") return 1.4;
    if (w === "web") return 1.1;
    return 1.0;
  }

  function loadCPUContext() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return null;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    if (!parsed || parsed.category !== "compute") return null;
    if (parsed.step !== "cpu-sizing") return null;
    if (!parsed.data) return null;

    return parsed.data;
  }

  function loadFlowContext() {
    cpuContext = loadCPUContext();
    if (!cpuContext) return;

    const flow = $("flow-note");
    flow.style.display = "block";
    flow.innerHTML = `
      <div style="display:grid; gap:10px;">
        <div style="font-weight:600;">From CPU Sizing:</div>

        <div class="result-row">
          <span class="result-label">Recommended Cores</span>
          <span class="result-value">${cpuContext.cores}</span>
        </div>

        <div class="result-row">
          <span class="result-label">Effective Load</span>
          <span class="result-value">${Number(cpuContext.eff).toFixed(2)} core-eq</span>
        </div>

        <div class="result-row">
          <span class="result-label">Workload</span>
          <span class="result-value">${cpuContext.workload}</span>
        </div>
      </div>
    `;
  }

  function calc() {
    const workload = $("workload").value;
    const concurrency = Math.max(1, Number($("concurrency").value) || 0);
    const perProc = Math.max(0, Number($("perProc").value) || 0);
    const osGb = Math.max(0, Number($("osGb").value) || 0);
    const headroomPct = Math.max(0, Number($("headroom").value) || 0);

    const base = concurrency * perProc;
    const adjusted = base * workloadFactor(workload);
    const subtotal = adjusted + osGb;
    const total = subtotal * (1 + headroomPct / 100);
    const rec = Math.ceil(total / 8) * 8;

    let pressure = "Balanced";
    if (total > 128) pressure = "High Memory Demand";
    if (total > 256) pressure = "Extreme Memory Pressure";

    let bottleneck = "Balanced";
    if (cpuContext && Number(cpuContext.cores) < 8 && total > 64) {
      bottleneck = "CPU likely bottleneck before RAM";
    } else if (total > 128) {
      bottleneck = "Memory is primary constraint";
    }

    render([
      { label: "Process Memory", value: `${base.toFixed(1)} GB` },
      { label: "Adjusted", value: `${adjusted.toFixed(1)} GB` },
      { label: "Total Required", value: `${total.toFixed(1)} GB` },
      { label: "Recommended", value: `${rec} GB` },
      { label: "Memory Pressure", value: pressure },
      { label: "Primary Constraint", value: bottleneck }
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "compute",
      step: "ram-sizing",
      data: {
        ram: rec,
        total,
        pressure,
        bottleneck,
        workload
      }
    }));

    showContinue();
  }

  $("calc").addEventListener("click", calc);

  $("reset").addEventListener("click", () => {
    $("workload").value = "general";
    $("concurrency").value = 10;
    $("perProc").value = 2;
    $("osGb").value = 8;
    $("headroom").value = 25;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    invalidate();
  });

  ["workload", "concurrency", "perProc", "osGb", "headroom"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  $("continue").addEventListener("click", () => {
    window.location.href = "/tools/compute/storage-iops/";
  });

  loadFlowContext();
})();