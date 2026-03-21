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

        ${context.cores ? `
        <div class="result-row">
          <span>CPU</span><span>${context.cores} cores</span>
        </div>` : ""}

        ${context.ram ? `
        <div class="result-row">
          <span>RAM</span><span>${context.ram} GB</span>
        </div>` : ""}

        ${context.finalIops ? `
        <div class="result-row">
          <span>IOPS</span><span>${Math.round(context.finalIops)}</span>
        </div>` : ""}

        ${context.final ? `
        <div class="result-row">
          <span>Throughput</span><span>${context.final.toFixed(0)} MB/s</span>
        </div>` : ""}
      </div>
    `;
  }

  function calc() {
    const cores = +$("hostCores").value;
    const ram = +$("hostRam").value;
    const reserve = +$("reserve").value;

    const vmCpu = +$("vmCpu").value;
    const vmRam = +$("vmRam").value;

    const cpuOver = +$("cpuOver").value;
    const ramOver = +$("ramOver").value;
    const spare = +$("spare").value;

    const cpuPool = cores * (1 - spare / 100) * cpuOver;
    const ramPool = (ram - reserve) * (1 - spare / 100) * ramOver;

    const cpuVMs = Math.floor(cpuPool / vmCpu);
    const ramVMs = Math.floor(ramPool / vmRam);

    const vms = Math.min(cpuVMs, ramVMs);

    let limiting = "Balanced";
    if (cpuVMs < ramVMs) limiting = "CPU";
    if (ramVMs < cpuVMs) limiting = "RAM";

    let insight = "System is balanced.";
    if (limiting === "CPU") insight = "CPU will cap density first.";
    if (limiting === "RAM") insight = "Memory will cap density first.";

    if (context && context.finalIops > 20000 && vms > 50) {
      insight = "Storage likely becomes bottleneck before reaching this density.";
    }

    $("results").innerHTML = `
      <div class="result-row"><span>VM Capacity</span><span>${vms}</span></div>
      <div class="result-row"><span>CPU Limit</span><span>${cpuVMs}</span></div>
      <div class="result-row"><span>RAM Limit</span><span>${ramVMs}</span></div>
      <div class="result-row"><span>Primary Constraint</span><span>${limiting}</span></div>
      <div class="result-row"><span>Insight</span><span>${insight}</span></div>
    `;

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "compute",
      step: "vm-density",
      data: { vms, limiting }
    }));

    showContinue();
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", () => {
    $("results").innerHTML = `<div class="muted">Run calculation.</div>`;
    invalidate();
  });

  ["hostCores","hostRam","reserve","vmCpu","vmRam","cpuOver","ramOver","spare"]
    .forEach(id => {
      $(id).addEventListener("input", invalidate);
      $(id).addEventListener("change", invalidate);
    });

  $("continue").addEventListener("click", () => {
    window.location.href = "/tools/compute/gpu-vram/";
  });

  loadFlow();
})();
