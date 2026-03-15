const volts = document.getElementById("volts");
const pf = document.getElementById("pf");
const watts = document.getElementById("watts");
const va = document.getElementById("va");

const outWatts = document.getElementById("outWatts");
const outVA = document.getElementById("outVA");
const outAmps = document.getElementById("outAmps");
const note = document.getElementById("note");

const FLOW_KEY = "scopedlabs:pipeline:last-result";

const continueBtn = document.getElementById("continueBtn");

function setBlank() {
  outWatts.textContent = "--";
  outVA.textContent = "--";
  outAmps.textContent = "--";
}

function n(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function fmtNum(v, decimals = 0) {
  if (!Number.isFinite(v)) return "--";
  return v.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function savePipelineResult(payload) {
  try {
    const wrapped = {
      category: "power",
      step: "va-watts-amps",
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
    if (parsed && parsed.category === "power" && parsed.step === "va-watts-amps") {
      sessionStorage.removeItem(FLOW_KEY);
    }
  } catch (err) {
    console.warn("Could not invalidate pipeline payload:", err);
  }
}

function interpretation(payload) {
  const {
    volts,
    amps,
    watts,
    designWatts20,
    continuousWatts125,
    branch80Watts,
    utilizationPct80,
  } = payload;

  const messages = [];
  messages.push("Single-phase formulas: W = VA × PF, A = VA ÷ V.");

  if (Number.isFinite(utilizationPct80)) {
    if (utilizationPct80 > 100) {
      messages.push(
        `At ${fmtNum(volts)} V, this load exceeds a simple 80% continuous-planning threshold for a ${fmtNum(
          amps,
          2
        )} A-equivalent draw.`
      );
    } else if (utilizationPct80 > 80) {
      messages.push(
        `This load is approaching typical continuous-use planning limits. Leave room for startup surge and future expansion.`
      );
    } else {
      messages.push(
        `This load is moderate for branch planning, but design should still include future growth and inverter/UPS losses.`
      );
    }
  }

  messages.push(
    `Planning reference values: +20% growth headroom ≈ ${fmtNum(
      designWatts20
    )} W, and a 125% continuous-design load ≈ ${fmtNum(continuousWatts125)} W.`
  );

  messages.push(
    `At an 80% continuous-load planning threshold, a nominal branch-equivalent load would be about ${fmtNum(
      branch80Watts
    )} W at ${fmtNum(volts)} V.`
  );

  return messages.join(" ");
}

document.getElementById("calc").onclick = () => {
  const V = n(volts.value);
  const PF = n(pf.value);
  const W = n(watts.value);
  const VAin = n(va.value);

  if (V <= 0) {
    note.textContent = "Voltage must be greater than 0.";
    setBlank();
    invalidatePipelineResult();
    return;
  }

  if (PF < 0.5 || PF > 1.0) {
    note.textContent = "Power Factor must be between 0.5 and 1.0.";
    setBlank();
    invalidatePipelineResult();
    return;
  }

  if (W > 0 && VAin > 0) {
    note.textContent = "Enter Watts OR VA (not both).";
    setBlank();
    invalidatePipelineResult();
    return;
  }

  let finalWatts = 0;
  let finalVA = 0;

  if (W > 0) {
    finalWatts = W;
    finalVA = W / PF;
  } else if (VAin > 0) {
    finalVA = VAin;
    finalWatts = VAin * PF;
  } else {
    note.textContent = "Enter Watts OR VA.";
    setBlank();
    invalidatePipelineResult();
    return;
  }

  const amps = finalVA / V;

  // Added design-oriented values
  const kw = finalWatts / 1000;
  const designWatts20 = finalWatts * 1.2;
  const continuousWatts125 = finalWatts * 1.25;
  const designVA20 = finalVA * 1.2;
  const branch80Watts = V * amps * 0.8 * PF;
  const utilizationPct80 = branch80Watts > 0 ? (finalWatts / branch80Watts) * 100 : 0;

  outWatts.textContent = fmtNum(finalWatts) + " W";
  outVA.textContent = fmtNum(finalVA) + " VA";
  outAmps.textContent = fmtNum(amps, 2) + " A";

  const payload = {
    volts: V,
    powerFactor: PF,
    watts: finalWatts,
    va: finalVA,
    amps,
    kw,
    designWatts20,
    continuousWatts125,
    designVA20,
    branch80Watts,
    utilizationPct80,
    baseLoadKw: kw,
    loadWatts: finalWatts,
  };

  savePipelineResult(payload);
  note.textContent = interpretation(payload);
};

document.getElementById("reset").onclick = () => {
  volts.value = 120;
  pf.value = 0.90;
  watts.value = "";
  va.value = "";
  setBlank();
  note.textContent = "Enter Watts OR VA, then press Calculate.";
  invalidatePipelineResult();
};

["volts", "pf", "watts", "va"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", invalidatePipelineResult);
});

setBlank();
console.log("VA/Watts/Amps tool loaded");