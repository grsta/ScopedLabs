// GPU VRAM Estimator
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

  function calc() {
    const modelGb = Math.max(0, n("modelGb"));
    const batch = Math.max(1, Math.floor(n("batch")));
    const perSampleMb = Math.max(0, n("perSampleMb"));
    const jobs = Math.max(1, Math.floor(n("jobs")));
    const overhead = Math.max(0, n("overhead"));

    // Memory for activations / batch
    const batchMemGb = (batch * perSampleMb) / 1024;

    // Total raw VRAM
    const raw = modelGb + batchMemGb;
    const concurrent = raw * jobs;

    const final = concurrent * (1 + overhead / 100);

    render([
      { label: "Model Size", value: `${modelGb.toFixed(2)} GB` },
      { label: "Batch Memory", value: `${batchMemGb.toFixed(2)} GB` },
      { label: "Concurrent Jobs", value: `${jobs}` },

      { label: "Raw VRAM per Job", value: `${raw.toFixed(2)} GB` },
      { label: "Total Before Overhead", value: `${concurrent.toFixed(2)} GB` },
      { label: "Overhead", value: `${overhead.toFixed(0)} %` },

      { label: "Estimated VRAM Required", value: `${final.toFixed(2)} GB` }
    ]);
  }

  function reset() {
    $("modelGb").value = 8;
    $("batch").value = 4;
    $("perSampleMb").value = 200;
    $("jobs").value = 2;
    $("overhead").value = 20;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();

