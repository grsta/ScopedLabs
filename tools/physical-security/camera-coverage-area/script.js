(() => {
  const FLOW_KEYS = {
    scene: "scopedlabs:pipeline:physical-security:scene-illumination",
    mount: "scopedlabs:pipeline:physical-security:mounting-height",
    fov: "scopedlabs:pipeline:physical-security:field-of-view",
    area: "scopedlabs:pipeline:physical-security:camera-coverage-area",
    spacing: "scopedlabs:pipeline:physical-security:camera-spacing",
    blind: "scopedlabs:pipeline:physical-security:blind-spot-check",
    pixel: "scopedlabs:pipeline:physical-security:pixel-density",
    lens: "scopedlabs:pipeline:physical-security:lens-selection",
    face: "scopedlabs:pipeline:physical-security:face-recognition-range",
    plate: "scopedlabs:pipeline:physical-security:license-plate-range"
  };

  const CATEGORY = "physical-security";
  const LANE = "v1";
  const STEP = "camera-coverage-area";
  const PREVIOUS_STEP = "field-of-view";

  const $ = (id) => document.getElementById(id);

  const els = {
    hfov: $("hfov"),
    vfov: $("vfov"),
    dist: $("dist"),
    ov: $("ov"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    assistant: $("coverageAssistant"),
    flowNote: $("flow-note"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  const DEFAULTS = {
    hfov: 90,
    vfov: 55,
    dist: 60,
    ov: 15
  };

  function num(value, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(value, fallback);
  }

  function deg2rad(deg) {
    return (deg * Math.PI) / 180;
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtFt(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} ft` : "—";
  }

  function fmtSqFt(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} sq ft` : "—";
  }

  function fmtPct(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

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
      return raw
        .split(",")
        .map((x) => String(x).trim().toLowerCase())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  function unlockCategoryPage() {
    const category = String(document.body?.dataset?.category || "").trim().toLowerCase();
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }

  function classifyOverlap(ovPct) {
    if (ovPct < 10) return "Low Overlap";
    if (ovPct <= 25) return "Balanced Overlap";
    return "High Overlap";
  }

  function classifyCoverageEfficiency(effAreaRatioPct) {
    if (effAreaRatioPct < 65) return "Heavy Coverage Reserve";
    if (effAreaRatioPct < 85) return "Practical Coverage Reserve";
    return "Minimal Coverage Reserve";
  }

  function overlapInterpretation(overlapClass) {
    if (overlapClass === "Low Overlap") {
      return "Low overlap maximizes individual camera footprint, but increases the chance of soft gaps between adjacent views.";
    }
    if (overlapClass === "Balanced Overlap") {
      return "Balanced overlap is usually the best planning range for continuous scene coverage without wasting too much usable width.";
    }
    return "High overlap improves continuity and handoff between cameras, but reduces usable coverage efficiency and can increase camera count.";
  }

  function reserveGuidance(effWidthRatioPct) {
    if (effWidthRatioPct < 70) {
      return "Usable width drops quickly once usable coverage reserve gets aggressive. This is appropriate when continuity matters more than raw coverage efficiency.";
    }
    if (effWidthRatioPct < 90) {
      return "This is a healthy reserve range for many practical layouts. You preserve usable width while still protecting against blind edges.";
    }
    return "Very little width is being held back as usable coverage reserve. Coverage efficiency is high, but spacing tolerance between cameras will be tighter.";
  }

  function clearDownstream() {
    [
      FLOW_KEYS.spacing,
      FLOW_KEYS.blind,
      FLOW_KEYS.pixel,
      FLOW_KEYS.lens,
      FLOW_KEYS.face,
      FLOW_KEYS.plate,
      "scopedlabs:pipeline:last-result"
    ].forEach((key) => {
      try {
        sessionStorage.removeItem(key);
      } catch {}
    });
  }

  let flowInputsImported = false;
  const importedFlowValues = {};
  const manualFlowOverrides = {};

  function cleanOverrideNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatOverrideValue(field, value) {
    const number = cleanOverrideNumber(value);
    if (number === null) return "n/a";

    if (field === "dist") return number.toFixed(1).replace(/\.0$/, "") + " ft";
    if (field === "hfov") return Math.round(number) + "&deg;";

    return String(number);
  }

  function overrideLabel(field) {
    if (field === "dist") return "Target distance";
    if (field === "hfov") return "Horizontal FOV";
    return field;
  }

  function captureImportedFlowValue(field, value) {
    const number = cleanOverrideNumber(value);
    if (number === null) return;
    if (!(field in importedFlowValues)) importedFlowValues[field] = number;
  }

  function canApplyFlowInputs() {
    if (flowInputsImported) return false;
    flowInputsImported = true;
    return true;
  }

  function markFlowInputOverride(field) {
    if (!(field in importedFlowValues)) return;

    const el = els[field];
    if (!el) return;

    const current = cleanOverrideNumber(el.value);
    const imported = cleanOverrideNumber(importedFlowValues[field]);

    if (current === null || imported === null) return;

    if (Math.abs(current - imported) > 0.01) {
      manualFlowOverrides[field] = {
        field,
        label: overrideLabel(field),
        imported,
        current
      };
    } else {
      delete manualFlowOverrides[field];
    }
  }

  function resetFlowOverrideState() {
    flowInputsImported = false;
    Object.keys(importedFlowValues).forEach((key) => delete importedFlowValues[key]);
    Object.keys(manualFlowOverrides).forEach((key) => delete manualFlowOverrides[key]);
  }

  function getManualOverrideMetadata(data) {
    return Object.keys(manualFlowOverrides).map((field) => {
      const imported = importedFlowValues[field];
      const current = data && field in data ? data[field] : cleanOverrideNumber(els[field]?.value);

      return {
        field,
        label: overrideLabel(field),
        imported,
        current,
        importedDisplay: formatOverrideValue(field, imported),
        currentDisplay: formatOverrideValue(field, current)
      };
    });
  }

  function renderManualOverrideNote() {
    const overrides = Object.keys(manualFlowOverrides);

    if (!overrides.length) return "";

    const text = overrides
      .map((field) => {
        const item = manualFlowOverrides[field];
        return item.label + " changed from " + formatOverrideValue(field, item.imported) + " to " + formatOverrideValue(field, item.current);
      })
      .join(" | ");

    return '<div class="flow-override-note" role="note" aria-label="Manual override warning"><strong>Manual override active:</strong> ' + text + '. Results are valid for this local what-if branch.</div>';
  }

  function refreshManualOverrideBanner() {
    if (!els.flowNote) return;

    const existing = els.flowNote.querySelector(".flow-override-note");
    if (existing) existing.remove();

    const note = renderManualOverrideNote();
    if (note) els.flowNote.insertAdjacentHTML("beforeend", note);
  }

  function applyDefaults() {
    els.hfov.value = String(DEFAULTS.hfov);
    els.vfov.value = String(DEFAULTS.vfov);
    els.dist.value = String(DEFAULTS.dist);
    els.ov.value = String(DEFAULTS.ov);
  }

  function renderFlowNote() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEYS.area,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      title: "Imported Assumptions",
      intro: "Values carried into this step from the previous design stage."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const data = flow.data || {};
    const sceneWidth = num(data.sceneWidth, 0);
    const dist = num(data.dist, 0);
    const hfov = num(data.hfov, 0);
    const fitClass = data.fitClass || "";

    captureImportedFlowValue("dist", dist);
    captureImportedFlowValue("hfov", hfov);

    if (canApplyFlowInputs()) {
      if (Number.isFinite(dist) && dist > 0) els.dist.value = String(Math.round(dist));
      if (Number.isFinite(hfov) && hfov > 0) els.hfov.value = String(Math.round(hfov));
    }

    refreshManualOverrideBanner();

    const parts = [];
    if (sceneWidth > 0) parts.push(`Scene width: <strong>${fmtFt(sceneWidth)}</strong>`);
    if (dist > 0) parts.push(`Distance: <strong>${fmtFt(dist)}</strong>`);
    if (hfov > 0) parts.push(`HFOV: <strong>${fmt(hfov, 1)}°</strong>`);
    if (fitClass) parts.push(`Fit class: <strong>${fitClass}</strong>`);

    if (parts.length) {
      els.flowNote.hidden = false;
      els.flowNote.innerHTML = `
        <strong>Imported Assumptions</strong><br>
        ${parts.join(" | ")}
      `;
    }
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) {
      sessionStorage.removeItem(FLOW_KEYS.area);
      clearDownstream();
    }

    renderCoverageAssistantPrompt();

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      flowKey: FLOW_KEYS.area,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter valid values and press Calculate."
    });

    renderFlowNote();
  }

  function getInputs() {
    const hfov = num(els.hfov.value);
    const vfov = num(els.vfov.value);
    const dist = num(els.dist.value);
    const ovPct = num(els.ov.value);

    if (
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(vfov) || vfov <= 0 || vfov >= 180 ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(ovPct) || ovPct < 0 || ovPct > 95
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, hfov, vfov, dist, ovPct };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const ov = input.ovPct / 100;

    const halfW = Math.tan(deg2rad(input.hfov / 2)) * input.dist;
    const halfH = Math.tan(deg2rad(input.vfov / 2)) * input.dist;

    const width = halfW * 2;
    const height = halfH * 2;

    const effWidth = width * (1 - ov);
    const effHeight = height;

    const area = width * height;
    const effArea = effWidth * effHeight;

    const widthRetentionPct = width > 0 ? (effWidth / width) * 100 : 0;
    const areaRetentionPct = area > 0 ? (effArea / area) * 100 : 0;
    const reserveLossPct = 100 - areaRetentionPct;

    const overlapClass = classifyOverlap(input.ovPct);
    const efficiencyClass = classifyCoverageEfficiency(areaRetentionPct);

    const metrics = [
      { label: "Coverage Reserve Pressure", value: reserveLossPct, displayValue: fmtPct(reserveLossPct, 1) },
      { label: "Width Retention Loss", value: 100 - widthRetentionPct, displayValue: fmtPct(100 - widthRetentionPct, 1) },
      { label: "Area Retention Loss", value: 100 - areaRetentionPct, displayValue: fmtPct(100 - areaRetentionPct, 1) }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(reserveLossPct, 100 - widthRetentionPct, 100 - areaRetentionPct),
      metrics,
      healthyMax: 20,
      watchMax: 35
    });

    const interpretationCore = overlapInterpretation(overlapClass);
    const guidanceCore = reserveGuidance(widthRetentionPct);

    let dominantConstraint = "";
    if (reserveLossPct >= 35) {
      dominantConstraint = "Reserve pressure is the dominant limiter. Too much usable scene area is being held back as reserve, which can drive camera count and reduce layout efficiency.";
    } else if (reserveLossPct >= 20) {
      dominantConstraint = "Coverage efficiency is the dominant limiter. The reserve strategy is still workable, but it is beginning to compress usable scene width enough to affect downstream spacing.";
    } else {
      dominantConstraint = "Field geometry is balanced. Most of the lens footprint remains usable after reserve is applied, which gives the next spacing step a healthier starting point.";
    }

    const interpretation = `At ${fmtFt(input.dist)}, the modeled lens footprint is about ${fmtFt(width)} wide by ${fmtFt(height)} high, producing ${fmtSqFt(area)} of raw area. After reserving ${fmtPct(input.ovPct)} as usable coverage margin, effective usable width drops to ${fmtFt(effWidth)} while vertical coverage remains ${fmtFt(effHeight)}, leaving about ${fmtSqFt(effArea)} of usable scene coverage. ${interpretationCore}`;

    const guidance = `${guidanceCore} Continue to Camera Spacing next so you can translate this usable width into actual camera-to-camera placement.`;

    return {
      ok: true,
      ...input,
      ov,
      width,
      height,
      area,
      effWidth,
      effHeight,
      effArea,
      widthRetentionPct,
      areaRetentionPct,
      reserveLossPct,
      overlapClass,
      efficiencyClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function updateActiveAreaFromCoverage(data) {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.updateActiveAreaResult !== "function") return;

    api.updateActiveAreaResult({
      status: "IN PROGRESS",
      distanceToTargetPlaneFt: data.dist,
      assumedHfovDeg: data.hfov,
      verticalFovDeg: data.vfov,
      usableCoverageReservePct: data.ovPct,
      coverageReservePct: data.ovPct,
      overlapTargetPct: data.ovPct,
      rawCoverageWidthFt: data.width,
      rawCoverageHeightFt: data.height,
      rawCoverageAreaSqFt: data.area,
      effectiveCoverageWidthFt: data.effWidth,
      effectiveCoverageHeightFt: data.effHeight,
      effectiveCoverageAreaSqFt: data.effArea,
      widthRetentionPct: data.widthRetentionPct,
      areaRetentionPct: data.areaRetentionPct,
      reserveLossPct: data.reserveLossPct,
      coverageOverlapClass: data.overlapClass,
      coverageEfficiencyClass: data.efficiencyClass,
      coverageStatus: data.status,
      coverageInterpretation: data.interpretation,
      coverageDominantConstraint: data.dominantConstraint,
      coverageGuidance: data.guidance,
      coverageUpdatedAt: new Date().toISOString()
    });
  }

  

  function writeFlow(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.area, {
      category: CATEGORY,
      step: STEP,
      data: {
        hfov: data.hfov,
        vfov: data.vfov,
        dist: data.dist,
        ov: data.ov,
        ovPct: data.ovPct,
        usableCoverageReservePct: data.ovPct,
        coverageReservePct: data.ovPct,
        width: data.width,
        height: data.height,
        area: data.area,
        effWidth: data.effWidth,
        effHeight: data.effHeight,
        effArea: data.effArea,
        widthRetentionPct: data.widthRetentionPct,
        areaRetentionPct: data.areaRetentionPct,
        reserveLossPct: data.reserveLossPct,
        overlapClass: data.overlapClass,
        efficiencyClass: data.efficiencyClass,
        interpretation: data.interpretation,
        guidance: data.guidance,
        sourceMode: manualOverrideMeta.length ? "manual-override" : "pipeline",
        manualOverrides: manualOverrideMeta
      }
    });
  

    updateActiveAreaFromCoverage(data);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function statusClassName(status) {
    const value = String(status || "").trim().toLowerCase();
    if (value === "risk") return "risk";
    if (value === "watch") return "watch";
    return "healthy";
  }

  function coverageAssistantTitle(data) {
    if (data.reserveLossPct >= 35) return "Reserve is heavily reducing usable coverage.";
    if (data.reserveLossPct >= 20) return "Usable coverage is workable but reserve is starting to matter.";
    return "Usable coverage is ready for spacing validation.";
  }

  function coverageFootprintSvg(data) {
    const reservePct = Math.max(0, Math.min(Number(data?.ovPct) || 0, 95));
    const retainedPct = Math.max(0, Math.min(Number(data?.widthRetentionPct) || 0, 100));
    const boxX = 72;
    const boxY = 86;
    const boxW = 656;
    const boxH = 122;
    const usableW = Math.max(4, boxW * (retainedPct / 100));
    const usableX = boxX + (boxW - usableW) / 2;
    const reserveW = Math.max(0, usableX - boxX);
    const cameraX = boxX + boxW / 2;
    const cameraY = 44;

    return '<svg viewBox="0 0 800 260" role="img" aria-label="Coverage reserve visualization">' +
      '<defs>' +
        '<linearGradient id="coverageRaw" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0%" stop-color="rgba(125,255,152,.035)" />' +
          '<stop offset="100%" stop-color="rgba(125,255,152,.10)" />' +
        '</linearGradient>' +
        '<linearGradient id="coverageReserve" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(255,211,79,.11)" />' +
          '<stop offset="100%" stop-color="rgba(255,211,79,.24)" />' +
        '</linearGradient>' +
      '</defs>' +
      '<text x="72" y="28" fill="rgba(226,232,240,.86)" font-size="17" font-weight="900">Raw footprint vs usable coverage</text>' +
      '<text x="72" y="50" fill="rgba(226,232,240,.56)" font-size="12">Reserve trims the raw FOV footprint before Camera Spacing uses the width.</text>' +
      '<circle cx="' + cameraX.toFixed(1) + '" cy="' + cameraY + '" r="8" fill="rgba(8,18,12,.96)" stroke="rgba(125,255,152,.86)" stroke-width="1.7" />' +
      '<path d="M ' + cameraX.toFixed(1) + ' ' + (cameraY + 10) + ' L ' + boxX + ' ' + boxY + ' L ' + (boxX + boxW) + ' ' + boxY + ' Z" fill="rgba(125,255,152,.035)" stroke="rgba(125,255,152,.22)" stroke-width="1" />' +
      '<rect x="' + boxX + '" y="' + boxY + '" width="' + boxW + '" height="' + boxH + '" rx="16" fill="url(#coverageRaw)" stroke="rgba(125,255,152,.34)" stroke-width="1.2" />' +
      (reserveW > 1 ? '<rect x="' + boxX + '" y="' + boxY + '" width="' + reserveW.toFixed(1) + '" height="' + boxH + '" rx="16" fill="url(#coverageReserve)" stroke="rgba(255,211,79,.24)" stroke-width="1" />' : '') +
      (reserveW > 1 ? '<rect x="' + (usableX + usableW).toFixed(1) + '" y="' + boxY + '" width="' + reserveW.toFixed(1) + '" height="' + boxH + '" rx="16" fill="url(#coverageReserve)" stroke="rgba(255,211,79,.24)" stroke-width="1" />' : '') +
      '<rect x="' + usableX.toFixed(1) + '" y="' + (boxY + 20) + '" width="' + usableW.toFixed(1) + '" height="' + (boxH - 40) + '" rx="12" fill="rgba(125,255,152,.10)" stroke="rgba(125,255,152,.72)" stroke-width="1.5" />' +
      '<text x="' + (boxX + 14) + '" y="' + (boxY + 20) + '" fill="rgba(226,232,240,.68)" font-size="11" font-weight="800">Raw FOV footprint</text>' +
      '<text x="' + cameraX.toFixed(1) + '" y="' + (boxY + 75) + '" text-anchor="middle" fill="rgba(226,232,240,.84)" font-size="13" font-weight="900">Usable footprint after reserve</text>' +
      '<text x="' + (boxX + boxW - 14) + '" y="' + (boxY + 20) + '" text-anchor="end" fill="rgba(255,226,128,.88)" font-size="11" font-weight="800">Reserve ' + escapeHtml(fmtPct(reservePct, 1)) + '</text>' +
      '<line x1="' + usableX.toFixed(1) + '" y1="225" x2="' + (usableX + usableW).toFixed(1) + '" y2="225" stroke="rgba(125,255,152,.82)" stroke-width="2" />' +
      '<text x="' + cameraX.toFixed(1) + '" y="244" text-anchor="middle" fill="rgba(125,255,152,.86)" font-size="12" font-weight="900">Usable width carried forward: ' + escapeHtml(fmtFt(data.effWidth)) + '</text>' +
    '</svg>';
  }

  function renderCoverageAssistantPrompt(message = "Enter valid values and press Calculate.") {
    if (!els.assistant) return;
    els.assistant.innerHTML = '<p class="muted" style="margin:0;">' + escapeHtml(message) + '</p>';
  }

  function renderCoverageAssistant(data) {
    if (!els.assistant || !data || !data.ok) return;

    const statusClass = statusClassName(data.status);
    const title = coverageAssistantTitle(data);
    const handoff = 'Camera Spacing should use the usable coverage width of <strong>' + escapeHtml(fmtFt(data.effWidth)) + '</strong>. The <strong>' + escapeHtml(fmtPct(data.ovPct, 1)) + '</strong> reserve is a coverage margin, not camera-to-camera overlap.';

    els.assistant.innerHTML =
      '<div class="coverage-assistant-head">' +
        '<div>' +
          '<p class="coverage-assistant-kicker">Coverage Assistant</p>' +
          '<h4 class="coverage-assistant-title">' + escapeHtml(title) + '</h4>' +
          '<p class="coverage-assistant-copy">' + escapeHtml(data.interpretation) + '</p>' +
        '</div>' +
        '<span class="coverage-status-pill ' + statusClass + '">' + escapeHtml(data.status) + '</span>' +
      '</div>' +
      '<div class="coverage-visual-stage">' + coverageFootprintSvg(data) + '</div>' +
      '<div class="coverage-mini-grid">' +
        '<div class="coverage-mini-card"><div class="coverage-mini-label">Raw footprint</div><div class="coverage-mini-value">' + escapeHtml(fmtFt(data.width)) + ' ? ' + escapeHtml(fmtFt(data.height)) + '</div></div>' +
        '<div class="coverage-mini-card"><div class="coverage-mini-label">Usable width</div><div class="coverage-mini-value">' + escapeHtml(fmtFt(data.effWidth)) + '</div></div>' +
        '<div class="coverage-mini-card"><div class="coverage-mini-label">Reserve</div><div class="coverage-mini-value">' + escapeHtml(fmtPct(data.ovPct, 1)) + '</div></div>' +
        '<div class="coverage-mini-card"><div class="coverage-mini-label">Efficiency</div><div class="coverage-mini-value">' + escapeHtml(data.efficiencyClass) + '</div></div>' +
      '</div>' +
      '<div class="coverage-handoff-card"><strong>Next handoff:</strong> ' + handoff + '</div>' +
      '<div class="coverage-handoff-card"><strong>Guidance:</strong> ' + escapeHtml(data.guidance) + '</div>';
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    renderCoverageAssistantPrompt(message);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function forceCoverageContinueVisible() {
    if (els.continueWrap) {
      els.continueWrap.hidden = false;
      els.continueWrap.removeAttribute("hidden");
      els.continueWrap.classList.add("is-visible");
      els.continueWrap.style.display = "flex";
      els.continueWrap.style.marginTop = "0";
    }

    if (els.continueBtn) {
      els.continueBtn.hidden = false;
      els.continueBtn.removeAttribute("hidden");
    }
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      summaryRows: [
        { label: "Coverage Width", value: fmtFt(data.width) },
        { label: "Coverage Height", value: fmtFt(data.height) },
        { label: "Coverage Area", value: fmtSqFt(data.area) },
        { label: "Effective Area", value: fmtSqFt(data.effArea) }
      ],
      derivedRows: [
        { label: "Usable Coverage Reserve", value: fmtPct(data.ovPct) },
        { label: "Effective Width", value: fmtFt(data.effWidth) },
        { label: "Effective Height", value: fmtFt(data.effHeight) },
        { label: "Width Retention", value: fmtPct(data.widthRetentionPct, 1) },
        { label: "Area Retention", value: fmtPct(data.areaRetentionPct, 1) },
        { label: "Overlap Classification", value: data.overlapClass },
        { label: "Coverage Efficiency", value: data.efficiencyClass }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });

    renderCoverageAssistant(data);
    writeFlow(data);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
    forceCoverageContinueVisible();
  }

  function calc() {
    const result = calculateModel();
    if (!result.ok) return renderError(result.message);
    renderSuccess(result);
  }

  function reset() {
    resetFlowOverrideState();
    applyDefaults();
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function bind() {
    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);

    ["hfov", "vfov", "dist", "ov"].forEach((id) => {
      const el = $(id);
      if (!el) return;

      const handleEdit = () => {
        markFlowInputOverride(id);
        invalidate({ clearFlow: true });
        renderFlowNote();
        refreshManualOverrideBanner();
      };

      el.addEventListener("input", handleEdit);
      el.addEventListener("change", handleEdit);
    });
      

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
        e.preventDefault();
        calc();
      }
    });
  }

  function initTool() {
    bind();
    renderFlowNote();
    invalidate({ clearFlow: false });
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    let unlocked = unlockCategoryPage();
    if (unlocked && !els.toolCard.dataset.initialized) {
      els.toolCard.dataset.initialized = "true";
      initTool();
    }

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked && !els.toolCard.dataset.initialized) {
        els.toolCard.dataset.initialized = "true";
        initTool();
      }
    }, 400);
  });
})();