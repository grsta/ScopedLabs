// Archive Cost Estimator
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

  function money(x) {
    if (!Number.isFinite(x)) return "—";
    return `$${x.toFixed(2)}`;
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
    const tb = Math.max(0, n("tb"));
    const costPerTb = Math.max(0, n("costPerTb"));
    const copies = Math.max(1, n("copies"));
    const growthPct = clamp(n("growthPct"), 0, 100);
    const months = Math.max(1, n("months"));

    const growth = growthPct / 100;

    // Month 1 uses current TB, then grows each month
    let totalCost = 0;
    let lastMonthTb = tb;

    for (let m = 1; m <= months; m++) {
      const thisMonthTb = tb * Math.pow(1 + growth, (m - 1));
      lastMonthTb = thisMonthTb;

      const billedTb = thisMonthTb * copies;
      const monthCost = billedTb * costPerTb;

      totalCost += monthCost;
    }

    const billedNowTb = tb * copies;
    const monthlyNow = billedNowTb * costPerTb;

    const billedEndTb = lastMonthTb * copies;
    const monthlyEnd = billedEndTb * costPerTb;

    render([
      { label: "Current Billed Storage", value: `${billedNowTb.toFixed(2)} TB (incl. copies)` },
      { label: "Current Monthly Cost", value: money(monthlyNow) },

      { label: `Monthly Cost (Month ${months})`, value: money(monthlyEnd) },
      { label: `Storage (Month ${months})`, value: `${lastMonthTb.toFixed(2)} TB (base) / ${(billedEndTb).toFixed(2)} TB billed` },

      { label: `Total Cost (${months} months)`, value: money(totalCost) },
      { label: "Growth Rate", value: `${growthPct.toFixed(1)} % / month` }
    ]);
  }

  function reset() {
    $("tb").value = 20;
    $("costPerTb").value = 15;
    $("copies").value = 1;
    $("growthPct").value = 0;
    $("months").value = 12;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
