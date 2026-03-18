/* ScopedLabs — UPS Runtime Estimator
   Pipeline-aware version for Power V1
*/

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

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
    usableWh: $("usableWh"),
    status: $("status"),
    note: $("note"),
    flowNote: $("flowNote"),
    nextRow: $("next-step-row"),
  };

  let importedPayload = null;

  function clamp(n, min, max) {
    if (!Number.isFinite(n)) return min;
    return Math.min(Math.max(n, min), max);
  }

  function toNum(inputEl) {
    const n = Number(String(inputEl.value).trim());
    return Number.isFinite(n) ? n : NaN;
  }

  function fmt0(n) {
    return Number.isFinite(n) ? Math.round(n).toLocaleString() : "—";
  }

  function fmt1(n) {
    return Number.isFinite(n) ? (Math.round(n * 10) / 10).toFixed(1) : "—";
  }

  function fmtPct(n) {
    return Number.isFinite(n) ? `${Math.round(n)}%` : "—%";
  }

  function hideContinue() {
    if (els.nextRow) els.nextRow.style.display = "none";
  }

  function showContinue() {
    if (els.nextRow) els.nextRow.style.display = "flex";
  }

  function setStatus(label, note, klass) {
    els.status.textContent = label;
    els.status.className = "v";
    if (klass) els.status.classList.add(klass);
    els.note.textContent = note;
  }

  function clearResults() {
    els.capW.textContent = "— W";
    els.loadPct.textContent = "—%";
    els.runtimeMin.textContent = "—";
    els.runtimeHrs.textContent = "—";
    els.usableWh.textContent = "— Wh";
    setStatus("—", "Enter values and calculate.", "");
    hideContinue();
  }

  function readPipelineInput() {
    try {
      const raw = sessionStorage.getItem(FLOW_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data) return null;
      return parsed;
    } catch (err) {
      console.warn("Could not read pipeline payload:", err);
      return null;
    }
  }

  function savePipelineResult(payload) {
    try {
      const wrapped = {
        category: "power",
        step: "ups-runtime",
        ts: Date.now(),
        data: payload,
      };
      sessionStorage.setItem(FLOW_KEY, JSON.stringify(wrapped));
    } catch (err) {
      console.warn("Could not save pipeline payload:", err);
    }
  }

  function invalidatePipelineResult() {
    try {
      const raw = sessionStorage.getItem(FLOW_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.category === "power" && parsed.step === "ups-runtime") {
        sessionStorage.removeItem(FLOW_KEY);
      }
    } catch (err) {
      console.warn("Could not invalidate pipeline payload:", err);
    }
    hideContinue();
  }

  function loadFromPipeline() {
    const incoming = readPipelineInput();
    if (!incoming || incoming.category !== "power") return;

    importedPayload = incoming;
    const data = incoming.data || {};
    const lines = [];

    if (incoming.step === "load-growth") {
      const loadW =
        Number(data.recommendedCapacityWatts) ||
        Number(data.designLoadWatts) ||
        Number(data.baseLoadWatts) ||
        0;

      if (loadW > 0 && els.loadW) {
        els.loadW.value = Math.round(loadW);
      }

      lines.push("Imported from Load Growth.");

      if (Number.isFinite(Number(data.baseLoadWatts))) {
        lines.push(`Base load: ${fmt0(Number(data.baseLoadWatts))} W`);
      }

      if (Number.isFinite(Number(data.designLoadWatts))) {
        lines.push(`Design load: ${fmt0(Number(data.designLoadWatts))} W`);
      }

      if (Number.isFinite(Number(data.recommendedCapacityWatts))) {
        lines.push(`Recommended: ${fmt0(Number(data.recommendedCapacityWatts))} W`);
      }

      if (Number.isFinite(Number(data.growthPct))) {
        lines.push(`Growth: ${fmt1(Number(data.growthPct))}%`);
      }

      if (Number.isFinite(Number(data.headroomPct))) {
        lines.push(`Headroom: ${fmt1(Number(data.headroomPct))}%`);
      }

      if (els.flowNote) {
        els.flowNote.innerHTML = `
          <strong>Pipeline Import</strong><br>
          ${lines.join("<br>")}
          <br><br>
          Review values and click <strong>Calculate</strong>.
        `;
        els.flowNote.hidden = false;
      }
    }
  }

  function calculate() {
    const loadW = toNum(els.loadW);
    const upsVA = toNum(els.upsVA);
    const pf = clamp(toNum(els.pf), 0.5, 1.0);
    const batteryWh = toNum(els.batteryWh);
    const effPct = clamp(toNum(els.effPct), 50, 98);
    const deratePct = clamp(toNum(els.deratePct), 50, 100);

    if (
      !Number.isFinite(loadW) || loadW <= 0 ||
      !Number.isFinite(upsVA) || upsVA <= 0 ||
      !Number.isFinite(batteryWh) || batteryWh <= 0
    ) {
      clearResults();
      setStatus("CHECK INPUTS", "Load W, UPS VA, and Battery Wh must be greater than 0.", "flag-bad");
      return;
    }

    const upsWattCap = upsVA * pf;
    const loadPct = (loadW / upsWattCap) * 100;
    const usableWh = batteryWh * (effPct / 100) * (deratePct / 100);
    const runtimeHrs = usableWh / loadW;
    const runtimeMin = runtimeHrs * 60;

    els.capW.textContent = `${fmt0(upsWattCap)} W`;
    els.loadPct.textContent = fmtPct(loadPct);
    els.runtimeMin.textContent = fmt0(Math.max(0, runtimeMin));
    els.runtimeHrs.textContent = fmt1(Math.max(0, runtimeHrs));
    els.usableWh.textContent = `${fmt0(usableWh)} Wh`;

    if (loadW > upsWattCap) {
      setStatus(
        "OVERLOAD",
        "Estimated load exceeds usable UPS watt capacity. Expect immediate transfer issues or shutdown under stress.",
        "flag-bad"
      );
    } else if (runtimeMin >= 30) {
      setStatus(
        "HEALTHY",
        "Healthy runtime buffer for typical outages. Still account for battery aging, temperature, and nighttime load spikes.",
        "flag-ok"
      );
    } else if (runtimeMin >= 10) {
      setStatus(
        "TIGHT",
        "Moderate runtime buffer. Likely okay for short outages, but spikes or aging batteries can push this into trouble.",
        "flag-warn"
      );
    } else {
      setStatus(
        "THIN",
        "Very limited runtime. Brief outages or load spikes may still cause drops or unstable shutdown behavior.",
        "flag-bad"
      );
    }

    savePipelineResult({
      source: "UPS Runtime",
      loadW,
      upsVA,
      powerFactor: pf,
      batteryWh,
      effPct,
      deratePct,
      usableWh,
      upsWattCap,
      loadPct,
      runtimeHrs,
      runtimeMin,
      requiredUsableWh: usableWh,
      targetRuntimeHours: runtimeHrs,
      designLoadWatts: loadW,
      importedFrom: importedPayload?.step || null,
    });

    showContinue();
  }

  function resetAll() {
    els.loadW.value = 250;
    els.upsVA.value = 1500;
    els.pf.value = 0.90;
    els.batteryWh.value = 300;
    els.effPct.value = 85;
    els.deratePct.value = 80;
    clearResults();
    invalidatePipelineResult();
  }

  els.calc.addEventListener("click", calculate);
  els.reset.addEventListener("click", resetAll);

  [els.loadW, els.upsVA, els.pf, els.batteryWh, els.effPct, els.deratePct].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") calculate();
    });

    el.addEventListener("input", invalidatePipelineResult);
  });

  clearResults();
  loadFromPipeline();
})();
