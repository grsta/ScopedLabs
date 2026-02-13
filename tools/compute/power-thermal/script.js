// Compute Power -> Heat conversion
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
    const nodes = Math.max(1, Math.floor(n("nodes")));
    const watts = Math.max(0, n("watts"));
    const peak = parseFloat($("peak").value);
    const overheadPct = Math.max(0, n("overhead"));

    const baseW = nodes * watts;
    const peakW = baseW * (Number.isFinite(peak) ? peak : 1.15);
    const totalW = peakW * (1 + overheadPct / 100);

    // 1 watt = 3.412141633 BTU/hr
    const btuHr = totalW * 3.412141633;

    // Ton of cooling: 12,000 BTU/hr
    const tons = btuHr / 12000;

    render([
      { label: "Nodes", value: `${nodes}` },
      { label: "Base Load", value: `${baseW.toFixed(0)} W` },
      { label: "Peak Factor", value: `${peak.toFixed(2)}×` },
      { label: "Overhead", value: `${overheadPct.toFixed(0)}%` },

      { label: "Total Power (est.)", value: `${totalW.toFixed(0)} W` },
      { label: "Heat Load", value: `${btuHr.toFixed(0)} BTU/hr` },
      { label: "Cooling (approx)", value: `${tons.toFixed(2)} tons` },

      { label: "Notes", value: "Rule-of-thumb: nearly all electrical power consumed becomes heat in the room. Validate with nameplate + real telemetry where possible." }
    ]);
  }

  function reset() {
    $("nodes").value = 10;
    $("watts").value = 450;
    $("peak").value = "1.15";
    $("overhead").value = 8;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
