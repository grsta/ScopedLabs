const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

(() => {
  const $ = (id) => document.getElementById(id);

  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "power";
  const STEP = "battery-bank-sizer";

  const els = {
    load: $("load"),
    hours: $("hours"),
    voltage: $("voltage"),
    dod: $("dod"),
    efficiency: $("efficiency"),
    results: $("results"),
    analysis: $("analysis-copy"),
    calc: $("calc"),
    reset: $("reset"),
    flowNote: $("flow-note"),
    next: $("next-step-row")
  };

  const DEFAULTS = {
    load: 300,
    hours: 8,
    voltage: 12,
    dod: 80,
    efficiency: 85
  };

  function num(value, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(value, fallback);
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtWatts(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} W` : "—";
  }

  function fmtHours(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} hrs` : "—";
  }

  function fmtVolts(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} V` : "—";
  }

  function fmtPct(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function fmtWh(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} Wh` : "—";
  }

  function fmtAh(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} Ah` : "—";
  }

  function applyDefaults() {
    els.load.value = String(DEFAULTS.load);
    els.hours.value = String(DEFAULTS.hours);
    els.voltage.value = String(DEFAULTS.voltage);
    els.dod.value = String(DEFAULTS.dod);
    els.efficiency.value = String(DEFAULTS.efficiency);
  }

  function showComplete() {
    if (els.next) els.next.style.display = "flex";
  }

  function hideComplete() {
    if (els.next) els.next.style.display = "none";
  }

  function renderFlowNote() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEY,
      category: CATEGORY,
      step: STEP,
      title: "Flow context",
      intro: "This final step converts the upstream runtime requirement into real battery capacity after efficiency and discharge limits are applied."
    });

    if (!flow || !flow.data || flow.step !== "ups-runtime") return;

    const prev = flow.data || {};

    const load =
      num(prev.designLoadWatts, NaN) ||
      num(prev.loadWatts, NaN) ||
      num(prev.load, NaN);

    const runtime =
      num(prev.runtimeHours, NaN) ||
      num(prev.targetRuntimeHours, NaN) ||
      num(prev.hours, NaN);

    const va = num(prev.va, NaN);
    const watts = num(prev.watts, NaN);
    const runtimeClass = prev.runtimeClass || prev.status || "";

    if (Number.isFinite(load) && load > 0) {
      els.load.value = String(Math.round(load));
    }
    if (Number.isFinite(runtime) && runtime > 0) {
      els.hours.value = String(runtime);
    }

    const parts = [];
    if (Number.isFinite(load) && load > 0) parts.push(`load <strong>${fmtWatts(load)}</strong>`);
    if (Number.isFinite(runtime) && runtime > 0) parts.push(`runtime <strong>${fmtHours(runtime)}</strong>`);
    if (Number.isFinite(va) && va > 0) parts.push(`VA <strong>${fmt(va, 0)}</strong>`);
    if (Number.isFinite(watts) && watts > 0) parts.push(`watts <strong>${fmtWatts(watts)}</strong>`);
    if (runtimeClass) parts.push(`runtime result <strong>${runtimeClass}</strong>`);

    if (parts.length) {
      els.flowNote.style.display = "";
      els.flowNote.innerHTML = `
        <strong>Flow context</strong><br>
        Prior UPS runtime results detected — ${parts.join(", ")}.
        This step converts that runtime target into required battery energy and amp-hour capacity.
      `;
    }
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      flowKey: FLOW_KEY,
      category: CATEGORY,
      step: STEP,
      emptyMessage: "Enter values and calculate."
    });
    hideComplete();
    renderFlowNote();
  }

  function getInputs() {
    const load = num(els.load.value);
    const hours = num(els.hours.value);
    const voltage = num(els.voltage.value);
    const dodPct = num(els.dod.value);
    const effPct = num(els.efficiency.value);

    if (
      !Number.isFinite(load) || load <= 0 ||
      !Number.isFinite(hours) || hours <= 0 ||
      !Number.isFinite(voltage) || voltage <= 0 ||
      !Number.isFinite(dodPct) || dodPct <= 0 || dodPct > 100 ||
      !Number.isFinite(effPct) || effPct <= 0 || effPct > 100
    ) {
      return { ok: false, message: "Enter valid values and calculate." };
    }

    return {
      ok: true,
      load,
      hours,
      voltage,
      dodPct,
      effPct,
      dod: dodPct / 100,
      eff: effPct / 100
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const requiredLoadWh = input.load * input.hours;
    const adjustedWh = requiredLoadWh / input.eff;
    const totalWh = adjustedWh / input.dod;
    const batteryAh = totalWh / input.voltage;

    const reserveMultiplier = totalWh / requiredLoadWh;
    const effectiveUsablePct = input.dodPct * input.effPct / 100;

    const efficiencyLossPct = 100 - input.effPct;
    const dodPressurePct = 100 - input.dodPct;
    const reservePressurePct = Math.min((reserveMultiplier - 1) * 100, 100);

    const metrics = [
      {
        label: "Reserve Pressure",
        value: reservePressurePct,
        displayValue: `${fmt(reserveMultiplier, 2)}x`
      },
      {
        label: "Efficiency Loss",
        value: efficiencyLossPct,
        displayValue: fmtPct(efficiencyLossPct)
      },
      {
        label: "Discharge Constraint",
        value: dodPressurePct,
        displayValue: fmtPct(dodPressurePct)
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(reservePressurePct, efficiencyLossPct, dodPressurePct),
      metrics,
      healthyMax: 20,
      watchMax: 45
    });

    let sizingClass = "Balanced Battery Design";
    if (batteryAh >= 400) sizingClass = "Large Battery Bank";
    else if (batteryAh >= 200) sizingClass = "Moderate Battery Bank";
    else if (batteryAh < 100) sizingClass = "Compact Battery Bank";

    let interpretation = `A ${fmtWatts(input.load)} load for ${fmtHours(input.hours)} requires ${fmtWh(requiredLoadWh)} of raw runtime energy. After applying ${fmtPct(input.effPct)} system efficiency and limiting discharge to ${fmtPct(input.dodPct)}, total required stored energy rises to about ${fmtWh(totalWh)}, or ${fmtAh(batteryAh)} at ${fmtVolts(input.voltage)}.`;

    if (batteryAh >= 400) {
      interpretation += ` This is a substantial battery requirement, so bank layout, conductor sizing, charging profile, and installation footprint become meaningful design constraints.`;
    } else if (reserveMultiplier > 1.5) {
      interpretation += ` A large portion of the final capacity is being driven by losses and discharge limits rather than load alone, so reserve policy is now a major sizing factor.`;
    } else {
      interpretation += ` The battery requirement is in a practical range, with losses and reserve constraints still staying proportionate to the runtime target.`;
    }

    let dominantConstraint = "";
    if (reservePressurePct >= efficiencyLossPct && reservePressurePct >= dodPressurePct && reservePressurePct > 20) {
      dominantConstraint = "Reserve pressure is the dominant limiter. The final bank size is being driven more by protection margins and usable-capacity rules than by the raw load itself.";
    } else if (efficiencyLossPct >= dodPressurePct && efficiencyLossPct > 15) {
      dominantConstraint = "Efficiency loss is the dominant limiter. Conversion losses are materially increasing required stored energy, so system design quality matters to final battery size.";
    } else if (dodPressurePct > 20) {
      dominantConstraint = "Discharge constraint is the dominant limiter. Limiting usable battery depth is preserving battery life, but it is increasing the required installed capacity.";
    } else {
      dominantConstraint = "The battery design is balanced. Runtime target, efficiency, and discharge strategy are all staying in a practical range.";
    }

    let guidance = "";
    if (batteryAh >= 400) {
      guidance = "Validate physical battery count, enclosure space, charging current, and conductor sizing before treating this as deployable. Large banks can become installation-limited quickly.";
    } else if (reserveMultiplier > 1.5) {
      guidance = "Review whether depth-of-discharge policy or conversion efficiency assumptions are intentionally conservative. Small changes there can materially reduce final battery size.";
    } else {
      guidance = "Battery sizing is in a workable range. Use this as the final power-pipeline baseline for battery count, charger sizing, and enclosure planning.";
    }

    return {
      ok: true,
      ...input,
      requiredLoadWh,
      adjustedWh,
      totalWh,
      batteryAh,
      reserveMultiplier,
      effectiveUsablePct,
      sizingClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function writeFlow(data) {
    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        designLoadWatts: data.load,
        runtimeHours: data.hours,
        voltage: data.voltage,
        dodPct: data.dodPct,
        effPct: data.effPct,
        requiredWh: data.totalWh,
        batteryAh: data.batteryAh,
        reserveMultiplier: data.reserveMultiplier,
        sizingClass: data.sizingClass,
        interpretation: data.interpretation,
        guidance: data.guidance
      }
    }));
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    hideComplete();
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      summaryRows: [
        { label: "Required Runtime Energy", value: fmtWh(data.requiredLoadWh) },
        { label: "Total Stored Energy Required", value: fmtWh(data.totalWh) },
        { label: "Battery Capacity", value: fmtAh(data.batteryAh) },
        { label: "Sizing Result", value: data.sizingClass }
      ],
      derivedRows: [
        { label: "Load", value: fmtWatts(data.load) },
        { label: "Runtime", value: fmtHours(data.hours) },
        { label: "System Voltage", value: fmtVolts(data.voltage) },
        { label: "Depth of Discharge", value: fmtPct(data.dodPct) },
        { label: "Efficiency", value: fmtPct(data.effPct) },
        { label: "Reserve Multiplier", value: `${fmt(data.reserveMultiplier, 2)}x` },
        { label: "Effective Usable Capacity", value: fmtPct(data.effectiveUsablePct, 1) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });

    writeFlow(data);
    showComplete();
  }

  function calculate() {
    const data = calculateModel();
    if (!data.ok) {
      renderError(data.message);
      return;
    }
    renderSuccess(data);
  }

  function reset() {
    applyDefaults();
    invalidate();
  }

  function bind() {
    ["load", "hours", "voltage", "dod", "efficiency"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    if (els.calc) els.calc.addEventListener("click", calculate);
    if (els.reset) els.reset.addEventListener("click", reset);
  }

  function init() {
    hideComplete();
    bind();
    renderFlowNote();
    invalidate();
  }

  window.addEventListener("DOMContentLoaded", init);
})();

function calc() {
  // TODO: implement calculate handler
}


window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});


function hasStoredAuth() {
  try {
    const k = Object.keys(localStorage).find((x) => x.startsWith("sb-"));
    if (!k) return false;
    const raw = JSON.parse(localStorage.getItem(k));
    return !!(
      raw?.access_token ||
      raw?.currentSession?.access_token ||
      (Array.isArray(raw) ? raw[0]?.access_token : null)
    );
  } catch {
    return false;
  }
}


function getUnlockedCategories() {
  try {
    const raw = localStorage.getItem("sl_unlocked_categories");
    if (!raw) return [];
    return raw.split(",").map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}


function unlockCategoryPage() {
  const body = document.body;
  const category = String(body?.dataset?.category || "").trim().toLowerCase();
  const signedIn = hasStoredAuth();
  const unlocked = getUnlockedCategories().includes(category);

  const lockedCard = document.getElementById("lockedCard");
  const toolCard = document.getElementById("toolCard");

  if (signedIn && unlocked) {
    if (lockedCard) lockedCard.style.display = "none";
    if (toolCard) toolCard.style.display = "";
    return true;
  }

  if (lockedCard) lockedCard.style.display = "";
  if (toolCard) toolCard.style.display = "none";
  return false;
}


function writeFlow(data) {
  ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP] || STEP, {
    category: CATEGORY,
    step: STEP,
    data
  });
}
