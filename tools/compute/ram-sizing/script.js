// RAM Sizing Estimator
(() => {
  const $ = (id) => document.getElementById(id);

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
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
    if (w === "db") return 1.3;
    if (w === "virtualization") return 1.25;
    if (w === "analytics") return 1.4;
    if (w === "web") return 1.1;
    return 1.0;
  }

  function calc() {
    const workload = $("workload").value;
    const concurrency = Math.max(1, Math.floor(n("concurrency")));
    const perProc = Math.max(0, n("perProc"));
    const osGb = Math.max(0, n("osGb"));
    const headroomPct = Math.max(0, n("headroom"));

    const base = concurrency * perProc;
    const adjusted = base * workloadFactor(workload);
    const subtotal = adjusted + osGb;
    const total = subtotal * (1 + headroomPct / 100);

    const rec = Math.ceil(total / 8) * 8; // round to nearest 8GB

    render([
      { label: "Workload", value: workload.toUpperCase() },
      { label: "Process Memory", value: `${base.toFixed(1)} GB` },
      { label: "Adjusted for Workload", value: `${adjusted.toFixed(1)} GB` },
      { label: "OS / Base", value: `${osGb.toFixed(1)} GB` },

      { label: "Subtotal", value: `${subtotal.toFixed(1)} GB` },
      { label: "Headroom", value: `${headroomPct.toFixed(0)} %` },
      { label: "Estimated Total RAM", value: `${total.toFixed(1)} GB` },
      { label: "Recommended Install Size", value: `${rec} GB` }
    ]);
  }

  function reset() {
    $("workload").value = "general";
    $("concurrency").value = 10;
    $("perProc").value = 2;
    $("osGb").value = 8;
    $("headroom").value = 25;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
