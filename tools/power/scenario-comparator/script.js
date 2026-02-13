(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function num(id) {
    const v = Number($(id)?.value);
    return Number.isFinite(v) ? v : NaN;
  }

  function fmtHrs(hours) {
    if (!Number.isFinite(hours)) return "—";
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${hours.toFixed(2)} hrs`;
  }

  function runtimeHours(loadW, battWh, effPct, reservePct) {
    // usableWh = battWh * efficiency * (1 - reserve)
    const eff = effPct / 100;
    const reserve = reservePct / 100;

    const usableWh = battWh * eff * (1 - reserve);
    if (!(usableWh > 0) || !(loadW > 0)) return NaN;

    return usableWh / loadW;
  }

  const calcBtn = $("calc");
  const resetBtn = $("reset");
  const results = $("results");

  if (!calcBtn || !resetBtn || !results) {
    console.warn("Scenario Comparator: missing #calc/#reset/#results");
    return;
  }

  function render(msgHtml) {
    results.innerHTML = msgHtml;
  }

  calcBtn.addEventListener("click", () => {
    const A = {
      loadW: num("a_load_w"),
      battWh: num("a_batt_wh"),
      effPct: num("a_eff_pct"),
      reservePct: num("a_reserve_pct"),
    };

    const B = {
      loadW: num("b_load_w"),
      battWh: num("b_batt_wh"),
      effPct: num("b_eff_pct"),
      reservePct: num("b_reserve_pct"),
    };

    // Basic validation
    const bad =
      !Number.isFinite(A.loadW) || A.loadW <= 0 ||
      !Number.isFinite(A.battWh) || A.battWh <= 0 ||
      !Number.isFinite(A.effPct) || A.effPct <= 0 || A.effPct > 100 ||
      !Number.isFinite(A.reservePct) || A.reservePct < 0 || A.reservePct >= 100 ||
      !Number.isFinite(B.loadW) || B.loadW <= 0 ||
      !Number.isFinite(B.battWh) || B.battWh <= 0 ||
      !Number.isFinite(B.effPct) || B.effPct <= 0 || B.effPct > 100 ||
      !Number.isFinite(B.reservePct) || B.reservePct < 0 || B.reservePct >= 100;

    if (bad) {
      render(`<div class="muted">Enter valid values (Loads & Wh > 0, Efficiency 1–100, Reserve 0–99).</div>`);
      return;
    }

    const aHrs = runtimeHours(A.loadW, A.battWh, A.effPct, A.reservePct);
    const bHrs = runtimeHours(B.loadW, B.battWh, B.effPct, B.reservePct);

    const deltaHrs = bHrs - aHrs;
    const pct = aHrs === 0 ? null : (deltaHrs / aHrs) * 100;

    render(`
      <div style="display:grid; gap:.5rem;">
        <div><strong>Scenario A Runtime:</strong> ${fmtHrs(aHrs)}</div>
        <div><strong>Scenario B Runtime:</strong> ${fmtHrs(bHrs)}</div>
        <div class="spacer-sm"></div>
        <div><strong>Difference (B − A):</strong> ${fmtHrs(deltaHrs)}</div>
        ${pct === null ? "" : `<div><strong>% Change vs A:</strong> ${pct.toFixed(2)}%</div>`}
        <div class="spacer-sm"></div>
        <div class="muted" style="font-size:.9rem;">
          Model: usableWh = Wh × (efficiency) × (1 − reserve). Runtime = usableWh ÷ load(W).
        </div>
      </div>
    `);
  });

  resetBtn.addEventListener("click", () => {
    // Restore the defaults from HTML
    $("a_load_w").value = "800";
    $("a_batt_wh").value = "2000";
    $("a_eff_pct").value = "90";
    $("a_reserve_pct").value = "20";

    $("b_load_w").value = "800";
    $("b_batt_wh").value = "3000";
    $("b_eff_pct").value = "92";
    $("b_reserve_pct").value = "20";

    render(`<div class="muted">Enter values and press Calculate.</div>`);
  });
})();
