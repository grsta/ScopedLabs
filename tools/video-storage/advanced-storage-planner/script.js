// Advanced Storage Planner — ScopedLabs
// Tool logic ONLY. Robust ID matching (supports bitrate vs avgBitrate, etc.)

document.addEventListener("DOMContentLoaded", () => {
  // ---- helpers
  const byId = (id) => document.getElementById(id);

  // Try a list of IDs and return the first found
  const pick = (...ids) => {
    for (const id of ids) {
      const el = byId(id);
      if (el) return el;
    }
    return null;
  };

  // Read a number safely
  const readNum = (el, fallback = 0) => {
    if (!el) return fallback;
    const v = Number(el.value);
    return Number.isFinite(v) ? v : fallback;
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const round = (v, d = 2) => {
    const p = Math.pow(10, d);
    return Math.round(v * p) / p;
  };

  // Mbps sustained over a day -> GB/day
  const mbpsToGBPerDay = (mbps) => (mbps * 86400) / 8 / 1024;

  const formatMbps = (mbps) => `${round(mbps, 1)} Mbps`;

  const formatStorageFromGB = (gb) => {
    if (!isFinite(gb) || gb < 0) return "—";
    if (gb >= 1024 * 1024) return `${round(gb / (1024 * 1024), 2)} PB`;
    if (gb >= 1024) return `${round(gb / 1024, 2)} TB`;
    return `${round(gb, 2)} GB`;
  };

  const formatDays = (days) => {
    if (!isFinite(days) || days < 0) return "—";
    if (days >= 100) return `${Math.round(days)} days`;
    return `${round(days, 1)} days`;
  };

  // ---- INPUTS (support both naming styles)
  const camsEl       = pick("cams", "cameraCount");
  const bitrateEl    = pick("avgBitrate", "bitrate"); // <-- key fix
  const modeEl       = pick("mode", "recordingMode");
  const motionPctEl  = pick("motionPct", "motionPercent");
  const retentionEl  = pick("retention", "retentionDays");
  const overheadEl   = pick("overhead", "overheadPct");
  const peakMultEl   = pick("peakMult", "peakMultiplier");
  const exportPctEl  = pick("exportPct", "exportConcurrency");
  const exportMinEl  = pick("exportMin", "exportDuration");

  // Buttons
  const calcBtn  = pick("calc", "calculate");
  const resetBtn = pick("reset", "resetBtn");

  // ---- OUTPUTS (support a couple common variants)
  const basePerDayEl     = pick("basePerDay", "baselinePerDay", "baselineDaily");
  const baseRetentionEl  = pick("baseRetention", "baselineRetention", "baselineTotal");
  const peakWriteEl      = pick("peakWrite", "peakWriteMbps");
  const exportBurstEl    = pick("exportBurst", "exportLoad", "exportBurstMbps");
  const effRetentionEl   = pick("effRetention", "effectiveRetention");
  const riskFlagsEl      = pick("riskFlags", "flags");
  const statusTextEl     = pick("statusText", "status");

  // If core items missing, don’t silently die — tell us.
  const mustHave = [
    ["cams", camsEl],
    ["bitrate", bitrateEl],
    ["mode", modeEl],
    ["motionPct", motionPctEl],
    ["retention", retentionEl],
    ["overhead", overheadEl],
    ["peakMult", peakMultEl],
    ["exportPct", exportPctEl],
    ["exportMin", exportMinEl],
    ["calcBtn", calcBtn],
    ["resetBtn", resetBtn],
  ];

  const missing = mustHave.filter(([, el]) => !el).map(([name]) => name);
  if (missing.length) {
    console.warn("Advanced Planner: missing elements:", missing);
    return;
  }

  // Optional outputs: if any are missing, we still compute and log instead of failing.
  const setText = (el, txt) => {
    if (el) el.textContent = txt;
  };

  const compute = () => {
    const cams = Math.max(1, Math.floor(readNum(camsEl, 1)));
    const avgBitrate = Math.max(0, readNum(bitrateEl, 0)); // Mbps per cam
    const retentionDays = Math.max(1, Math.floor(readNum(retentionEl, 1)));

    const overheadPct = clamp(readNum(overheadEl, 0), 0, 200);
    const overheadFactor = 1 + overheadPct / 100;

    const peakMult = Math.max(1, readNum(peakMultEl, 1));
    const exportPct = clamp(readNum(exportPctEl, 0), 0, 100);
    const exportMin = Math.max(0, Math.floor(readNum(exportMinEl, 0)));

    const mode = String(modeEl.value || "continuous").toLowerCase();
    const motionPct = clamp(readNum(motionPctEl, 0), 0, 100);
    const motionFactor = mode === "motion" ? (motionPct / 100) : 1;

    // Baseline avg Mbps (accounts for motion%)
    const baselineAvgMbps = cams * avgBitrate * motionFactor;

    // Nominal Mbps (full stream baseline reference)
    const nominalMbps = cams * avgBitrate;

    // Storage (baseline)
    const baselineGBPerDay = mbpsToGBPerDay(baselineAvgMbps) * overheadFactor;
    const baselineRetentionGB = baselineGBPerDay * retentionDays;

    // Stress loads
    const peakWriteMbps = nominalMbps * peakMult;

    const exportCams = cams * (exportPct / 100);
    const exportBurstMbps = exportCams * avgBitrate * peakMult;

    const stressTotalMbps = peakWriteMbps + exportBurstMbps;

    let effRetentionDays = retentionDays;
    let stressRatio = 1;
    if (nominalMbps > 0) {
      stressRatio = stressTotalMbps / nominalMbps;
      effRetentionDays = retentionDays / Math.max(1, stressRatio);
    } else {
      effRetentionDays = 0;
      stressRatio = Infinity;
    }

    // Risk flags
    const flags = [];
    const peakRatio = nominalMbps > 0 ? (peakWriteMbps / nominalMbps) : Infinity;
    const exportRatio = nominalMbps > 0 ? (exportBurstMbps / nominalMbps) : Infinity;

    if (peakRatio >= 1.5) flags.push("⚠ Peak saturation");
    if (exportRatio >= 0.35 && exportMin > 0 && exportPct > 0) flags.push("⚠ Export collision");
    if (effRetentionDays <= retentionDays * 0.85 && stressRatio > 1.2) flags.push("⚠ Retention compression");

    let status = "OK";
    if (stressRatio >= 1.75 || effRetentionDays <= retentionDays * 0.7) status = "High Risk";
    else if (stressRatio >= 1.25 || effRetentionDays <= retentionDays * 0.85) status = "Moderate";

    // Render outputs (if the elements exist)
    setText(basePerDayEl, formatStorageFromGB(baselineGBPerDay));
    setText(baseRetentionEl, formatStorageFromGB(baselineRetentionGB));
    setText(peakWriteEl, formatMbps(peakWriteMbps));
    setText(exportBurstEl, exportMin > 0 ? formatMbps(exportBurstMbps) : `${formatMbps(exportBurstMbps)} (0 min)`);
    setText(effRetentionEl, formatDays(effRetentionDays));
    setText(riskFlagsEl, flags.length ? flags.join(" • ") : "None");
    setText(statusTextEl, status);

    // Keep motion % field relevant
    motionPctEl.disabled = mode !== "motion";

    // Debug breadcrumb (helpful while wiring)
    console.log("Advanced Planner computed ✅", {
      cams, avgBitrate, retentionDays, overheadPct, peakMult, exportPct, exportMin,
      baselineGBPerDay, baselineRetentionGB, peakWriteMbps, exportBurstMbps, effRetentionDays, status
    });
  };

  const reset = () => {
    // Set sane defaults (you can adjust later)
    camsEl.value = "16";
    bitrateEl.value = "4";
    modeEl.value = "continuous";
    motionPctEl.value = "20";
    retentionEl.value = "30";
    overheadEl.value = "15";
    peakMultEl.value = "2";
    exportPctEl.value = "10";
    exportMinEl.value = "30";

    motionPctEl.disabled = true;

    setText(basePerDayEl, "—");
    setText(baseRetentionEl, "—");
    setText(peakWriteEl, "—");
    setText(exportBurstEl, "—");
    setText(effRetentionEl, "—");
    setText(riskFlagsEl, "—");
    setText(statusTextEl, "Enter values and calculate.");
  };

  calcBtn.addEventListener("click", (e) => {
    e.preventDefault();
    compute();
  });

  resetBtn.addEventListener("click", (e) => {
    e.preventDefault();
    reset();
  });

  // Update motion enable/disable immediately when mode changes
  modeEl.addEventListener("change", () => {
    const mode = String(modeEl.value || "continuous").toLowerCase();
    motionPctEl.disabled = mode !== "motion";
  });

  // Initialize
  motionPctEl.disabled = String(modeEl.value || "continuous").toLowerCase() !== "motion";
  console.log("Advanced Storage Planner script loaded ✅");
});
