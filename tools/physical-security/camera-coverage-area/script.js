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
    importedAssumptions: $("coverageImportedAssumptions"),
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
      return "This keeps most of the lens footprint available, but leaves less tolerance for edge softness, mounting variance, or blind-edge drift.";
    }
    if (overlapClass === "Balanced Overlap") {
      return "This is usually a practical planning range: enough margin for continuity without giving away too much usable width.";
    }
    return "This improves continuity margin, but it reduces usable width and may push the next spacing step toward more cameras.";
  }

  function reserveGuidance(effWidthRatioPct) {
    if (effWidthRatioPct < 70) {
      return "Reserve is consuming a large portion of the available footprint. Keep this only when continuity is more important than coverage efficiency, or reduce reserve before spacing cameras.";
    }
    if (effWidthRatioPct < 90) {
      return "This is a healthy planning margin for many layouts. It protects the edges while preserving enough usable width for the next spacing decision.";
    }
    return "Very little reserve is being held back. The layout is efficient, but the next spacing step will have less tolerance for edge gaps or mounting variation.";
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
    const targets = [els.flowNote, els.importedAssumptions].filter(Boolean);

    targets.forEach((target) => {
      const existing = target.querySelector(".flow-override-note");
      if (existing) existing.remove();
    });

    const note = renderManualOverrideNote();
    const visibleTarget = els.importedAssumptions || els.flowNote;

    if (note && visibleTarget) {
      visibleTarget.hidden = false;
      visibleTarget.insertAdjacentHTML("beforeend", note);
    }
  }

  function applyDefaults() {
    els.hfov.value = String(DEFAULTS.hfov);
    els.vfov.value = String(DEFAULTS.vfov);
    els.dist.value = String(DEFAULTS.dist);
    els.ov.value = String(DEFAULTS.ov);
  }

  function renderFlowNote() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.importedAssumptions || els.flowNote,
      flowKey: FLOW_KEYS.area,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      title: "Imported Assumptions",
      intro: "Values carried into this step from the previous design stage."
    });

    if (els.flowNote) {
      els.flowNote.innerHTML = "";
      els.flowNote.hidden = true;
    }

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

    const parts = [];
    if (sceneWidth > 0) parts.push(`Scene width: <strong>${fmtFt(sceneWidth)}</strong>`);
    if (dist > 0) parts.push(`Distance: <strong>${fmtFt(dist)}</strong>`);
    if (hfov > 0) parts.push(`HFOV: <strong>${fmt(hfov, 1)}&deg;</strong>`);
    if (fitClass) parts.push(`Fit class: <strong>${fitClass}</strong>`);

    if (parts.length) {
      const noteHtml = `
        <strong>Imported Assumptions</strong><br>
        ${parts.join(" | ")}
      `;

      if (els.flowNote) {
        els.flowNote.innerHTML = "";
        els.flowNote.hidden = true;
      }

      if (els.importedAssumptions) {
        els.importedAssumptions.innerHTML = noteHtml;
        els.importedAssumptions.hidden = false;
      }
    } else {
      if (els.flowNote) {
        els.flowNote.innerHTML = "";
        els.flowNote.hidden = true;
      }
      if (els.importedAssumptions) els.importedAssumptions.hidden = true;
    }

    refreshManualOverrideBanner();
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
      emptyMessage: "Review the imported FOV and target-distance assumptions, confirm the usable coverage reserve, then run the coverage check. Edit imported values only when you are intentionally testing a local what-if branch."
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
      return { ok: false, message: "Review the imported FOV and target-distance assumptions, confirm the usable coverage reserve, then run the coverage check. Edit imported values only when you are intentionally testing a local what-if branch." };
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
      dominantConstraint = "Reserve pressure is the dominant limiter. Too much of the lens footprint is being held back, which can reduce spacing efficiency and increase the camera count needed for continuous coverage.";
    } else if (reserveLossPct >= 20) {
      dominantConstraint = "Coverage efficiency is the main watch item. The reserve strategy is still workable, but it is starting to compress usable width enough to matter in the spacing step.";
    } else {
      dominantConstraint = "Field geometry is balanced. Most of the lens footprint remains usable after reserve, giving Camera Spacing a clean starting width.";
    }

    const interpretation = `At ${fmtFt(input.dist)}, the imported FOV creates a raw footprint of about ${fmtFt(width)} by ${fmtFt(height)}, or ${fmtSqFt(area)} of scene area. After applying a ${fmtPct(input.ovPct)} usable coverage reserve, the width carried forward becomes ${fmtFt(effWidth)} while vertical coverage remains ${fmtFt(effHeight)}, leaving about ${fmtSqFt(effArea)} of usable coverage. ${interpretationCore}`;

    const guidance = `${guidanceCore} Continue to Camera Spacing next and use the carried usable width as the spacing input, not the raw lens footprint.`;

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
        status: data.status,
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
    if (data.reserveLossPct >= 35) return "Usable coverage is under heavy reserve pressure.";
    if (data.reserveLossPct >= 20) return "Usable coverage is workable, but reserve is shaping the spacing step.";
    return "Usable coverage is ready for spacing validation.";
  }

  function coverageFootprintSvg(data) {
    const reservePct = Math.max(0, Math.min(Number(data?.ovPct) || 0, 95));
    const retainedPct = Math.max(0, Math.min(Number(data?.widthRetentionPct) || 0, 100));
    const areaRetainedPct = Math.max(0, Math.min(Number(data?.areaRetentionPct) || 0, 100));

    const rawWidth = Math.max(0, Number(data?.width) || 0);
    const usableWidth = Math.max(0, Number(data?.effWidth) || 0);
    const rawHeight = Math.max(0, Number(data?.height) || 0);
    const targetDistance = Math.max(0, Number(data?.dist) || 0);
    const reserveEachSideFt = Math.max(0, (rawWidth - usableWidth) / 2);
    const reserveEachSidePct = reservePct / 2;

    const labelX = 52;
    const barX = 292;
    const barW = 280;
    const valueX = 740;
    const barH = 10;
    const row1Y = 70;
    const rowGap = 32;

    const stageX = 34;
    const stageY = 150;
    const stageW = 732;
    const stageH = 228;

    const cameraX = 122;
    const centerY = 264;
    const targetX = 560;
    const rawHalf = 72;
    const usableHalf = Math.max(8, rawHalf * (retainedPct / 100));

    const rawTopY = centerY - rawHalf;
    const rawBotY = centerY + rawHalf;
    const usableTopY = centerY - usableHalf;
    const usableBotY = centerY + usableHalf;

    const usableBarW = Math.max(8, barW * (retainedPct / 100));
    const reserveBarW = Math.max(8, barW * (reservePct / 100));
    const reserveTone = reservePct >= 35 ? "risk" : reservePct >= 20 ? "watch" : "normal";
    const reserveBarFill = reserveTone === "risk" ? "url(#coverageRiskBar)" : "url(#coverageReserveBar)";
    const reserveValueFill = reserveTone === "risk" ? "rgba(255,188,166,.96)" : "rgba(255,239,176,.96)";

    return '<svg viewBox="0 0 800 398" role="img" aria-label="Coverage reserve plan view visualization">' +
      '<defs>' +
        '<linearGradient id="coverageRawBar" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(84,212,116,.70)" />' +
          '<stop offset="100%" stop-color="rgba(125,255,152,.86)" />' +
        '</linearGradient>' +
        '<linearGradient id="coverageUsableBar" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(104,240,138,.78)" />' +
          '<stop offset="100%" stop-color="rgba(151,255,176,.92)" />' +
        '</linearGradient>' +
        '<linearGradient id="coverageReserveBar" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(255,211,79,.76)" />' +
          '<stop offset="100%" stop-color="rgba(255,226,128,.90)" />' +
        '</linearGradient>' +
        '<linearGradient id="coverageRiskBar" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(255,138,102,.82)" />' +
          '<stop offset="100%" stop-color="rgba(255,94,94,.92)" />' +
        '</linearGradient>' +
        '<linearGradient id="coverageFovFill" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(125,255,152,.035)" />' +
          '<stop offset="100%" stop-color="rgba(125,255,152,.105)" />' +
        '</linearGradient>' +
        '<linearGradient id="coverageUsableFill" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(125,255,152,.07)" />' +
          '<stop offset="100%" stop-color="rgba(125,255,152,.18)" />' +
        '</linearGradient>' +
      '</defs>' +

      '<text x="52" y="26" fill="rgba(248,250,252,.92)" font-size="18" font-weight="900">Plan view: raw footprint to usable width</text>' +
      '<text x="52" y="48" fill="rgba(226,232,240,.62)" font-size="12">Top-down footprint at the target plane. Green is usable coverage; yellow marks held-back reserve before spacing.</text>' +

      '<text x="' + labelX + '" y="' + row1Y + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Raw footprint width</text>' +
      '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />' +
      '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="url(#coverageRawBar)" />' +
      '<text x="' + valueX + '" y="' + row1Y + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + escapeHtml(fmtFt(rawWidth)) + '</text>' +

      '<text x="' + labelX + '" y="' + (row1Y + rowGap) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Usable width after reserve</text>' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + usableBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="url(#coverageUsableBar)" />' +
      '<text x="' + valueX + '" y="' + (row1Y + rowGap) + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + escapeHtml(fmtFt(usableWidth)) + ' | ' + escapeHtml(fmtPct(retainedPct, 1)) + ' retained</text>' +

      '<text x="' + labelX + '" y="' + (row1Y + rowGap * 2) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Held-back reserve</text>' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(255,211,79,.12)" />' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + reserveBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="' + reserveBarFill + '" />' +
      '<text x="' + valueX + '" y="' + (row1Y + rowGap * 2) + '" text-anchor="end" fill="' + reserveValueFill + '" font-size="11" font-weight="900">' + escapeHtml(fmtPct(reservePct, 1)) + ' reserve | ' + escapeHtml(fmtPct(areaRetainedPct, 1)) + ' area retained</text>' +

      '<rect x="' + stageX + '" y="' + stageY + '" width="' + stageW + '" height="' + stageH + '" rx="18" fill="rgba(0,0,0,.13)" stroke="rgba(125,255,152,.16)" />' +
      '<text x="' + (stageX + 18) + '" y="' + (stageY + 24) + '" fill="rgba(125,255,152,.78)" font-size="11" font-weight="950" letter-spacing=".08em">PLAN VIEW / TARGET PLANE</text>' +

      '<text x="' + (cameraX - 76) + '" y="' + (centerY - 4) + '" text-anchor="start" fill="rgba(226,232,240,.82)" font-size="11" font-weight="900">Cam 1</text>' +
      '<text x="' + (cameraX - 76) + '" y="' + (centerY + 14) + '" text-anchor="start" fill="rgba(226,232,240,.58)" font-size="10">HFOV ' + escapeHtml(fmt(data.hfov, 0)) + ' deg</text>' +
      '<circle cx="' + cameraX + '" cy="' + centerY + '" r="8" fill="rgba(8,18,12,.96)" stroke="rgba(125,255,152,.90)" stroke-width="1.8" />' +

      '<path d="M ' + cameraX + ' ' + centerY + ' L ' + targetX + ' ' + rawTopY.toFixed(1) + ' L ' + targetX + ' ' + rawBotY.toFixed(1) + ' Z" fill="url(#coverageFovFill)" stroke="rgba(226,232,240,.24)" stroke-width="1" stroke-dasharray="5 6" />' +
      '<path d="M ' + cameraX + ' ' + centerY + ' L ' + targetX + ' ' + usableTopY.toFixed(1) + ' L ' + targetX + ' ' + usableBotY.toFixed(1) + ' Z" fill="url(#coverageUsableFill)" stroke="rgba(125,255,152,.62)" stroke-width="1.25" />' +

      '<line x1="' + cameraX + '" y1="' + centerY + '" x2="' + targetX + '" y2="' + centerY + '" stroke="rgba(226,232,240,.26)" stroke-width="1" stroke-dasharray="4 6" />' +
      '<line x1="' + cameraX + '" y1="' + centerY + '" x2="' + targetX + '" y2="' + rawTopY.toFixed(1) + '" stroke="rgba(255,226,128,.66)" stroke-width="1" stroke-dasharray="5 6" />' +
      '<line x1="' + cameraX + '" y1="' + centerY + '" x2="' + targetX + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(255,226,128,.66)" stroke-width="1" stroke-dasharray="5 6" />' +
      '<line x1="' + cameraX + '" y1="' + centerY + '" x2="' + targetX + '" y2="' + usableTopY.toFixed(1) + '" stroke="rgba(125,255,152,.78)" stroke-width="1.4" />' +
      '<line x1="' + cameraX + '" y1="' + centerY + '" x2="' + targetX + '" y2="' + usableBotY.toFixed(1) + '" stroke="rgba(125,255,152,.78)" stroke-width="1.4" />' +

      '<line x1="' + targetX + '" y1="' + rawTopY.toFixed(1) + '" x2="' + targetX + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(226,232,240,.42)" stroke-width="1" />' +
      '<line x1="' + targetX + '" y1="' + rawTopY.toFixed(1) + '" x2="' + targetX + '" y2="' + usableTopY.toFixed(1) + '" stroke="rgba(255,226,128,.90)" stroke-width="2" />' +
      '<line x1="' + targetX + '" y1="' + usableTopY.toFixed(1) + '" x2="' + targetX + '" y2="' + usableBotY.toFixed(1) + '" stroke="rgba(125,255,152,.92)" stroke-width="2.2" />' +
      '<line x1="' + targetX + '" y1="' + usableBotY.toFixed(1) + '" x2="' + targetX + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(255,226,128,.90)" stroke-width="2" />' +

      '<text x="' + (targetX + 18) + '" y="' + (centerY - 12) + '" fill="rgba(125,255,152,.94)" font-size="12" font-weight="950">Usable width</text>' +
      '<text x="' + (targetX + 18) + '" y="' + (centerY + 9) + '" fill="rgba(125,255,152,.94)" font-size="14" font-weight="950">' + escapeHtml(fmtFt(usableWidth)) + '</text>' +
      '<text x="' + (targetX + 18) + '" y="' + (centerY + 27) + '" fill="rgba(226,232,240,.58)" font-size="10.5">after reserve</text>' +

      '<text x="' + (targetX + 18) + '" y="' + (rawTopY + 10).toFixed(1) + '" fill="rgba(255,226,128,.92)" font-size="10.5" font-weight="900">Reserve ' + escapeHtml(fmtFt(reserveEachSideFt)) + '</text>' +
      '<text x="' + (targetX + 18) + '" y="' + (rawBotY - 5).toFixed(1) + '" fill="rgba(255,226,128,.92)" font-size="10.5" font-weight="900">Reserve ' + escapeHtml(fmtFt(reserveEachSideFt)) + '</text>' +

      '<line x1="' + (targetX + 128) + '" y1="' + rawTopY.toFixed(1) + '" x2="' + (targetX + 128) + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(226,232,240,.44)" stroke-width="1" />' +
      '<line x1="' + (targetX + 121) + '" y1="' + rawTopY.toFixed(1) + '" x2="' + (targetX + 135) + '" y2="' + rawTopY.toFixed(1) + '" stroke="rgba(226,232,240,.44)" stroke-width="1" />' +
      '<line x1="' + (targetX + 121) + '" y1="' + rawBotY.toFixed(1) + '" x2="' + (targetX + 135) + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(226,232,240,.44)" stroke-width="1" />' +
      '<text x="' + (stageX + stageW - 76) + '" y="' + (centerY - 18) + '" text-anchor="start" fill="rgba(226,232,240,.82)" font-size="11" font-weight="900">Raw</text>' +
      '<text x="' + (stageX + stageW - 76) + '" y="' + (centerY - 3) + '" text-anchor="start" fill="rgba(226,232,240,.82)" font-size="11" font-weight="900">footprint</text>' +
      '<text x="' + (stageX + stageW - 76) + '" y="' + (centerY + 16) + '" text-anchor="start" fill="rgba(226,232,240,.82)" font-size="13" font-weight="950">' + escapeHtml(fmtFt(rawWidth)) + '</text>' +

      '<line x1="' + cameraX + '" y1="354" x2="' + targetX + '" y2="354" stroke="rgba(226,232,240,.46)" stroke-width="1" />' +
      '<line x1="' + cameraX + '" y1="348" x2="' + cameraX + '" y2="360" stroke="rgba(226,232,240,.46)" stroke-width="1" />' +
      '<line x1="' + targetX + '" y1="348" x2="' + targetX + '" y2="360" stroke="rgba(226,232,240,.46)" stroke-width="1" />' +
      '<text x="' + ((cameraX + targetX) / 2).toFixed(1) + '" y="376" text-anchor="middle" fill="rgba(226,232,240,.72)" font-size="11" font-weight="900">Target distance: ' + escapeHtml(fmtFt(targetDistance, 0)) + '</text>' +
    '</svg>';
  }
  function renderCoverageAssistantPrompt(message = "Review the imported FOV and target-distance assumptions, confirm the usable coverage reserve, then run the coverage check. Edit imported values only when you are intentionally testing a local what-if branch.") {
    if (!els.assistant) return;

    els.assistant.innerHTML =
      '<div class="coverage-assistant-head">' +
        '<div>' +
          '<p class="coverage-assistant-kicker">Coverage Assistant</p>' +
          '<h4 class="coverage-assistant-title">Ready to validate carried coverage assumptions.</h4>' +
          '<p class="coverage-assistant-copy">' + escapeHtml(message) + '</p>' +
        '</div>' +
      '</div>';
  }

  function removeDuplicateCoverageStatusChip() {
    if (!els.assistant) return;

    const candidates = els.assistant.querySelectorAll("span, div, p");
    candidates.forEach((node) => {
      const text = String(node.textContent || "").replace(/\s+/g, " ").trim();

      if (/^Status:\s*(HEALTHY|WATCH|RISK|undefined)$/i.test(text)) {
        node.remove();
      }
    });
  }

  function formatAssistantStatusLabel(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function renderCoverageAssistant(data) {
    if (!els.assistant || !data || !data.ok) return;

    const statusClass = statusClassName(data.status);
    const title = coverageAssistantTitle(data);
    const handoff = 'Carry <strong>' + escapeHtml(fmtFt(data.effWidth)) + '</strong> into Camera Spacing as the usable coverage width. The <strong>' + escapeHtml(fmtPct(data.ovPct, 1)) + '</strong> reserve is a lens-footprint margin, not the camera-to-camera overlap target.';

    els.assistant.innerHTML =
      '<div class="coverage-assistant-head">' +
        '<div>' +
          '<p class="coverage-assistant-kicker">Coverage Assistant</p>' +
          '<h4 class="coverage-assistant-title">' + escapeHtml(title) + '</h4>' +
          '<p class="coverage-assistant-copy">' + escapeHtml(data.interpretation) + '</p>' +
        '</div>' +
        '<span class="coverage-status-pill ' + statusClass + '">Assistant Status: ' + escapeHtml(formatAssistantStatusLabel(data.status)) + '</span>' +
      '</div>' +
      '<div class="coverage-visual-stage">' + coverageFootprintSvg(data) + '</div>' +
      '<div class="coverage-mini-grid">' +
        '<div class="coverage-mini-card"><div class="coverage-mini-label">Raw footprint</div><div class="coverage-mini-value">' + escapeHtml(fmtFt(data.width)) + ' &times; ' + escapeHtml(fmtFt(data.height)) + '</div></div>' +
        '<div class="coverage-mini-card"><div class="coverage-mini-label">Usable width</div><div class="coverage-mini-value">' + escapeHtml(fmtFt(data.effWidth)) + '</div></div>' +
        '<div class="coverage-mini-card"><div class="coverage-mini-label">Reserve</div><div class="coverage-mini-value">' + escapeHtml(fmtPct(data.ovPct, 1)) + '</div></div>' +
        '<div class="coverage-mini-card"><div class="coverage-mini-label">Efficiency</div><div class="coverage-mini-value">' + escapeHtml(data.efficiencyClass) + '</div></div>' +
      '</div>' +
      '<div class="coverage-handoff-card"><strong>Spacing handoff:</strong> ' + handoff + '</div>' +
      '<div class="coverage-handoff-card"><strong>Assistant guidance:</strong> ' + escapeHtml(data.guidance) + '</div>';
    removeDuplicateCoverageStatusChip();
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

/* Coverage Area presentation cleanup: remove duplicate analyzer status chip only. */
(function () {
  if (window.__coverageDuplicateStatusChipCleanup) return;
  window.__coverageDuplicateStatusChipCleanup = true;

  function cleanDuplicateStatusChip() {
    var root =
      document.querySelector(".coverage-assistant-card") ||
      document.getElementById("toolCard") ||
      document;

    if (!root) return;

    var nodes = root.querySelectorAll("span, div, p, strong");
    nodes.forEach(function (node) {
      var text = String(node.textContent || "").replace(/\s+/g, " ").trim();

      if (node.classList && node.classList.contains("coverage-status-pill")) return;
      if (node.closest && node.closest(".coverage-status-pill")) return;

      if (!/^Status:\s*(HEALTHY|WATCH|RISK|undefined)$/i.test(text)) return;

      var removable =
        node.closest(".pill") ||
        node.closest(".result-row") ||
        node.closest("[class*=status]") ||
        node;

      if (removable && removable.parentNode) {
        removable.parentNode.removeChild(removable);
      }
    });
  }

  function cleanSoon() {
    cleanDuplicateStatusChip();
    setTimeout(cleanDuplicateStatusChip, 0);
    setTimeout(cleanDuplicateStatusChip, 75);
    setTimeout(cleanDuplicateStatusChip, 200);
    setTimeout(cleanDuplicateStatusChip, 500);
  }

  document.addEventListener("DOMContentLoaded", function () {
    cleanSoon();

    var calc = document.getElementById("calc");
    if (calc) {
      calc.addEventListener("click", cleanSoon);
    }
  });

  window.ScopedLabsCleanCoverageDuplicateStatus = cleanSoon;
})();
