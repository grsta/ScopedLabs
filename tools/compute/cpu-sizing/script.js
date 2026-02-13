// CPU Sizing Estimator (planning math)
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

  function workloadFactor(w) {
    // How “spiky / CPU-bound” the workload tends to be
    if (w === "web") return 0.9;     // often I/O + short CPU bursts
    if (w === "db") return 1.1;      // more CPU + cache pressure
    if (w === "video") return 1.35;  // CPU heavy
    if (w === "compute") return 1.5; // CPU heavy batch
    return 1.0;
  }

  function calc() {
    const workload = $("workload").value;
    const concurrency = Math.max(1, Math.floor(n("concurrency")));
    const cpuPerWorkerPct = clamp(n("cpuPerWorker"), 0, 100);
    const peak = parseFloat($("peak").value);
    const targetUtilPct = clamp(n("targetUtil"), 10, 95);
    const smt = $("smt").value; // on|off

    // total “core equivalents” needed:
    // each worker uses cpuPerWorker% of one core on average.
    const avgCoreEq = concurrency * (cpuPerWorkerPct / 100);

    // apply peak + workload factor
    const eff = avgCoreEq * (Number.isFinite(peak) ? peak : 1.25) * workloadFactor(workload);

    // keep utilization below target: coresNeeded = eff / targetUtil
    const coresNeeded = eff / (targetUtilPct / 100);

    // If SMT off, recommend rounding up and adding more headroom
    const smtNote = smt === "off"
      ? "SMT off: plan extra headroom for context switching / kernel overhead."
      : "SMT on: sizing treats logical cores as usable scheduling units (still validate with benchmarks).";

    // recommendation tiers
    const rec = Math.max(1, Math.ceil(coresNeeded));
    const low = Math.max(1, Math.floor(rec * 0.85));
    const high = Math.max(1, Math.ceil(rec * 1.25));

    render([
      { label: "Workload", value: workload.toUpperCase() },
      { label: "Concurrency", value: `${concurrency}` },
      { label: "Avg Core Equivalents", value: `${avgCoreEq.toFixed(2)} cores` },
      { label: "Peak Factor", value: `${peak.toFixed(2)}×` },
      { label: "Target Utilization", value: `${targetUtilPct.toFixed(0)}%` },

      { label: "Effective Demand (adj.)", value: `${eff.toFixed(2)} core-eq` },
      { label: "Estimated Cores Needed", value: `${coresNeeded.toFixed(2)}` },
      { label: "Recommended Core Count", value: `${rec} (range ${low}–${high})` },

      { label: "Notes", value: `${smtNote} Benchmark your real workload if possible.` }
    ]);
  }

  function reset() {
    $("workload").value = "general";
    $("concurrency").value = 16;
    $("cpuPerWorker").value = 30;
    $("peak").value = "1.25";
    $("targetUtil").value = 70;
    $("smt").value = "on";
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
