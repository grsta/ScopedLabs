/* ScopedLabs — UPS Runtime (Advanced)
   Adds:
   - Load mode: W or V*A
   - Battery mode: Wh or V*Ah
   - Growth horizon: runtime now vs future
   - Target runtime solver (required Wh/Ah)
   - Copy summary
*/

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const els = {
    loadMode: $("loadMode"),
    loadW: $("loadW"),
    loadV: $("loadV"),
    loadA: $("loadA"),

    upsVA: $("upsVA"),
    pf: $("pf"),

    battMode: $("battMode"),
    batteryWh: $("batteryWh"),
    batteryV: $("batteryV"),
    batteryAh: $("batteryAh"),

    effPct: $("effPct"),
    deratePct: $("deratePct"),

    growthPct: $("growthPct"),
    years: $("years"),

    targetMin: $("targetMin"),

    calc: $("calc"),
    reset: $("reset"),
    copy: $("copy"),

    out: $("out"),
  };

  function clamp(n, min, max) {
    if (!Number.isFinite(n)) return min;
    return Math.min(Math.max(n, min), max);
  }

  function num(el) {
    const n = Number(String(el?.value ?? "").trim());
    return Number.isFinite(n) ? n : NaN;
  }

  function round(n, d = 2) {
    const p = Math.pow(10, d);
    return Math.round(n * p) / p;
  }

  function fmtMin(min) {
    if (!Number.isFinite(min)) return "—";
    if (min < 60) return `${Math.round(min)} min`;
    return `${round(min / 60, 2)} hrs`;
  }

  function wattsFromLoad() {
    const mode = els.loadMode.value;

    if (mode === "va") {
      const v = num(els.loadV);
      const a = num(els.loadA);
      if (!Number.isFinite(v) || v <= 0 || !Number.isFinite(a) || a <= 0) return NaN;
      return v * a;
    }

    const w = num(els.loadW);
    if (!Number.isFinite(w) || w <= 0) return NaN;
    return w;
  }

  function whFromBattery() {
    const mode = els.battMode.value;

    if (mode === "vah") {
      const v = num(els.batteryV);
      const ah = num(els.batteryAh);
      if (!Number.isFinite(v) || v <= 0 || !Number.isFinite(ah) || ah <= 0) return NaN;
      return v * ah;
    }

    const wh = num(els.batteryWh);
    if (!Number.isFinite(wh) || wh <= 0) return NaN;
    return wh;
  }

  function compute(loadW, batteryWh, upsVA, pf, effPct, deratePct) {
    const upsWattCap = upsVA * pf;
    const loadPct = (loadW / upsWattCap) * 100;

    const usableWh = batteryWh * (effPct / 100) * (deratePct / 100);

    const runtimeHrs = usableWh / loadW;
    const runtimeMin = runtimeHrs * 60;

    return {
      upsWattCap,
      loadPct,
      usableWh,
      runtimeMin,
      runtimeHrs,
      overload: loadW > upsWattCap,
    };
  }

  function statusFor(result) {
    if (result.overload) {
      return {
        label: "RED",
        note: "Overload risk: estimated load exceeds usable UPS watt capacity.",
      };
    }
    if (result.runtimeMin >= 30) {
      return {
        label: "GREEN",
        note: "Healthy buffer for typical power blips. Still account for aging and spikes.",
      };
    }
    if (result.runtimeMin >= 10) {
      return {
        label: "YELLOW",
        note: "Moderate buffer. Older batteries/spikes can push you into trouble.",
      };
    }
    return {
      label: "RED",
      note: "Thin buffer. Drops likely during brief outages or load spikes.",
    };
  }

  function calc() {
    const loadW = wattsFromLoad();
    const upsVA = num(els.upsVA);
    const pf = clamp(num(els.pf), 0.5, 1.0);
    const batteryWh = whFromBattery();
    const effPct = clamp(num(els.effPct), 50, 98);
    const deratePct = clamp(num(els.deratePct), 50, 100);

    const growthPct = clamp(num(els.growthPct), 0, 50);
    const years = clamp(num(els.years), 0, 25);
    const targetMin = clamp(num(els.targetMin), 1, 600);

    if (
      !Number.isFinite(loadW) || loadW <= 0 ||
      !Number.isFinite(upsVA) || upsVA <= 0 ||
      !Number.isFinite(batteryWh) || batteryWh <= 0
    ) {
      els.out.innerHTML = `<div class="muted">Check inputs: Load, UPS VA, and Battery capacity must be &gt; 0.</div>`;
      return;
    }

    // Now
    const now = compute(loadW, batteryWh, upsVA, pf, effPct, deratePct);
    const nowStatus = statusFor(now);

    // Future load
    const futureLoadW = loadW * Math.pow(1 + growthPct / 100, years);
    const future = compute(futureLoadW, batteryWh, upsVA, pf, effPct, deratePct);
    const futureStatus = statusFor(future);

    // Target solver (required Wh and Ah based on selected battery mode voltage)
    const neededUsableWh = (targetMin / 60) * loadW;
    const requiredRawWh = neededUsableWh / ((effPct / 100) * (deratePct / 100));
    const battV = clamp(num(els.batteryV), 1, 1000);
    const requiredAhAtV = requiredRawWh / battV;

    const summaryText =
      `UPS Runtime (Advanced)\n` +
      `Load: ${Math.round(loadW)} W\n` +
      `UPS: ${Math.round(upsVA)} VA @ PF ${round(pf, 2)} (Cap ~ ${Math.round(now.upsWattCap)} W)\n` +
      `Battery: ${Math.round(batteryWh)} Wh (usable ~ ${Math.round(now.usableWh)} Wh)\n` +
      `Efficiency: ${round(effPct, 1)}% | Derate: ${round(deratePct, 1)}%\n` +
      `Runtime (now): ${fmtMin(now.runtimeMin)} | Status: ${nowStatus.label}\n` +
      `Planning: ${round(growthPct, 1)}%/yr for ${round(years, 1)} yrs → Load ${Math.round(futureLoadW)} W → Runtime ${fmtMin(future.runtimeMin)} | Status: ${futureStatus.label}\n` +
      `Target ${Math.round(targetMin)} min → Required ~ ${Math.round(requiredRawWh)} Wh (~ ${round(requiredAhAtV, 1)} Ah @ ${Math.round(battV)} V)\n`;

    els.out.innerHTML = `
      <div class="pill">NOW: ${nowStatus.label}</div>
      <div class="muted" style="margin-top:.5rem;">
        UPS usable watt capacity: <strong>${Math.round(now.upsWattCap)} W</strong><br>
        Load as % of capacity: <strong>${Math.round(now.loadPct)}%</strong><br>
        Usable battery energy: <strong>${Math.round(now.usableWh)} Wh</strong><br>
        Runtime (ideal/adjusted): <strong>${fmtMin(now.runtimeMin)}</strong><br>
        <span class="muted">${nowStatus.note}</span>
      </div>

      <div class="spacer-md"></div>

      <div class="pill">PLANNING: ${futureStatus.label}</div>
      <div class="muted" style="margin-top:.5rem;">
        Load growth: <strong>${round(growthPct,1)}%</strong> / year for <strong>${round(years,1)}</strong> years<br>
        Future load: <strong>${Math.round(futureLoadW)} W</strong><br>
        Future runtime: <strong>${fmtMin(future.runtimeMin)}</strong><br>
        <span class="muted">${futureStatus.note}</span>
      </div>

      <div class="spacer-md"></div>

      <div class="pill">TARGET SOLVER</div>
      <div class="muted" style="margin-top:.5rem;">
        Target runtime: <strong>${Math.round(targetMin)} min</strong><br>
        Required battery capacity: <strong>~ ${Math.round(requiredRawWh)} Wh</strong><br>
        Approx Ah at battery voltage (${Math.round(battV)} V): <strong>~ ${round(requiredAhAtV,1)} Ah</strong>
      </div>

      <div class="spacer-md"></div>

      <textarea class="card" style="width:100%; min-height:140px; background:rgba(0,0,0,.14);" readonly>${summaryText}</textarea>
    `;

    // store for copy
    els.out.dataset.summary = summaryText;
  }

  function reset() {
    els.loadMode.value = "w";
    els.loadW.value = 250;
    els.loadV.value = 120;
    els.loadA.value = 2.1;

    els.upsVA.value = 1500;
    els.pf.value = 0.90;

    els.battMode.value = "wh";
    els.batteryWh.value = 300;
    els.batteryV.value = 24;
    els.batteryAh.value = 12.5;

    els.effPct.value = 85;
    els.deratePct.value = 80;

    els.growthPct.value = 10;
    els.years.value = 3;

    els.targetMin.value = 30;

    els.out.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    delete els.out.dataset.summary;
  }

  async function copySummary() {
    const text = els.out.dataset.summary || "";
    if (!text) {
      els.out.innerHTML = `<div class="muted">Run Calculate first, then Copy Summary.</div>`;
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      // subtle confirmation without changing the whole UI
      const stamp = `<div class="muted" style="margin-top:.75rem;">Copied summary to clipboard.</div>`;
      if (!els.out.innerHTML.includes("Copied summary")) els.out.innerHTML += stamp;
    } catch {
      els.out.innerHTML += `<div class="muted" style="margin-top:.75rem;">Copy failed (browser blocked). Select the text box and copy manually.</div>`;
    }
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);
  els.copy.addEventListener("click", copySummary);

  // Initial state
  reset();
})();
