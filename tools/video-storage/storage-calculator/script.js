(() => {
  const CATEGORY = "video-storage";
  const STEP = "storage";
  const PREVIOUS_STEP = "bitrate";
  const NEXT_URL = "/tools/video-storage/retention-planner/";
  const LANE = "v1";

  const FLOW_KEYS = {
    bitrate: "scopedlabs:pipeline:video-storage:bitrate",
    storage: "scopedlabs:pipeline:video-storage:storage",
    retention: "scopedlabs:pipeline:video-storage:retention",
    raid: "scopedlabs:pipeline:video-storage:raid",
    survivability: "scopedlabs:pipeline:video-storage:survivability"
  };

  const LEGACY_STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const MbitPerSec_to_GiBperDay = (1e6 * 86400) / 8 / (1024 ** 3);

  const $ = (id) => document.getElementById(id);

  const els = {
    cams: $("cams"),
    bitrate: $("bitrate"),
    mode: $("mode"),
    motionPct: $("motionPct"),
    retention: $("retention"),
    overhead: $("overhead"),
    motionField: $("motionField"),
    nextStepRow: $("next-step-row"),
    continueBtn: $("continue"),
    flowNote: $("flow-note"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy")
  };

  function safeNumber(value, fallback = 0) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.safeNumber === "function"
    ) {
      return window.ScopedLabsAnalyzer.safeNumber(value, fallback);
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(v, min, max) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clamp === "function"
    ) {
      return window.ScopedLabsAnalyzer.clamp(v, min, max);
    }
    return Math.max(min, Math.min(max, v));
  }

  function fmtGiB(gib) {
    if (!Number.isFinite(gib)) return "—";
    if (gib < 1024) return `${gib.toFixed(2)} GiB`;
    return `${(gib / 1024).toFixed(2)} TiB`;
  }

  function syncMotion() {
    const isMotion = els.mode.value === "motion";
    if (els.motionField) els.motionField.style.display = isMotion ? "" : "none";
  }

  function hideNextStep() {
    if (els.nextStepRow) els.nextStepRow.style.display = "none";
  }

  function showNextStep() {
    if (els.nextStepRow) els.nextStepRow.style.display = "flex";
  }

  function clearStored() {
    try {
      sessionStorage.removeItem(FLOW_KEYS.storage);
    } catch {}
    try {
      const legacy = JSON.parse(sessionStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      if (legacy && legacy.category === CATEGORY && legacy.step === STEP) {
        sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {}
  }

  function clearAnalysisBlock() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function"
    ) {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
      return;
    }
    if (els.analysisCopy) {
      els.analysisCopy.style.display = "none";
      els.analysisCopy.innerHTML = "";
    }
  }

  function renderEmpty() {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    }
    clearAnalysisBlock();
  }

  function readPreviousFlow() {
    try {
      const primary = JSON.parse(sessionStorage.getItem(FLOW_KEYS.bitrate) || "null");
      if (primary && primary.category === CATEGORY) return primary;
    } catch {}

    try {
      const legacy = JSON.parse(sessionStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      if (legacy && legacy.category === CATEGORY && legacy.step === PREVIOUS_STEP) return legacy;
    } catch {}

    return null;
  }

  function importFromBitrate() {
    let source = null;
    let bitrate = null;
    const fromFlow = readPreviousFlow();

    if (window.SL_FLOW && typeof window.SL_FLOW.get === "function") {
      source = window.SL_FLOW.get("source");
      bitrate = window.SL_FLOW.get("bitrate");
    } else {
      const q = new URLSearchParams(window.location.search);
      source = q.get("source");
      bitrate = q.get("bitrate");
    }

    if (source === "bitrate" && bitrate) {
      els.bitrate.value = bitrate;

      if (
        window.ScopedLabsAnalyzer &&
        typeof window.ScopedLabsAnalyzer.renderFlowNote === "function"
      ) {
        window.ScopedLabsAnalyzer.renderFlowNote({
          flowEl: els.flowNote,
          category: CATEGORY,
          step: STEP,
          title: "System Context",
          intro:
            "Imported from Bitrate Estimator. This step converts the stream assumption into daily and retained storage requirements.",
          customRows: [
            { label: "Imported bitrate", value: `${bitrate} Mbps` }
          ]
        });
      } else if (els.flowNote) {
        els.flowNote.hidden = false;
        els.flowNote.textContent = "Imported from Bitrate Estimator. Review values and click Calculate.";
      }
      return;
    }

    if (!fromFlow || !els.flowNote) {
      if (els.flowNote) {
        els.flowNote.hidden = true;
        els.flowNote.innerHTML = "";
      }
      return;
    }

    const data = fromFlow.data || {};
    const importedBitrate = Number(data.bitrateMbps ?? data.bitrateMbpsPerCam ?? 0);

    if (importedBitrate > 0) {
      els.bitrate.value = importedBitrate.toFixed(2);
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Step 2 — Using Bitrate Estimator results:</strong><br>
      Imported bitrate: ${importedBitrate > 0 ? `${importedBitrate.toFixed(2)} Mbps` : "—"}
      <br><br>
      This step converts the stream assumption into daily and retained storage requirements so the next retention and RAID steps use a concrete capacity target.
    `;
  }

  function invalidate() {
    clearStored();
    hideNextStep();

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.invalidate === "function"
    ) {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        category: CATEGORY,
        step: STEP,
        lane: LANE,
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      renderEmpty();
    }
  }

  function buildInterpretation(status, dominantConstraint, totalRetentionGiB, retentionDays, cams) {
    if (status === "HEALTHY") {
      return `Storage demand remains in a manageable range for the current stream assumptions. The design is not yet leaning too hard on retention duration, fleet scale, or overhead reserve, so the next step can focus on policy and protection rather than fighting an oversized target.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Retention burden") {
        return `The desired retention window is starting to become the main storage driver. The plan can still work, but longer archive time is now contributing enough to require more deliberate sizing discipline.`;
      }

      if (dominantConstraint === "Fleet scale burden") {
        return `Camera count is amplifying storage demand meaningfully. Per-stream assumptions may look reasonable, but the aggregate fleet size is large enough that small bitrate changes can materially shift total required storage.`;
      }

      return `Overhead reserve is starting to matter more. The base storage math may close, but conservative planning margin is now contributing enough to change the final capacity target in a noticeable way.`;
    }

    if (dominantConstraint === "Retention burden") {
      return `The retention target is driving storage demand into a high-pressure range. Archive duration is no longer a background preference — it is now a primary capacity driver that should be justified against the broader design.`;
    }

    if (dominantConstraint === "Fleet scale burden") {
      return `The camera fleet itself is now the main reason storage demand is high. Even moderate per-camera rates are being multiplied into a large total requirement across the deployment.`;
    }

    return `Planning overhead is consuming enough additional capacity that the final storage requirement becomes materially heavier than the base ingest math alone would suggest.`;
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `Carry this storage requirement forward into Retention Planner. The next step is validating how the storage target maps to the retention promise and whether the design still holds with realistic margin.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Retention burden") {
        return `Review whether the full retention target is operationally necessary, or whether the design should add capacity before locking it in. The archive window is now one of the main reasons the storage plan is getting heavier.`;
      }

      if (dominantConstraint === "Fleet scale burden") {
        return `Validate the estimate at full deployment scale. Camera count is high enough that any future bitrate drift or camera additions could change the storage plan noticeably.`;
      }

      return `Keep using a conservative overhead model in the next step. The current requirement is still workable, but the reserve component is now large enough that weak assumptions would understate true capacity needs.`;
    }

    if (dominantConstraint === "Retention burden") {
      return `Reduce retention demand or increase planned capacity before moving forward if the design is already tight. The required archive window is currently the main reason storage demand is becoming difficult to manage.`;
    }

    if (dominantConstraint === "Fleet scale burden") {
      return `Treat the deployment as a large aggregate storage problem, not a per-camera estimate repeated many times. Fleet size is now a first-order design factor.`;
    }

    return `Use the higher storage requirement deliberately in retention planning. The overhead component is no longer minor enough to ignore in the downstream design.`;
  }

  function renderFallback(summaryRows, derivedRows, status, dominantConstraint, interpretation, guidance) {
    if (els.results) {
      els.results.innerHTML = summaryRows.concat(derivedRows).map((row) => `
        <div class="result-row">
          <span class="result-label">${row.label}</span>
          <span class="result-value">${row.value}</span>
        </div>
      `).join("");
    }

    if (els.analysisCopy) {
      els.analysisCopy.style.display = "";
      els.analysisCopy.innerHTML = `
        <div class="results-grid">
          <div class="result-row">
            <span class="result-label">Status</span>
            <span class="result-value">${status}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Dominant Constraint</span>
            <span class="result-value">${dominantConstraint}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Engineering Interpretation</span>
            <span class="result-value">${interpretation}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Actionable Guidance</span>
            <span class="result-value">${guidance}</span>
          </div>
        </div>
      `;
    }
  }

  function calc() {
    const cams = Math.max(0, Math.floor(safeNumber(els.cams.value, 0)));
    const bitrate = Math.max(0, safeNumber(els.bitrate.value, 0));
    const mode = els.mode.value;
    const motionPct = clamp(safeNumber(els.motionPct.value, 25), 0, 100);
    const retentionDays = Math.max(0, Math.floor(safeNumber(els.retention.value, 0)));
    const overheadPct = clamp(safeNumber(els.overhead.value, 15), 0, 60);

    if (cams <= 0) {
      if (els.results) {
        els.results.innerHTML = `<div class="result-row"><span class="result-label">Error</span><span class="result-value">Enter a camera count above 0.</span></div>`;
      }
      clearAnalysisBlock();
      hideNextStep();
      clearStored();
      return;
    }

    if (bitrate <= 0) {
      if (els.results) {
        els.results.innerHTML = `<div class="result-row"><span class="result-label">Error</span><span class="result-value">Enter a bitrate above 0 Mbps.</span></div>`;
      }
      clearAnalysisBlock();
      hideNextStep();
      clearStored();
      return;
    }

    const duty = mode === "motion" ? (motionPct / 100) : 1;
    const overheadMult = 1 + (overheadPct / 100);

    const perCamDayGiB = bitrate * MbitPerSec_to_GiBperDay * duty * overheadMult;
    const totalDayGiB = perCamDayGiB * cams;
    const totalRetentionGiB = totalDayGiB * retentionDays;

    const statusText =
      mode === "motion" && motionPct === 0
        ? "Motion mode selected with 0% activity (result will be 0)."
        : retentionDays === 0
          ? "Retention is 0 days (no storage required beyond daily use)."
          : overheadPct >= 30
            ? "Calculated with high overhead reserve — conservative plan."
            : "Calculated.";

    const retentionBurden = retentionDays / 30;
    const fleetScaleBurden = cams / 16;
    const overheadPressure = 1 + (overheadPct / 25);

    const metrics = [
      {
        label: "Retention burden",
        value: retentionBurden,
        displayValue: `${retentionDays} days`
      },
      {
        label: "Fleet scale burden",
        value: fleetScaleBurden,
        displayValue: `${cams} cams`
      },
      {
        label: "Overhead pressure",
        value: overheadPressure,
        displayValue: `${overheadPct.toFixed(0)}%`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Retention burden";

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.5
      });
      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Retention burden";
    }

    const dominantConstraintMap = {
      "Retention burden": "Retention burden",
      "Fleet scale burden": "Fleet scale burden",
      "Overhead pressure": "Overhead pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Retention burden";

    const summaryRows = [
      { label: "Cameras", value: String(cams) },
      { label: "Bitrate per Camera", value: `${bitrate.toFixed(2)} Mbps` },
      { label: "Retention", value: `${retentionDays} days` },
      { label: "Daily Storage Requirement", value: `${totalDayGiB.toFixed(2)} GiB/day` }
    ];

    const derivedRows = [
      { label: "Per-camera storage per day", value: `${fmtGiB(perCamDayGiB)} / day` },
      { label: "Total storage per day", value: `${fmtGiB(totalDayGiB)} / day` },
      { label: "Total retention storage", value: `${fmtGiB(totalRetentionGiB)} (${retentionDays} days)` },
      { label: "Planner note", value: statusText }
    ];

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      totalRetentionGiB,
      retentionDays,
      cams
    );

    const guidance = buildGuidance(
      status,
      dominantConstraint
    );

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderOutput === "function"
    ) {
      window.ScopedLabsAnalyzer.renderOutput({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        summaryRows,
        derivedRows,
        status,
        interpretation,
        dominantConstraint,
        guidance
      });
    } else {
      renderFallback(summaryRows, derivedRows, status, dominantConstraint, interpretation, guidance);
    }

    const params = new URLSearchParams({
      source: "storage",
      cams: String(cams),
      bitrate: String(bitrate),
      mode: String(mode),
      motionPct: String(motionPct),
      days: String(retentionDays),
      storage_per_day: totalDayGiB.toFixed(2),
      total_storage: totalRetentionGiB.toFixed(2),
      unit: "gib"
    });

    if (els.continueBtn) {
      els.continueBtn.href = NEXT_URL + "?" + params.toString();
    }

    try {
      const payload = {
        category: CATEGORY,
        step: STEP,
        data: {
          cams,
          bitrateMbps: Number(bitrate.toFixed(2)),
          mode,
          motionPct: Number(motionPct.toFixed(0)),
          retentionDays,
          overheadPct: Number(overheadPct.toFixed(0)),
          perCamDayGiB: Number(perCamDayGiB.toFixed(2)),
          totalDayGiB: Number(totalDayGiB.toFixed(2)),
          totalRetentionGiB: Number(totalRetentionGiB.toFixed(2)),
          status,
          dominantConstraint
        }
      };

      sessionStorage.setItem(FLOW_KEYS.storage, JSON.stringify(payload));
      sessionStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
    } catch {}

    showNextStep();
  }

  function reset() {
    els.cams.value = "1";
    els.bitrate.value = "4";
    els.mode.value = "continuous";
    els.motionPct.value = "25";
    els.retention.value = "30";
    els.overhead.value = "15";

    syncMotion();
    renderEmpty();
    hideNextStep();
    importFromBitrate();
  }

  function bind() {
    els.mode.addEventListener("change", () => {
      syncMotion();
      invalidate();
    });

    if (els.calc) els.calc.addEventListener("click", calc);
    if (els.reset) els.reset.addEventListener("click", reset);

    [els.cams, els.bitrate, els.motionPct, els.retention, els.overhead].forEach((el) => {
      if (el) el.addEventListener("input", invalidate);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const t = e.target;
        if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
          e.preventDefault();
          calc();
        }
      }
    });
  }

  function boot() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
    bind();
    reset();
  }

  window.addEventListener("DOMContentLoaded", boot);
})();
