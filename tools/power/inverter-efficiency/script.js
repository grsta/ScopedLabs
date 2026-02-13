// tools/power/inverter-efficiency/script.js
(() => {
  const $ = (id) => document.getElementById(id);

  function n(id) {
    const el = $(id);
    if (!el) return NaN;
    const v = parseFloat(String(el.value ?? "").trim());
    return Number.isFinite(v) ? v : NaN;
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }

  function fmt(x, d = 2) {
    if (!Number.isFinite(x)) return "—";
    const y = Math.abs(x) < 1e-9 ? 0 : x;
    return y.toFixed(d);
  }

  function render(rows) {
    const el = $("results");
    if (!el) return;
    el.innerHTML = "";
    rows.forEach(({ label, value }) => {
      const row = document.createElement("div");
      row.className = "result-row";
      row.innerHTML = `<span class="result-label">${label}</span><span class="result-value">${value}</span>`;
      el.appendChild(row);
    });
  }

  function calc() {
    const loadW = n("loadW");
    let effPct = n("eff");
    const dcV = n("dcV");

    if (!Number.isFinite(loadW) || loadW <= 0) {
      render([{ label: "Error", value: "Enter a valid AC Load (W) > 0" }]);
      return;
    }

    if (!Number.isFinite(dcV) || dcV <= 0) {
      render([{ label: "Error", value: "Enter a valid DC Voltage (V) > 0" }]);
      return;
    }

    if (!Number.isFinite(effPct)) effPct = 90;
    effPct = clamp(effPct, 1, 100);

    const eff = effPct / 100;
    const dcInW = loadW / eff;
    const lossW = dcInW - loadW;
    const dcA = dcInW / dcV;

    render([
      { label: "AC Load (W)", value: `${fmt(loadW, 0)} W` },
      { label: "Efficiency Used", value: `${fmt(effPct, 0)}%` },
      { label: "DC Input Power (W)", value: `${fmt(dcInW, 0)} W` },
      { label: "Estimated Loss (W)", value: `${fmt(lossW, 0)} W` },
      { label: "DC Current (A)", value: `${fmt(dcA, 2)} A @ ${fmt(dcV, 1)}V` },
    ]);
  }

  function reset() {
    if ($("loadW")) $("loadW").value = 120;
    if ($("eff")) $("eff").value = 90;
    if ($("dcV")) $("dcV").value = 12;

    const el = $("results");
    if (el) el.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc")?.addEventListener("click", calc);
  $("reset")?.addEventListener("click", reset);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.target?.tagName === "INPUT" || e.target?.tagName === "SELECT")) {
      e.preventDefault();
      calc();
    }
  });

  reset();
})();
