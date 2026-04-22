(() => {
  "use strict";

  const CATEGORY = "video-storage";
  const STEP = "bitrate";
  const LANE = "v1";
  const NEXT_URL = "/tools/video-storage/storage-calculator/";

  const FLOW_KEYS = {
    bitrate: "scopedlabs:pipeline:video-storage:bitrate",
    storage: "scopedlabs:pipeline:video-storage:storage",
    retention: "scopedlabs:pipeline:video-storage:retention",
    raid: "scopedlabs:pipeline:video-storage:raid",
    survivability: "scopedlabs:pipeline:video-storage:survivability"
  };

  const $ = (id) => document.getElementById(id);

  const els = {
    res: $("res"),
    w: $("w"),
    h: $("h"),
    fps: $("fps"),
    codec: $("codec"),
    scene: $("scene"),
    quality: $("quality"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue")
  };

  function safeNumber(value, fallback = 0) {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.safeNumber === "function") {
      return window.ScopedLabsAnalyzer.safeNumber(value, fallback);
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
  }

  function clearAnalysisBlock() {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function") {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
    } else if (els.analysisCopy) {
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

  function renderFlowNote() {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.renderFlowNote === "function") {
      window.ScopedLabsAnalyzer.renderFlowNote({
        flowEl: els.flowNote,
        flowKey: FLOW_KEYS[STEP],
        category: CATEGORY,
        step: STEP,
        lane: LANE,
        title: "Flow Context",
        intro:
          "This is the first step of the Video & Storage pipeline. Establish the stream bitrate first so storage, retention, RAID impact, and survivability are all based on the same bandwidth assumption.",
        customRows: null
      });
      return;
    }

    if (els.flowNote) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
    }
  }

  function syncResolutionFields() {
    if (!els.res) return;

    if (els.res.value !== "custom") {
      const [rw, rh] = els.res.value.split("x").map(Number);
      els.w.value = rw;
      els.h.value = rh;
    }
  }

  function codecFactor(codec) {
    if (codec === "h265") return 0.70;
    if (codec === "vp9") return 0.75;
    if (codec === "av1") return 0.60;
    return 1.00;
  }

  function sceneFactor(scene) {
    if (scene === "low") return 0.75;
    if (scene === "high") return 1.35;
    return 1.00;
  }

  function qualityFactor(q) {
    if (q === "conservative") return 1.25;
    if (q === "aggressive") return 0.80;
    return 1.00;
  }

  function buildInterpretation(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return "Estimated bitrate remains in a manageable range for the selected resolution, frame rate, and codec. This gives the rest of the pipeline a clean planning baseline without putting unusual pressure on storage or transport yet.";
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Scene motion complexity") {
        return "Scene behavior is starting to drive bitrate more than the base image format alone. The stream may still be workable, but motion-heavy conditions now have enough leverage to widen the real operating range.";
      }

      if (dominantConstraint === "Frame density burden") {
        return "The combination of pixel count and frame rate is pushing bitrate upward. Storage planning should assume the stream is now more sensitive to tuning choices rather than relying on a casual rule-of-thumb.";
      }

      return "The selected quality posture is leaning toward a heavier stream. That can be valid, but it means the next storage step should be based on the upper side of the estimate rather than the midpoint alone.";
    }

    if (dominantConstraint === "Scene motion complexity") {
      return "Motion-driven bitrate pressure is high enough that average-state assumptions become less trustworthy. Real-world scene changes are likely to push the stream toward the top end of the modeled range often enough to matter.";
    }

    if (dominantConstraint === "Frame density burden") {
      return "The image format itself is now the main bitrate driver. High pixel count combined with frame rate is creating a stream that will materially increase downstream storage and transport burden if left unchanged.";
    }

    return "The chosen quality posture is producing a high-bitrate stream expectation. The result may be technically acceptable, but the cost is that storage and retention planning now need more deliberate headroom.";
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return "Use the estimate as the planning bitrate and carry it into storage sizing. Keep the suggested range in mind so the next step does not rely on a single overly-optimistic number.";
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Scene motion complexity") {
        return "Validate the stream under realistic scene activity before locking the design. Motion complexity is now influential enough that live encoder behavior matters more than a static assumption.";
      }

      if (dominantConstraint === "Frame density burden") {
        return "Review whether frame rate, resolution, or codec choice can be tuned more efficiently before scaling the design. Even a small change here can materially improve storage outcomes later.";
      }

      return "Carry the upper suggested range into the storage step instead of the midpoint alone. The current stream has enough bitrate pressure that conservative downstream planning is justified.";
    }

    if (dominantConstraint === "Frame density burden") {
      return "Reduce stream burden before finalizing the design if storage, uplink, or retention targets are tight. Resolution, frame rate, or codec choice should be reviewed deliberately.";
    }

    if (dominantConstraint === "Scene motion complexity") {
      return "Use field validation or worst-case bitrate assumptions before trusting this stream at scale. Motion behavior is currently too influential to ignore.";
    }

    return "Treat this as a high-bitrate planning case. The remaining pipeline should assume the heavier side of the estimated range unless the stream is intentionally tuned down.";
  }

  function invalidateResult() {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.invalidate === "function") {
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

    hideContinue();
  }

  function renderFallback(summaryRows, derivedRows, status, dominantConstraint, interpretation, guidance) {
    if (els.results) {
      els.results.innerHTML = `
        ${summaryRows.map((row) => `
          <div class="result-row">
            <span class="result-label">${row.label}</span>
            <span class="result-value">${row.value}</span>
          </div>
        `).join("")}
        ${derivedRows.map((row) => `
          <div class="result-row">
            <span class="result-label">${row.label}</span>
            <span class="result-value">${row.value}</span>
          </div>
        `).join("")}
      `;
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

  function calculate() {
    syncResolutionFields();

    const res = els.res.value;
    let w = safeNumber(els.w.value, NaN);
    let h = safeNumber(els.h.value, NaN);
    const fps = safeNumber(els.fps.value, NaN);
    const codec = els.codec.value;
    const scene = els.scene.value;
    const quality = els.quality.value;

    if (res !== "custom") {
      const [rw, rh] = res.split("x").map(Number);
      w = rw;
      h = rh;
      els.w.value = rw;
      els.h.value = rh;
    }

    if (
      !Number.isFinite(w) || w <= 0 ||
      !Number.isFinite(h) || h <= 0 ||
      !Number.isFinite(fps) || fps <= 0
    ) {
      if (els.results) {
        els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      }
      clearAnalysisBlock();
      hideContinue();
      return;
    }

    const pixels = Math.max(1, w * h);
    const megapixels = pixels / 1_000_000;
    const bpppf = 0.07;

    const est =
      (pixels * fps * bpppf *
        sceneFactor(scene) *
        qualityFactor(quality) *
        codecFactor(codec)) / 1_000_000;

    const overhead = 1.10;
    const bitrate = est * overhead;
    const low = bitrate * 0.8;
    const high = bitrate * 1.25;

    const frameDensityPressure = (megapixels * fps) / 30;
    const scenePressure = sceneFactor(scene);
    const qualityPressure = qualityFactor(quality);

    const metrics = [
      {
        label: "Frame Density Burden",
        value: frameDensityPressure,
        displayValue: `${megapixels.toFixed(2)} MP @ ${fps.toFixed(0)} fps`
      },
      {
        label: "Scene Motion Complexity",
        value: scenePressure,
        displayValue: scene.toUpperCase()
      },
      {
        label: "Quality Bias Pressure",
        value: qualityPressure,
        displayValue: quality.toUpperCase()
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Frame Density Burden";

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.resolveStatus === "function") {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.25,
        watchMax: 2.25
      });

      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Frame Density Burden";
    } else {
      const dominant = metrics.reduce((best, current) =>
        Number(current.value) > Number(best.value) ? current : best
      );
      dominantLabel = dominant.label;

      if (Number(dominant.value) > 2.25) status = "RISK";
      else if (Number(dominant.value) > 1.25) status = "WATCH";
    }

    const dominantConstraintMap = {
      "Frame Density Burden": "Frame density burden",
      "Scene Motion Complexity": "Scene motion complexity",
      "Quality Bias Pressure": "Quality bias pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Frame density burden";

    const interpretation = buildInterpretation(status, dominantConstraint);
    const guidance = buildGuidance(status, dominantConstraint);

    const summaryRows = [
      { label: "Resolution", value: `${Math.round(w)}×${Math.round(h)}` },
      { label: "Frame Rate", value: `${fps.toFixed(0)} fps` },
      { label: "Codec", value: codec.toUpperCase() },
      { label: "Scene", value: scene.toUpperCase() }
    ];

    const derivedRows = [
      { label: "Quality Target", value: quality.toUpperCase() },
      { label: "Estimated Bitrate", value: `${bitrate.toFixed(2)} Mbps` },
      { label: "Suggested Range", value: `${low.toFixed(2)} – ${high.toFixed(2)} Mbps` },
      { label: "Planning Basis", value: "Rule-of-thumb stream estimate" }
    ];

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.renderOutput === "function") {
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
      renderFallback(
        summaryRows,
        derivedRows,
        status,
        dominantConstraint,
        interpretation,
        guidance
      );
    }

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.writeFlow === "function") {
      window.ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP] || STEP, {
        category: CATEGORY,
        step: STEP,
        data: {
          resolution: `${Math.round(w)}x${Math.round(h)}`,
          width: Math.round(w),
          height: Math.round(h),
          fps: Number(fps.toFixed(0)),
          codec,
          scene,
          quality,
          bitrateMbps: Number(bitrate.toFixed(2)),
          minBitrateMbps: Number(low.toFixed(2)),
          maxBitrateMbps: Number(high.toFixed(2)),
          status,
          dominantConstraint
        }
      });
    }

    showContinue();
  }

  function reset() {
    els.res.value = "1920x1080";
    els.w.value = 1920;
    els.h.value = 1080;
    els.fps.value = 15;
    els.codec.value = "h264";
    els.scene.value = "med";
    els.quality.value = "balanced";
    renderEmpty();
    hideContinue();
    renderFlowNote();
  }

  function bindInvalidation() {
    [els.res, els.w, els.h, els.fps, els.codec, els.scene, els.quality].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidateResult);
      el.addEventListener("change", invalidateResult);
    });

    if (els.res) {
      els.res.addEventListener("change", syncResolutionFields);
    }
  }

  function init() {
    hideContinue();
    renderEmpty();
    renderFlowNote();
    bindInvalidation();

    if (els.calc) els.calc.addEventListener("click", calculate);
    if (els.reset) els.reset.addEventListener("click", reset);
    if (els.continueBtn) {
      els.continueBtn.addEventListener("click", () => {
        window.location.href = NEXT_URL;
      });
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
    init();
  });
})();