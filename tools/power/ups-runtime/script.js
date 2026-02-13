/* ScopedLabs — UPS Runtime Estimator (Free anchor tool)
   Guardrails:
   - No external data
   - Simple planning math
   - Clear status + plain-English note
*/

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const els = {
    loadW: $("loadW"),
    upsVA: $("upsVA"),
    pf: $("pf"),
    batteryWh: $("batteryWh"),
    effPct: $("effPct"),
    deratePct: $("deratePct"),
    calc: $("calc"),
    reset: $("reset"),
    capW: $("capW"),
    loadPct: $("loadPct"),
    runtimeMin: $("runtimeMin"),
    runtimeHrs: $("runtimeHrs"),
    status: $("status"),
    note: $("note"),
  };

  function clamp(n, min, max) {
    if (!Number.isFinite(n)) return min;
    return Math.min(Math.max(n, min), max);
  }

  function toNum(inputEl) {
    const n = Number(String(inputEl.value).trim());
    return Number.isFinite(n) ? n : NaN;
  }

  function fmt1(n) {
    return (Math.round(n * 10) / 10).toFixed(1);
  }

  function setStatus(label, note) {
    els.status.textContent = label;
    els.note.textContent = note;
  }

  function clearResults() {
    els.capW.textContent = "— W";
    els.loadPct.textContent = "—%";
    els.runtimeMin.textContent = "—";
    els.runtimeHrs.textContent = "—";
    setStatus("—", "Enter values and calculate.");
  }

  function calculate() {
    const loadW = toNum(els.loadW);
    const upsVA = toNum(els.upsVA);
    const pf = clamp(toNum(els.pf), 0.5, 1.0);
    const batteryWh = toNum(els.batteryWh);
    const effPct = clamp(toNum(els.effPct), 50, 98);
    const deratePct = clamp(toNum(els.deratePct), 50, 100);

    // Basic validation
    if (
      !Number.isFinite(loadW) || loadW <= 0 ||
      !Number.isFinite(upsVA) || upsVA <= 0 ||
      !Number.isFinite(batteryWh) || batteryWh <= 0
    ) {
      clearResults();
      setStatus("CHECK INPUTS", "Load W, UPS VA, and Battery Wh must be > 0.");
      return;
    }

    const upsWattCap = upsVA * pf;
    const loadPct = (loadW / upsWattCap) * 100;

    // Usable energy after efficiency + battery health derate
    const usableWh = batteryWh * (effPct / 100) * (deratePct / 100);

    // Runtime hours = Wh / W
    const runtimeHrs = usableWh / loadW;
    const runtimeMin = runtimeHrs * 60;

    els.capW.textContent = `${Math.round(upsWattCap)} W`;
    els.loadPct.textContent = `${Math.round(loadPct)}%`;
    els.runtimeMin.textContent = `${Math.max(0, Math.round(runtimeMin))}`;
    els.runtimeHrs.textContent = `${fmt1(Math.max(0, runtimeHrs))}`;

    // Status rules
    // 1) Overload always RED
    if (loadW > upsWattCap) {
      setStatus(
        "RED",
        "Overload risk: estimated load exceeds usable UPS watt capacity. Expect immediate transfer issues or shutdown under stress."
      );
      return;
    }

    // 2) Runtime thresholds (tuneable)
    // GREEN: >= 30 min
    // YELLOW: 10–29 min
    // RED: < 10 min
    if (runtimeMin >= 30) {
      setStatus(
        "GREEN",
        "Healthy runtime buffer for typical power blips. Still account for battery aging and load spikes."
      );
    } else if (runtimeMin >= 10) {
      setStatus(
        "YELLOW",
        "Moderate buffer. Likely OK for short outages, but exports/spikes or an older battery can push you into trouble."
      );
    } else {
      setStatus(
        "RED",
        "Thin buffer. Users may experience drops during brief outages or when load spikes (IR at night, heaters, reboots)."
      );
    }
  }

  function resetAll() {
    // Defaults (safe starter values)
    els.loadW.value = 250;
    els.upsVA.value = 1500;
    els.pf.value = 0.90;
    els.batteryWh.value = 300;
    els.effPct.value = 85;
    els.deratePct.value = 80;
    clearResults();
  }

  // Wire up
  els.calc.addEventListener("click", calculate);
  els.reset.addEventListener("click", resetAll);

  // Optional: calculate on Enter for any input
  [els.loadW, els.upsVA, els.pf, els.batteryWh, els.effPct, els.deratePct].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") calculate();
    });
  });

  // Start clean
  clearResults();
})();
