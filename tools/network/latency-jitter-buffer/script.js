// Jitter Buffer Sizing Tool
(() => {
  const $ = (id) => document.getElementById(id);

  function n(id) {
    const v = parseFloat($(id)?.value);
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
    const avg = n("avgJitter");
    const varJ = n("variation");
    const marginPct = n("margin");

    const bufferMs = (avg + varJ) * (1 + marginPct / 100);

    render([
      { label: "Average Jitter", value: `${avg.toFixed(0)} ms` },
      { label: "Jitter Variation", value: `${varJ.toFixed(0)} ms` },
      { label: "Safety Margin", value: `${marginPct.toFixed(0)} %` },
      { label: "Recommended Jitter Buffer", value: `${bufferMs.toFixed(1)} ms` },
      { label: "Estimated Added Latency", value: `${bufferMs.toFixed(1)} ms` }
    ]);
  }

  function reset() {
    $("avgJitter").value = 20;
    $("variation").value = 10;
    $("margin").value = 20;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();

