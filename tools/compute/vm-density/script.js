// VM Density Estimator
(() => {
  const $ = (id) => document.getElementById(id);

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
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
    const hostCores = Math.max(1, Math.floor(n("hostCores")));
    const hostRam = Math.max(1, n("hostRam"));
    const reserve = Math.max(0, n("reserve"));

    const vmCpu = Math.max(1, Math.floor(n("vmCpu")));
    const vmRam = Math.max(0.1, n("vmRam"));

    const cpuOver = Math.max(1, n("cpuOver"));
    const ramOver = Math.max(1, n("ramOver"));

    const sparePct = clamp(n("spare"), 0, 80);

    // apply spare: reduce usable pool
    const cpuPool = hostCores * (1 - sparePct / 100);
    const ramPool = Math.max(0, (hostRam - reserve)) * (1 - sparePct / 100);

    // oversub/overcommit increases effective pool
    const effCpu = cpuPool * cpuOver;
    const effRam = ramPool * ramOver;

    const cpuVMs = Math.floor(effCpu / vmCpu);
    const ramVMs = Math.floor(effRam / vmRam);

    const vms = Math.max(0, Math.min(cpuVMs, ramVMs));

    const limiting = cpuVMs < ramVMs ? "CPU" : (ramVMs < cpuVMs ? "RAM" : "Balanced");

    render([
      { label: "Host (raw)", value: `${hostCores} cores / ${hostRam.toFixed(0)} GB` },
      { label: "Reserved RAM", value: `${reserve.toFixed(0)} GB` },
      { label: "VM Size", value: `${vmCpu} vCPU / ${vmRam.toFixed(1)} GB` },

      { label: "CPU Oversubscription", value: `${cpuOver.toFixed(2)}×` },
      { label: "RAM Overcommit", value: `${ramOver.toFixed(2)}×` },
      { label: "Spare Capacity", value: `${sparePct.toFixed(0)}%` },

      { label: "VMs by CPU", value: `${cpuVMs}` },
      { label: "VMs by RAM", value: `${ramVMs}` },
      { label: "Estimated VM Density", value: `${vms} VMs / host` },

      { label: "Limiting Resource", value: limiting },
      { label: "Notes", value: "Oversubscription assumptions vary by workload. Validate with telemetry and keep N+1 headroom for failures." }
    ]);
  }

  function reset() {
    $("hostCores").value = 32;
    $("hostRam").value = 256;
    $("reserve").value = 16;
    $("vmCpu").value = 2;
    $("vmRam").value = 4;
    $("cpuOver").value = 3;
    $("ramOver").value = 1.1;
    $("spare").value = 15;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
