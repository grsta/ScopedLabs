(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;
  let ramContext = null;

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

  function loadRAMContext() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return null;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    if (!parsed || parsed.category !== "compute") return null;
    if (parsed.step !== "ram-sizing") return null;
    if (!parsed.data) return null;

    return parsed.data;
  }

  function loadFlowContext() {
    ramContext = loadRAMContext();
    if (!ramContext) return;

    const flow = $("flow-note");
    flow.style.display = "block";
    flow.innerHTML = `
      <div style="display:grid; gap:10px;">
        <div style="font-weight:600;">From RAM Sizing:</div>

        <div class="result-row">
          <span class="result-label">Recommended RAM</span>
          <span class="result-value">${ramContext.ram} GB</span>
        </div>

        <div class="result-row">
          <span class="result-label">Estimated Total</span>
          <span class="result-value">${Number(ramContext.total).toFixed(1)} GB</span>
        </div>

        <div class="result-row">
          <span class="result-label">Memory Pressure</span>
          <span class="result-value">${ramContext.pressure}</span>
        </div>

        <div class="result-row">
          <span class="result-label">Primary Constraint</span>
          <span class="result-value">${ramContext.bottleneck}</span>
        </div>
      </div>
    `;
  }

  function calc() {
    const tps = Math.max(0, Number($("tps").value) || 0);
    const reads = Math.max(0, Number($("reads").value) || 0);
    const writes = Math.max(0, Number($("writes").value) || 0);
    const penalty = Number($("penalty").value) || 1;
    const headroomPct = Math.max(0, Number($("headroom").value) || 0);

    const readIops = tps * reads;
    const writeIops = tps * writes * penalty;
    const subtotal = readIops + writeIops;
    const finalIops = subtotal * (1 + headroomPct / 100);

    let storagePressure = "Balanced";
    if (finalIops > 10000) storagePressure = "High IOPS Demand";
    if (finalIops > 50000) storagePressure = "Extreme IOPS Demand";

    let primaryConstraint = "Balanced";
    if (ramContext && Number(ramContext.ram) >= 128 && finalIops > 10000) {
      primaryConstraint = "Storage is likely primary bottleneck";
    } else if (finalIops > 50000) {
      primaryConstraint = "Storage is primary bottleneck";
    } else if (ramContext && String(ramContext.pressure).includes("Extreme")) {
      primaryConstraint = "Memory pressure may still dominate";
    }

    let guidance = "A balanced storage design should maintain headroom above normal peaks.";
    if (penalty >= 4) {
      guidance = "RAID write penalty is materially increasing write load. Validate disk tier and controller cache carefully.";
    }
    if (finalIops > 50000) {
      guidance = "This workload likely needs high-performance SSD or NVMe storage. Spinning disk will struggle unless heavily tiered.";
    }

    render([
      { label: "Read IOPS", value: readIops.toFixed(0) },
      { label: "Write IOPS (penalized)", value: writeIops.toFixed(0) },
      { label: "Subtotal IOPS", value: subtotal.toFixed(0) },
      { label: "Headroom", value: `${headroomPct.toFixed(0)} %` },
      { label: "Estimated Required IOPS", value: finalIops.toFixed(0) },
      { label: "Storage Pressure", value: storagePressure },
      { label: "Primary Constraint", value: primaryConstraint },
      { label: "Guidance", value: guidance }
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "compute",
      step: "storage-iops",
      data: {
        readIops,
        writeIops,
        subtotal,
        finalIops,
        storagePressure,
        primaryConstraint
      }
    }));

    showContinue();
  }

  $("calc").addEventListener("click", calc);

  $("reset").addEventListener("click", () => {
    $("tps").value = 2000;
    $("reads").value = 2;
    $("writes").value = 1;
    $("penalty").value = "4";
    $("headroom").value = 30;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    invalidate();
  });

  ["tps", "reads", "writes", "penalty", "headroom"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  $("continue").addEventListener("click", () => {
    window.location.href = "/tools/compute/storage-throughput/";
  });

  loadFlowContext();
})();
