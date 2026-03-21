(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;
  let iopsContext = null;

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

  function loadIOPSContext() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.category !== "compute") return null;
    if (parsed.step !== "storage-iops") return null;

    return parsed.data;
  }

  function loadFlowContext() {
    iopsContext = loadIOPSContext();
    if (!iopsContext) return;

    const el = $("flow-note");
    el.style.display = "block";

    el.innerHTML = `
      <div style="display:grid; gap:10px;">
        <div style="font-weight:600;">From IOPS:</div>

        <div class="result-row">
          <span class="result-label">Required IOPS</span>
          <span class="result-value">${Math.round(iopsContext.finalIops)}</span>
        </div>

        <div class="result-row">
          <span class="result-label">Storage Pressure</span>
          <span class="result-value">${iopsContext.storagePressure}</span>
        </div>

        <div class="result-row">
          <span class="result-label">Constraint</span>
          <span class="result-value">${iopsContext.primaryConstraint}</span>
        </div>
      </div>
    `;
  }

  function calc() {
    const iops = +$("iops").value;
    const kb = +$("kb").value;
    const readPct = +$("readPct").value;
    const writePct = +$("writePct").value;
    const overhead = +$("overhead").value;

    const totalMBps = (iops * kb) / 1024;
    const final = totalMBps * (1 + overhead / 100);

    let pressure = "Balanced";
    if (final > 500) pressure = "High Throughput Demand";
    if (final > 1500) pressure = "Extreme Throughput Demand";

    let mismatch = "Balanced";
    if (iopsContext && iopsContext.finalIops > 20000 && final < 300) {
      mismatch = "High IOPS but low throughput → random workload";
    }
    if (iopsContext && final > 1000 && iopsContext.finalIops < 5000) {
      mismatch = "High throughput but low IOPS → sequential workload";
    }

    render([
      { label: "Throughput", value: `${final.toFixed(1)} MB/s` },
      { label: "Throughput Pressure", value: pressure },
      { label: "Workload Pattern", value: mismatch }
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "compute",
      step: "storage-throughput",
      data: { final, pressure, mismatch }
    }));

    showContinue();
  }

  $("calc").addEventListener("click", calc);

  $("reset").addEventListener("click", () => {
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    invalidate();
  });

  ["iops","kb","readPct","writePct","overhead"].forEach(id => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  $("continue").addEventListener("click", () => {
    window.location.href = "/tools/compute/vm-density/";
  });

  loadFlowContext();
})();
