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
  const STEP = "camera-spacing";
  const PREVIOUS_STEP = "camera-coverage-area";

  const $ = (id) => document.getElementById(id);

  const els = {
    len: $("len"),
    dist: $("dist"),
    hfov: $("hfov"),
    ov: $("ov"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    assistant: $("spacingDesignAssistant"),
    assistantModeNote: $("spacingAssistantModeNote"),
    assistantDiagnosis: $("spacingAssistantDiagnosis"),
    assistantBranches: $("spacingAssistantBranches"),
    assistantRecommendation: $("spacingAssistantRecommendation"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  const DEFAULTS = {
    len: 300,
    dist: 60,
    hfov: 90,
    ov: 15
  };

  function num(value, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(value, fallback);
  }

  function deg2rad(x) {
    return x * Math.PI / 180;
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtFt(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} ft` : "—";
  }

  function fmtPct(value, digits = 1) {
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

  let flowInputsImported = false;
  const importedFlowValues = {};
  const manualFlowOverrides = {};
  let activeAssistantScenario = null;
  let latestAssistantScenarios = [];

  function cleanOverrideNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatOverrideValue(field, value) {
    const number = cleanOverrideNumber(value);
    if (number === null) return "n/a";

    if (field === "dist") return number.toFixed(1).replace(/\.0$/, "") + " ft";
    if (field === "hfov") return Math.round(number) + "°";
    if (field === "ov") return number.toFixed(1).replace(/\.0$/, "") + "%";

    return String(number);
  }

  function overrideLabel(field) {
    if (field === "dist") return "Distance";
    if (field === "hfov") return "Horizontal FOV";
    if (field === "ov") return "Overlap target";
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

function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function hasPipelineBaseline() {
    if (Object.keys(importedFlowValues).length > 0) return true;

    try {
      const raw = sessionStorage.getItem(FLOW_KEYS.area);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed && parsed.data);
    } catch {
      return false;
    }
  }

  function clearAssistantScenario() {
    activeAssistantScenario = null;
  }

  function sourceModeForCurrentResult(manualOverrideMeta) {
    if (activeAssistantScenario && manualOverrideMeta.length) return "mixed";
    if (activeAssistantScenario) return "assistant-scenario";
    if (manualOverrideMeta.length) return "manual-override";
    return "pipeline";
  }

  function assistantScenarioMetadata() {
    if (!activeAssistantScenario) return null;

    return {
      id: activeAssistantScenario.id,
      label: activeAssistantScenario.label,
      intent: activeAssistantScenario.intent,
      controlledFields: Object.keys(activeAssistantScenario.changes || {}),
      changes: activeAssistantScenario.changes || {},
      overlapTargetPct: activeAssistantScenario.ovPct,
      cameraCount: activeAssistantScenario.cams,
      actualSpacingFt: activeAssistantScenario.spacing,
      usableWidthFt: activeAssistantScenario.usableWidth,
      rawWidthFt: activeAssistantScenario.rawWidth,
      spacingRatio: activeAssistantScenario.ratio,
      spacingClass: activeAssistantScenario.spacingClass,
      scenarioContext: hasPipelineBaseline() ? "pipeline-baseline" : "single-validation",
      note: activeAssistantScenario.note
    };
  }

  function simulateSpacingBranch(data, ovPct) {
    const overlap = Math.min(95, Math.max(0, Number(ovPct)));
    const usableWidth = data.rawWidth * (1 - (overlap / 100));
    const cams = Math.max(1, Math.ceil(data.len / usableWidth));
    const spacing = data.len / cams;
    const ratio = usableWidth > 0 ? spacing / usableWidth : 0;

    return {
      ovPct: overlap,
      rawWidth: data.rawWidth,
      usableWidth,
      cams,
      spacing,
      ratio,
      spacingClass: classifySpacing(ratio)
    };
  }

  function overlapForTarget(data, targetCount, targetRatio) {
    if (!Number.isFinite(targetCount) || targetCount < 1) return null;
    if (!Number.isFinite(data.rawWidth) || data.rawWidth <= 0) return null;

    const spacing = data.len / targetCount;
    const desiredUsableWidth = spacing / targetRatio;
    const overlap = (1 - (desiredUsableWidth / data.rawWidth)) * 100;

    if (!Number.isFinite(overlap) || overlap < 0 || overlap > 95) return null;
    return overlap;
  }

  function makeAssistantScenario(id, label, intent, model, note, canApply) {
    return {
      id,
      label,
      intent,
      ovPct: model?.ovPct,
      cams: model?.cams,
      spacing: model?.spacing,
      usableWidth: model?.usableWidth,
      ratio: model?.ratio,
      spacingClass: model?.spacingClass,
      note,
      canApply: !!canApply && !!model && Number.isFinite(model.ovPct)
    };
  }

  function spacingSourceLabel(mode) {
    if (mode === "manual-override") return "Manual override";
    if (mode === "assistant-scenario") return "Assisted scenario";
    if (mode === "mixed") return "Mixed scenario";
    return "Clean pipeline";
  }

  function spacingProblemLabel(data) {
    if (!data) return "Review required";

    if (data.spacingClass === "Wide Spacing") return "Spacing is too wide for the usable footprint";
    if (data.spacingClass === "Tight Spacing") return "Spacing is conservative and camera-heavy";
    if (Number(data.ovPct) >= 25) return "Overlap reserve is compressing useful coverage width";

    return "Spacing is balanced for this protected run";
  }

  function spacingRecommendedAction(data) {
    if (!data) return "Review the spacing result before continuing.";

    if (data.spacingClass === "Wide Spacing") {
      return "Apply a correction branch that adds reserve, increases effective coverage, or moves this result toward a higher camera count before Blind Spot Check.";
    }

    if (data.spacingClass === "Tight Spacing") {
      return "Keep the conservative layout if continuity matters, or test the efficiency branch if camera count is under pressure.";
    }

    if (Number(data.ovPct) >= 25) {
      return "Spacing is workable, but overlap reserve is high. Use the balanced branch if the layout feels over-compressed.";
    }

    return "Keep the baseline and continue to Blind Spot Check unless the project priority changes.";
  }

  function simulateSpacingDesignValues(data, changes) {
    const len = Number.isFinite(Number(changes?.len)) ? Number(changes.len) : Number(data.len);
    const dist = Number.isFinite(Number(changes?.dist)) ? Number(changes.dist) : Number(data.dist);
    const hfov = Number.isFinite(Number(changes?.hfov)) ? Number(changes.hfov) : Number(data.hfov);
    const ovPct = Number.isFinite(Number(changes?.ovPct)) ? Number(changes.ovPct) : Number(data.ovPct);

    if (
      !Number.isFinite(len) || len <= 0 ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(ovPct) || ovPct < 0 || ovPct > 95
    ) {
      return null;
    }

    const rawWidth = 2 * Math.tan((hfov / 2) * Math.PI / 180) * dist;
    const usableWidth = rawWidth * (1 - (ovPct / 100));

    if (!Number.isFinite(rawWidth) || rawWidth <= 0 || !Number.isFinite(usableWidth) || usableWidth <= 0) {
      return null;
    }

    const cams = Math.max(1, Math.ceil(len / usableWidth));
    const spacing = len / cams;
    const ratio = usableWidth > 0 ? spacing / usableWidth : 0;
    const spacingClass = classifySpacing(ratio);

    return {
      len,
      dist,
      hfov,
      ovPct,
      rawWidth,
      usableWidth,
      cams,
      spacing,
      ratio,
      spacingClass
    };
  }

  function makeSpacingDesignScenario(data, id, label, intent, changes, note, actionLabel, canApply = true) {
    const model = simulateSpacingDesignValues(data, changes || {});

    if (!model || !canApply) {
      return {
        id,
        label,
        intent,
        note,
        actionLabel: actionLabel || "Unavailable",
        canApply: false,
        changes: changes || {},
        disabledReason: "This branch is not available for the current geometry."
      };
    }

    return {
      id,
      label,
      intent,
      note,
      actionLabel,
      canApply: true,
      changes: changes || {},
      ...model
    };
  }

  function spacingControlFieldsLabel(scenario) {
    if (!scenario || !scenario.changes) return "No field changes";

    const labels = [];

    if (Number.isFinite(Number(scenario.changes.len))) labels.push("perimeter length");
    if (Number.isFinite(Number(scenario.changes.dist))) labels.push("distance");
    if (Number.isFinite(Number(scenario.changes.hfov))) labels.push("HFOV");
    if (Number.isFinite(Number(scenario.changes.ovPct))) labels.push("overlap target");

    return labels.length ? labels.join(", ") : "baseline values";
  }

  function spacingScenarioSummary(scenario) {
    if (!scenario || !scenario.canApply) return "Unavailable for current geometry";

    return [
      Number.isFinite(scenario.cams) ? scenario.cams + " cameras" : null,
      Number.isFinite(scenario.spacing) ? fmtFt(scenario.spacing) + " spacing" : null,
      Number.isFinite(scenario.usableWidth) ? fmtFt(scenario.usableWidth) + " usable width" : null,
      Number.isFinite(scenario.ovPct) ? fmtPct(scenario.ovPct, 1) + " overlap" : null
    ].filter(Boolean).join(" | ");
  }

  function spacingApplyButtonHtml(scenario) {
    if (!scenario || !scenario.canApply) {
      return '<button class="btn spacing-assistant-apply" type="button" disabled>Unavailable</button>';
    }

    const label = scenario.actionLabel || ("Apply: " + spacingScenarioSummary(scenario));

    return '<button class="btn btn-primary spacing-assistant-apply" type="button" data-spacing-scenario="' + escapeHtml(scenario.id) + '">' + escapeHtml(label) + '</button>';
  }

  function spacingAssistantHeroHtml(data) {
    const mode = sourceModeForCurrentResult(getManualOverrideMetadata(data));
    const blocker = spacingProblemLabel(data);

    return '' +
      '<div class="spacing-advice-card spacing-hero-card">' +
        '<div class="spacing-section-kicker">Executive Diagnostic Snapshot</div>' +
        '<h4 class="spacing-section-title">' + escapeHtml(blocker) + '</h4>' +
        '<p class="spacing-section-copy">' + escapeHtml(spacingRecommendedAction(data)) + '</p>' +
        '<div class="spacing-mini-grid">' +
          miniCard("Status", assistantStatusLabel(data)) +
          miniCard("Source", spacingSourceLabel(mode)) +
          miniCard("Main Blocker", blocker) +
          miniCard("Recommended Next Step", "Blind Spot Check") +
        '</div>' +
      '</div>';
  }

  

  function spacingPathToHealthyHtml(data) {
    const items = [];

    if (data.spacingClass === "Wide Spacing") {
      items.push("Add one camera or tighten the spacing so actual spacing no longer outruns usable width.");
      items.push("Widen the effective HFOV only if the wider view still preserves downstream detail requirements.");
      items.push("Revisit Coverage Area if the imported distance or HFOV is not the true project geometry.");
      items.push("Confirm the corrected branch in Blind Spot Check before treating it as clean.");
    } else if (data.spacingClass === "Tight Spacing") {
      items.push("Keep the current result when continuity is more important than camera-count efficiency.");
      items.push("Try the efficiency branch only if the next Blind Spot Check remains healthy.");
      items.push("Avoid relaxing overlap so far that hidden seam risk gets pushed downstream.");
    } else {
      items.push("Preserve the current baseline and continue to Blind Spot Check.");
      items.push("Use the continuity branch if seam closure matters more than camera efficiency.");
      items.push("Use the efficiency branch only if the project needs fewer cameras and Blind Spot Check still passes.");
    }

    return '' +
      '<div class="spacing-advice-card">' +
        '<div class="spacing-section-kicker">Path to Healthy</div>' +
        '<h4 class="spacing-section-title">How to correct or preserve this result</h4>' +
        '<ul class="spacing-action-list">' +
          items.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") +
        '</ul>' +
      '</div>';
  }

  function spacingCarryForwardHtml(data) {
    return '' +
      '<div class="spacing-advice-card">' +
        '<div class="spacing-section-kicker">Carry Forward</div>' +
        '<h4 class="spacing-section-title">What Blind Spot Check will receive</h4>' +
        '<p class="spacing-section-copy">The next step should validate whether this spacing plan actually closes the coverage seams.</p>' +
        '<div class="spacing-mini-grid">' +
          miniCard("Cameras", String(data.cams)) +
          miniCard("Actual Spacing", fmtFt(data.spacing)) +
          miniCard("Distance", fmtFt(data.dist)) +
          miniCard("HFOV", fmt(data.hfov, 1) + " deg") +
        '</div>' +
        '<div class="spacing-mini-grid">' +
          miniCard("Overlap Target", fmtPct(data.ovPct, 1)) +
          miniCard("Usable Width", fmtFt(data.usableWidth)) +
          miniCard("Raw Width", fmtFt(data.rawWidth)) +
          miniCard("Spacing Class", data.spacingClass) +
        '</div>' +
      '</div>';
  }

  function buildAssistantScenarios(data) {
    const scenarios = [];

    const continuityOverlap = overlapForTarget(data, data.cams + 1, 0.82);
    scenarios.push(makeSpacingDesignScenario(
      data,
      "continuity-priority",
      "Apply Correction: Add Reserve / One More Camera",
      "Tighten the layout by increasing reserve enough to move toward one additional camera when the geometry supports it.",
      Number.isFinite(continuityOverlap) ? { ovPct: continuityOverlap } : {},
      Number.isFinite(continuityOverlap)
        ? "Use when seam closure and downstream blind-spot risk matter more than camera-count efficiency."
        : "This branch cannot be applied from overlap alone. Revisit distance, HFOV, or perimeter assumptions upstream.",
      "Apply Correction",
      Number.isFinite(continuityOverlap)
    ));

    const balancedOverlap = overlapForTarget(data, data.cams, 0.92);
    scenarios.push(makeSpacingDesignScenario(
      data,
      "balanced-layout",
      "Apply Branch: Balanced Layout",
      "Keep the same camera count while moving overlap reserve toward a practical middle range.",
      Number.isFinite(balancedOverlap) ? { ovPct: balancedOverlap } : { ovPct: data.ovPct },
      "Use as the default correction when the goal is a clean handoff to Blind Spot Check without over-compressing spacing.",
      "Apply Balanced Branch",
      true
    ));

    const efficiencyTarget = data.cams > 1 ? data.cams - 1 : null;
    const efficiencyOverlap = efficiencyTarget ? overlapForTarget(data, efficiencyTarget, 0.98) : null;
    scenarios.push(makeSpacingDesignScenario(
      data,
      "camera-count-efficiency",
      "Try Efficiency Branch",
      "Test whether the protected run can stay viable with fewer cameras.",
      Number.isFinite(efficiencyOverlap) ? { ovPct: efficiencyOverlap } : {},
      Number.isFinite(efficiencyOverlap)
        ? "Use only when the next Blind Spot Check still shows acceptable continuity."
        : "Dropping a camera is not viable from the current geometry without changing upstream assumptions or accepting gap risk.",
      "Try Efficiency Branch",
      Number.isFinite(efficiencyOverlap)
    ));

    const widerHfov = Math.min(179, data.hfov * 1.1);
    scenarios.push(makeSpacingDesignScenario(
      data,
      "widen-effective-view",
      "Recalculate: Widen Effective HFOV",
      "Model the effect of a wider effective view to increase usable footprint before Blind Spot validation.",
      { hfov: widerHfov },
      "Use only when the camera/lens choice can actually support a wider view without breaking detail requirements.",
      "Apply Wider HFOV Check",
      widerHfov > data.hfov && widerHfov < 180
    ));

    return scenarios;
  }

  function assistantStatusCopy(data) {
    if (data.spacingClass === "Wide Spacing") {
      return "Risk: spacing is outrunning the usable footprint. Increase continuity before downstream validation.";
    }

    if (data.spacingClass === "Tight Spacing") {
      return "Watch: the layout is conservative. It may be safe, but camera count pressure is higher than necessary.";
    }

    return "Healthy: spacing, usable width, and reserve are working together in a practical range.";
  }

  function recommendationForAssistant(data, scenarios) {
    const continuity = scenarios.find((item) => item.id === "continuity-priority");
    const balanced = scenarios.find((item) => item.id === "balanced-layout");
    const efficiency = scenarios.find((item) => item.id === "camera-count-efficiency");

    if (data.spacingClass === "Wide Spacing") {
      return continuity && continuity.canApply
        ? "Recommendation: apply Continuity Priority before continuing. Wide spacing should not be treated as clean pipeline truth until Blind Spot Check confirms the seams."
        : "Recommendation: do not continue as a final layout yet. Recalculate upstream with a wider usable footprint, shorter distance, or additional cameras.";
    }

    if (data.spacingClass === "Tight Spacing") {
      return efficiency && efficiency.canApply
        ? "Recommendation: keep the current conservative result if risk tolerance is low, or test Camera Count Efficiency if budget and device count are the dominant constraints."
        : "Recommendation: keep the conservative branch. Efficiency pressure exists, but the current geometry does not support a clean camera-count reduction through overlap alone.";
    }

    return balanced && balanced.canApply
      ? "Recommendation: use the Balanced Layout branch or continue with the current result. Blind Spot Check is still required before treating the layout as final."
      : "Recommendation: continue with the current result, then use Blind Spot Check to verify coverage continuity under the real layout geometry.";
  }

function assistantStatusClass(data) {
    if (data.spacingClass === "Balanced Spacing") return "healthy";
    if (data.spacingClass === "Tight Spacing") return "watch";
    return "risk";
  }

  function assistantStatusLabel(data) {
    if (data.spacingClass === "Balanced Spacing") return "Healthy";
    if (data.spacingClass === "Tight Spacing") return "Watch";
    return "Risk";
  }

  function assistantModeHtml() {
    if (!activeAssistantScenario) return "";

    const copy = hasPipelineBaseline()
      ? "<strong>Custom Design Mode Active:</strong> " + escapeHtml(activeAssistantScenario.label) + " is being used as an assisted camera-spacing branch for downstream Blind Spot validation."
      : "<strong>Standalone Design Mode Active:</strong> This assisted scenario was created without upstream pipeline values. Results are valid as a single validation scenario, not a full guided pipeline run.";

    return '<div class="spacing-mode-note" role="note" aria-label="Design assistant mode">' + copy + '</div>';
  }

  function hideSpacingAssistant() {
    if (els.assistant) {
      els.assistant.hidden = true;
      els.assistant.innerHTML = "";
    }

    if (els.assistantDiagnosis) els.assistantDiagnosis.innerHTML = "";
    if (els.assistantBranches) els.assistantBranches.innerHTML = "";
    if (els.assistantRecommendation) els.assistantRecommendation.innerHTML = "";
    if (els.assistantModeNote) {
      els.assistantModeNote.hidden = true;
      els.assistantModeNote.innerHTML = "";
    }

    latestAssistantScenarios = [];
  }

  function spacingVisualSvg(data) {
    const cameraCount = Math.min(Math.max(data.cams, 1), 10);
    const gap = cameraCount > 1 ? 760 / (cameraCount - 1) : 0;
    const cameras = Array.from({ length: cameraCount }, (_, index) => {
      const x = cameraCount === 1 ? 400 : 20 + (gap * index);
      const coneLeft = Math.max(20, x - 70);
      const coneRight = Math.min(780, x + 70);

      return [
        '<polygon points="' + coneLeft + ',154 ' + x + ',80 ' + coneRight + ',154" fill="rgba(125,255,152,.08)" stroke="rgba(125,255,152,.22)" stroke-width="1" />',
        '<circle cx="' + x + '" cy="78" r="10" fill="rgba(125,255,152,.22)" stroke="rgba(125,255,152,.82)" stroke-width="2" />',
        '<line x1="' + x + '" y1="88" x2="' + x + '" y2="154" stroke="rgba(125,255,152,.18)" stroke-width="1" stroke-dasharray="5 6" />'
      ].join("");
    }).join("");

    return '<svg viewBox="0 0 800 260" role="img" aria-label="Camera spacing visualization">' +
      '<defs>' +
        '<linearGradient id="spacingLine" x1="0" x2="1">' +
          '<stop offset="0%" stop-color="rgba(125,255,152,.20)" />' +
          '<stop offset="50%" stop-color="rgba(125,255,152,.70)" />' +
          '<stop offset="100%" stop-color="rgba(255,211,79,.30)" />' +
        '</linearGradient>' +
      '</defs>' +
      '<rect x="36" y="166" width="728" height="18" rx="9" fill="rgba(255,255,255,.045)" />' +
      '<rect x="36" y="166" width="728" height="18" rx="9" fill="url(#spacingLine)" opacity=".75" />' +
      cameras +
      '<text x="40" y="214" fill="rgba(226,232,240,.72)" font-size="18" font-weight="800">Protected run: ' + escapeHtml(fmtFt(data.len)) + '</text>' +
      '<text x="40" y="238" fill="rgba(226,232,240,.56)" font-size="15">Actual spacing: ' + escapeHtml(fmtFt(data.spacing)) + ' | Usable width: ' + escapeHtml(fmtFt(data.usableWidth)) + ' | Overlap: ' + escapeHtml(fmtPct(data.ovPct, 1)) + '</text>' +
    '</svg>';
  }

  function miniCard(label, value) {
    return '<div class="spacing-mini-card"><span class="spacing-mini-label">' + escapeHtml(label) + '</span><span class="spacing-mini-value">' + escapeHtml(value) + '</span></div>';
  }

  function dominantDriverHtml(data) {
    let headline = "Spacing and overlap are balanced.";
    let copy = "The current camera-to-camera spacing is staying inside the usable footprint while preserving practical overlap reserve.";

    if (data.spacingClass === "Wide Spacing") {
      headline = "Spacing is creating continuity pressure.";
      copy = "The actual spacing is too close to the edge of the usable footprint. Increase reserve before treating this as a clean handoff.";
    } else if (data.spacingClass === "Tight Spacing") {
      headline = "Camera count is carrying the design.";
      copy = "The layout is conservative. That may be acceptable, but it can create budget, installation, and device-count pressure.";
    }

    return '<div class="spacing-section-kicker">Dominant Driver</div>' +
      '<h4 class="spacing-section-title">' + escapeHtml(headline) + '</h4>' +
      '<p class="spacing-section-copy">' + escapeHtml(copy) + '</p>' +
      '<ul class="spacing-action-list">' +
        '<li>Use Blind Spot Check before accepting final seam continuity.</li>' +
        '<li>Recalculate upstream if the distance or HFOV assumption is not real-world accurate.</li>' +
        '<li>Choose an assistant branch only when that branch matches the design priority.</li>' +
      '</ul>';
  }

  function branchHtml(scenario) {
    if (!scenario || !scenario.canApply) {
      return '<div class="spacing-branch-item">' +
        '<div><span class="spacing-branch-title">' + escapeHtml(scenario?.label || "Unavailable Branch") + '</span>' +
        '<span class="spacing-branch-meta">Unavailable for current geometry</span>' +
        '<span class="spacing-branch-note">' + escapeHtml(scenario?.note || "This branch cannot be calculated from the current inputs.") + '</span></div>' +
        '<button class="btn" type="button" disabled>Unavailable</button>' +
      '</div>';
    }

    return '<div class="spacing-branch-item">' +
      '<div>' +
        '<span class="spacing-branch-title">' + escapeHtml(scenario.label) + '</span>' +
        '<span class="spacing-branch-meta">' + escapeHtml(scenario.cams + " cameras | " + fmtFt(scenario.spacing) + " spacing | " + fmtPct(scenario.ovPct, 1) + " overlap") + '</span>' +
        '<span class="spacing-branch-note">' + escapeHtml(scenario.note) + '</span>' +
      '</div>' +
      '<button class="btn btn-primary spacing-assistant-apply" type="button" data-spacing-scenario="' + escapeHtml(scenario.id) + '">Apply Branch</button>' +
    '</div>';
  }

  function recommendationHtml(data, scenarios) {
    const recommendation = recommendationForAssistant(data, scenarios);
    const source = activeAssistantScenario ? "Assistant Scenario" : (getManualOverrideMetadata(data).length ? "Manual Override" : "Clean Pipeline");

    return '<div class="spacing-section-kicker">Recommendation</div>' +
      '<h4 class="spacing-section-title">Recommended path forward</h4>' +
      '<p class="spacing-section-copy">' + escapeHtml(recommendation) + '</p>' +
      '<ul class="spacing-action-list">' +
        '<li><strong>Pipeline integrity:</strong> ' + escapeHtml(source) + '</li>' +
        '<li><strong>Next validation:</strong> Continue to Blind Spot Check with the final spacing result.</li>' +
        '<li><strong>Correction path:</strong> If this result is risky, adjust overlap, reduce distance, widen usable FOV, or increase camera count.</li>' +
      '</ul>';
  }

  function renderAssistantModeNote() {
    return;
  }

  

  

  

  

  

  

  

  

  function spacingPressureMetric(data) {
    const ratio = Number(data?.ratio);
    const ovPct = Number(data?.ovPct);
    const cams = Number(data?.cams);

    const gapExposure = ratio > 0.92 ? Math.min((ratio - 0.92) * 220, 100) : 0;
    const compression = ratio < 0.72 ? Math.min((0.72 - ratio) * 180, 100) : 0;
    const overlapPressure = Number.isFinite(ovPct) ? Math.min(Math.max(ovPct, 0), 100) : 0;
    const cameraPressure = Number.isFinite(cams) ? Math.min(Math.max((cams - 1) * 12, 0), 100) : 0;

    return {
      gapExposure,
      compression,
      overlapPressure,
      cameraPressure
    };
  }

  function spacingPressureBarHtml(label, value, display, help) {
    const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
    const tone = safeValue <= 20 ? "healthy" : safeValue <= 35 ? "watch" : "risk";

    return '' +
      '<div class="spacing-pressure-row ' + tone + '">' +
        '<div class="spacing-pressure-head">' +
          '<strong>' + escapeHtml(label) + '</strong>' +
          '<span>' + escapeHtml(display) + '</span>' +
        '</div>' +
        '<div class="spacing-pressure-track" aria-label="' + escapeHtml(label) + '">' +
          '<div class="spacing-pressure-fill" style="width:' + safeValue.toFixed(0) + '%"></div>' +
        '</div>' +
        '<p>' + escapeHtml(help) + '</p>' +
      '</div>';
  }

  function spacingPressureGraphHtml(data) {
    const metric = spacingPressureMetric(data);

    return '' +
      '<div class="spacing-advice-card spacing-pressure-card">' +
        '<div class="spacing-section-kicker">Pressure Graph</div>' +
        '<h4 class="spacing-section-title">What is pushing this spacing result?</h4>' +
        '<p class="spacing-section-copy">These bars show which design pressure is driving the current status. Use them to decide whether to add reserve, relax efficiency, change overlap, or revisit upstream geometry.</p>' +
        spacingPressureBarHtml(
          "Gap Exposure Pressure",
          metric.gapExposure,
          data.ratio > 0 ? fmtPct(Math.max((data.ratio - 0.92) * 100, 0), 1) : "0.0%",
          "Higher pressure means actual spacing is getting too close to the usable footprint."
        ) +
        spacingPressureBarHtml(
          "Spacing Compression",
          metric.compression,
          data.ratio > 0 ? fmtPct(Math.max((0.72 - data.ratio) * 100, 0), 1) : "0.0%",
          "Higher pressure means the layout is overlap-heavy and likely camera-count intensive."
        ) +
        spacingPressureBarHtml(
          "Overlap Reserve Pressure",
          metric.overlapPressure,
          fmtPct(data.ovPct, 1),
          "Higher pressure means overlap reserve is reducing usable coverage width."
        ) +
        spacingPressureBarHtml(
          "Camera Count Pressure",
          metric.cameraPressure,
          String(data.cams) + " cameras",
          "Higher pressure means the spacing plan is becoming more camera-intensive."
        ) +
      '</div>';
  }

  function spacingScenarioDecisionHelp(scenario) {
    if (!scenario || !scenario.canApply) {
      return "This option is unavailable because the current geometry cannot support it without changing upstream assumptions.";
    }

    if (scenario.id === "continuity-priority") {
      return "Choose this when the current layout is too close to seam/gap risk and continuity matters more than camera-count efficiency.";
    }

    if (scenario.id === "balanced-layout") {
      return "Choose this when the layout is workable but you want a cleaner middle-ground before Blind Spot Check.";
    }

    if (scenario.id === "camera-count-efficiency") {
      return "Choose this only when reducing camera count matters and you are willing to verify the added risk downstream.";
    }

    if (scenario.id === "widen-effective-view") {
      return "Choose this only if the actual lens/camera choice can support a wider view without sacrificing required detail.";
    }

    return "Choose this when the branch matches the project priority better than the current baseline.";
  }

  function spacingWhatIfControlsHtml(data) {
    return '' +
      '<div class="spacing-advice-card spacing-control-panel">' +
        '<div class="spacing-section-kicker">User-Controlled What-If</div>' +
        '<h4 class="spacing-section-title">Try your own correction</h4>' +
        '<p class="spacing-section-copy">Use these fields to test a custom correction instead of only using predefined branches. Applying this check updates the actual tool inputs and recalculates the assistant as an assisted scenario.</p>' +
        '<div class="spacing-control-grid">' +
          '<label class="field"><span class="label">Perimeter Length (ft)</span><input data-spacing-whatif="len" type="number" min="1" step="1" value="' + escapeHtml(String(Number(data.len || 0).toFixed(0))) + '"></label>' +
          '<label class="field"><span class="label">Distance (ft)</span><input data-spacing-whatif="dist" type="number" min="0.1" step="0.1" value="' + escapeHtml(String(Number(data.dist || 0).toFixed(1))) + '"></label>' +
          '<label class="field"><span class="label">HFOV (deg)</span><input data-spacing-whatif="hfov" type="number" min="1" max="179" step="0.1" value="' + escapeHtml(String(Number(data.hfov || 0).toFixed(1))) + '"></label>' +
          '<label class="field"><span class="label">Overlap Target (%)</span><input data-spacing-whatif="ovPct" type="number" min="0" max="95" step="0.1" value="' + escapeHtml(String(Number(data.ovPct || 0).toFixed(1))) + '"></label>' +
        '</div>' +
        '<div class="btn-row" style="margin-top: 12px;">' +
          '<button id="spacingApplyCustomScenario" class="btn btn-primary" type="button">Apply Custom Spacing Check</button>' +
        '</div>' +
        '<p class="spacing-section-copy"><strong>Correction hints:</strong> reduce distance, widen HFOV, increase overlap enough to force safer spacing, or shorten the protected run if the imported perimeter assumption is wrong.</p>' +
      '</div>';
  }

  function readSpacingWhatIfInputs() {
    if (!els.assistant) return null;

    const values = {};
    els.assistant.querySelectorAll("[data-spacing-whatif]").forEach((input) => {
      values[input.dataset.spacingWhatif] = Number(input.value);
    });

    return values;
  }

  function applyCustomSpacingScenario(data) {
    const changes = readSpacingWhatIfInputs();
    if (!changes) return;

    const scenario = makeSpacingDesignScenario(
      data,
      "custom-spacing-check",
      "Custom Spacing Check",
      "User-defined correction using the assistant what-if controls.",
      changes,
      "Use this when the predefined branches do not match the real project constraint.",
      "Apply Custom Spacing Check",
      true
    );

    applyAssistantScenario(scenario);
  }

  function spacingDesignControlHtml(data, scenarios) {
    return '' +
      '<div class="spacing-advice-card">' +
        '<div class="spacing-section-kicker">Guided Correction Branches</div>' +
        '<h4 class="spacing-section-title">Choose why you are changing the design</h4>' +
        '<p class="spacing-section-copy">Each branch has a different design intent. Use the explanation before applying a correction so the result is traceable downstream.</p>' +
        '<div class="spacing-branch-list">' +
          scenarios.map((scenario) => {
            const disabled = !scenario || !scenario.canApply;
            const result = disabled ? "Unavailable for current geometry" : spacingScenarioSummary(scenario);
            const button = disabled
              ? '<button class="btn spacing-assistant-apply" type="button" disabled>Unavailable</button>'
              : '<button class="btn btn-primary spacing-assistant-apply" type="button" data-spacing-scenario="' + escapeHtml(scenario.id) + '">' + escapeHtml(scenario.actionLabel || "Apply Branch") + '</button>';

            return '' +
              '<div class="spacing-branch-item">' +
                '<div>' +
                  '<strong>' + escapeHtml(scenario.label || "Design Branch") + '</strong>' +
                  '<p>' + escapeHtml(spacingScenarioDecisionHelp(scenario)) + '</p>' +
                  '<p><strong>What changes:</strong> ' + escapeHtml(spacingControlFieldsLabel(scenario)) + '</p>' +
                  '<p><strong>Expected result:</strong> ' + escapeHtml(result) + '</p>' +
                '</div>' +
                button +
              '</div>';
          }).join("") +
        '</div>' +
      '</div>' +
      spacingWhatIfControlsHtml(data);
  }

  function renderSpacingAssistant(data) {
    if (!els.assistant) return;

    latestAssistantScenarios = buildAssistantScenarios(data);
    els.assistant.hidden = false;
    els.assistant.classList.add("full-output");

    const statusClass = assistantStatusClass(data);
    const statusLabel = assistantStatusLabel(data);

    els.assistant.innerHTML =
      '<div class="spacing-design-head">' +
        '<div>' +
          '<div class="spacing-design-kicker">Design Assistant</div>' +
          '<h3 class="spacing-design-title">Camera spacing design assistant</h3>' +
          '<p class="spacing-design-copy">This assistant follows the same guided design pattern as Lens Selection: diagnose the spacing pressure, explain the correction path, apply a branch, and carry the selected result into Blind Spot Check.</p>' +
        '</div>' +
        '<div class="spacing-design-status ' + escapeHtml(statusClass) + '">' + escapeHtml(statusLabel) + '</div>' +
      '</div>' +
      assistantModeHtml() +
      '<div class="spacing-design-layout spacing-primary-layout">' +
        '<div class="spacing-visual-card spacing-primary-visual">' +
          '<div class="spacing-section-kicker">Layout Visualization</div>' +
          '<h4 class="spacing-section-title">Spacing compared to usable coverage</h4>' +
          '<p class="spacing-section-copy">The protected run below compares actual camera-to-camera spacing against usable coverage width after overlap reserve is applied.</p>' +
          '<div class="spacing-visual-stage">' + spacingVisualSvg(data) + '</div>' +
          '<div class="spacing-target-strip">' +
            miniCard("Cameras", String(data.cams)) +
            miniCard("Actual Spacing", fmtFt(data.spacing)) +
            miniCard("Usable Width", fmtFt(data.usableWidth)) +
            miniCard("Overlap", fmtPct(data.ovPct, 1)) +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="spacing-design-split spacing-diagnostic-split">' +
        spacingPressureGraphHtml(data) +
        spacingPathToHealthyHtml(data) +
      '</div>' +
      '<div class="spacing-design-split spacing-action-split">' +
        spacingDesignControlHtml(data, latestAssistantScenarios) +
        spacingCarryForwardHtml(data) +
      '</div>' +
      '<div class="spacing-design-split spacing-review-split">' +
        '<div class="spacing-advice-card">' + dominantDriverHtml(data) + '</div>' +
        '<div class="spacing-advice-card">' + recommendationHtml(data, latestAssistantScenarios) + '</div>' +
      '</div>';

    els.assistant.querySelectorAll(".spacing-assistant-apply").forEach((button) => {
      button.addEventListener("click", () => {
        const scenario = latestAssistantScenarios.find((item) => item.id === button.dataset.spacingScenario);
        applyAssistantScenario(scenario);
      });
    });

    const customButton = els.assistant.querySelector("#spacingApplyCustomScenario");
    if (customButton) {
      customButton.addEventListener("click", () => applyCustomSpacingScenario(data));
    }
  }

  function applyAssistantScenario(scenario) {
    if (!scenario || !scenario.canApply) return;

    activeAssistantScenario = {
      id: scenario.id,
      label: scenario.label,
      intent: scenario.intent,
      changes: scenario.changes || {},
      len: scenario.len,
      dist: scenario.dist,
      hfov: scenario.hfov,
      ovPct: scenario.ovPct,
      cams: scenario.cams,
      spacing: scenario.spacing,
      usableWidth: scenario.usableWidth,
      rawWidth: scenario.rawWidth,
      ratio: scenario.ratio,
      spacingClass: scenario.spacingClass,
      note: scenario.note
    };

    if (Number.isFinite(Number(scenario.changes?.len))) {
      els.len.value = String(Number(scenario.changes.len.toFixed ? scenario.changes.len.toFixed(1) : scenario.changes.len));
      delete manualFlowOverrides.len;
    }

    if (Number.isFinite(Number(scenario.changes?.dist))) {
      els.dist.value = String(Number(scenario.changes.dist.toFixed ? scenario.changes.dist.toFixed(1) : scenario.changes.dist));
      delete manualFlowOverrides.dist;
    }

    if (Number.isFinite(Number(scenario.changes?.hfov))) {
      els.hfov.value = String(Number(scenario.changes.hfov.toFixed ? scenario.changes.hfov.toFixed(1) : scenario.changes.hfov));
      delete manualFlowOverrides.hfov;
    }

    if (Number.isFinite(Number(scenario.changes?.ovPct))) {
      els.ov.value = String(Number(scenario.changes.ovPct.toFixed ? scenario.changes.ovPct.toFixed(1) : scenario.changes.ovPct));
      delete manualFlowOverrides.ov;
    }

    renderFlowNote();
    calc();
  }

  function applyDefaults() {
    els.len.value = String(DEFAULTS.len);
    els.dist.value = String(DEFAULTS.dist);
    els.hfov.value = String(DEFAULTS.hfov);
    els.ov.value = String(DEFAULTS.ov);
  }

  function clearDownstream() {
    [
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

  function renderFlowNote() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEYS.spacing,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      title: "Flow Context",
      intro: "This step converts effective single-camera coverage into real camera-to-camera spacing along the protected perimeter."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const prev = flow.data || {};
    const dist = num(prev.dist);
    const hfov = num(prev.hfov);
    const ovPct = num(prev.ovPct);
    const effWidth = num(prev.effWidth);
    const width = num(prev.width);

    captureImportedFlowValue("dist", dist);
    captureImportedFlowValue("hfov", hfov);
    captureImportedFlowValue("ov", ovPct);

    if (canApplyFlowInputs()) {
      if (Number.isFinite(dist) && dist > 0) els.dist.value = String(Math.round(dist));
      if (Number.isFinite(hfov) && hfov > 0) els.hfov.value = String(Math.round(hfov));
      if (Number.isFinite(ovPct) && ovPct >= 0) els.ov.value = String(Math.round(ovPct));
    }

    const parts = [];
    if (Number.isFinite(effWidth) && effWidth > 0) parts.push(`Effective width: <strong>${fmtFt(effWidth)}</strong>`);
    if (Number.isFinite(width) && width > 0) parts.push(`Raw width: <strong>${fmtFt(width)}</strong>`);
    if (Number.isFinite(dist) && dist > 0) parts.push(`Distance: <strong>${fmtFt(dist)}</strong>`);
    if (Number.isFinite(hfov) && hfov > 0) parts.push(`HFOV: <strong>${fmt(hfov, 1)}°</strong>`);

    if (parts.length) {
      els.flowNote.hidden = false;
      els.flowNote.innerHTML = `
        <strong>Flow Context</strong><br>
        ${parts.join(" | ")}\n        ${renderManualOverrideNote()}
      `;
    }
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) {
      sessionStorage.removeItem(FLOW_KEYS.spacing);
      clearDownstream();
    }

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      flowKey: FLOW_KEYS.spacing,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter valid values and press Calculate."
    });
    hideSpacingAssistant();

    renderFlowNote();
  }

  function getInputs() {
    const len = num(els.len.value);
    const dist = num(els.dist.value);
    const hfov = num(els.hfov.value);
    const ovPct = num(els.ov.value);

    if (
      !Number.isFinite(len) || len <= 0 ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(ovPct) || ovPct < 0 || ovPct > 95
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, len, dist, hfov, ovPct };
  }

  function classifySpacing(ratio) {
    if (ratio < 0.8) return "Tight Spacing";
    if (ratio <= 1.05) return "Balanced Spacing";
    return "Wide Spacing";
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const rawWidth = 2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist;
    const usableWidth = rawWidth * (1 - (input.ovPct / 100));

    const cams = Math.max(1, Math.ceil(input.len / usableWidth));
    const spacing = input.len / cams;
    const ratio = usableWidth > 0 ? spacing / usableWidth : 0;

    const gapExposureMetric = ratio > 1 ? Math.min((ratio - 1) * 250, 100) : 0;
    const compressionMetric = ratio < 1 ? Math.min((1 - ratio) * 100, 100) : 0;
    const reserveMetric = input.ovPct;

    const metrics = [
      {
        label: "Gap Exposure",
        value: gapExposureMetric,
        displayValue: ratio > 1 ? fmtPct((ratio - 1) * 100, 1) : "0.0%"
      },
      {
        label: "Spacing Compression",
        value: compressionMetric,
        displayValue: ratio < 1 ? fmtPct((1 - ratio) * 100, 1) : "0.0%"
      },
      {
        label: "Overlap Reserve",
        value: reserveMetric,
        displayValue: fmtPct(input.ovPct, 1)
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(gapExposureMetric, compressionMetric, reserveMetric),
      metrics,
      healthyMax: 20,
      watchMax: 35
    });

    const spacingClass = classifySpacing(ratio);

    let interpretation = `With a usable camera footprint of about ${fmtFt(usableWidth)}, a ${fmtFt(input.len)} perimeter needs ${cams} camera${cams === 1 ? "" : "s"} to maintain the requested overlap. That produces an actual spacing of about ${fmtFt(spacing)} between camera centers.`;

    if (spacingClass === "Wide Spacing") {
      interpretation += ` The layout is running wider than the usable footprint, which raises the chance of soft gaps or outright blind zones once real mounting tolerances and scene geometry are applied.`;
    } else if (spacingClass === "Tight Spacing") {
      interpretation += ` The layout is conservative and overlap-heavy, which reduces blind-spot risk but drives camera count and compresses coverage efficiency.`;
    } else {
      interpretation += ` The spacing is balanced against usable width, which is typically the healthiest tradeoff between continuity and camera efficiency.`;
    }

    let dominantConstraint = "";
    if (spacingClass === "Wide Spacing") {
      dominantConstraint = "Gap exposure is the dominant limiter. Camera spacing is outrunning the usable footprint, so weak zones between views become the first operational risk.";
    } else if (spacingClass === "Tight Spacing") {
      dominantConstraint = "Spacing compression is the dominant limiter. The design is safe from a continuity standpoint, but it is consuming more cameras than the coverage width strictly requires.";
    } else if (input.ovPct >= 25) {
      dominantConstraint = "Overlap reserve is the dominant limiter. The spacing still works, but the reserve target is starting to compress usable width enough to affect layout efficiency.";
    } else {
      dominantConstraint = "The layout is balanced. Spacing, usable width, and reserve target are still working together without a strong limiting factor.";
    }

    let guidance = "";
    if (spacingClass === "Wide Spacing") {
      guidance = "Reduce spacing, widen usable footprint, or increase camera count before treating this as a final layout. Then use Blind Spot Check to confirm the remaining continuity risk.";
    } else if (spacingClass === "Tight Spacing") {
      guidance = "This layout is conservative. Review whether the overlap target or camera count can be relaxed without creating coverage gaps, then confirm in Blind Spot Check.";
    } else {
      guidance = "Spacing is in a practical range. Continue to Blind Spot Check next to verify that the geometry still closes gaps across the protected span.";
    }

    return {
      ok: true,
      ...input,
      rawWidth,
      usableWidth,
      cams,
      spacing,
      ratio,
      spacingClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function writeFlow(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);
    const assistantScenarioMeta = assistantScenarioMetadata();
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.spacing, {
      category: CATEGORY,
      step: STEP,
      data: {
        len: data.len,
        dist: data.dist,
        hfov: data.hfov,
        ovPct: data.ovPct,
        rawWidth: data.rawWidth,
        usableWidth: data.usableWidth,
        cams: data.cams,
        spacing: data.spacing,
        ratio: data.ratio,
        spacingClass: data.spacingClass,
        interpretation: data.interpretation,
        guidance: data.guidance,
        sourceMode: sourceModeForCurrentResult(manualOverrideMeta),
        scenarioMode: assistantScenarioMeta ? assistantScenarioMeta.label : null,
        assistantSelected: !!assistantScenarioMeta,
        assistantScenario: assistantScenarioMeta,
        manualOverrides: manualOverrideMeta
      }
    });
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    hideSpacingAssistant();
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      summaryRows: [
        { label: "Raw Coverage Width", value: fmtFt(data.rawWidth) },
        { label: "Usable Width", value: fmtFt(data.usableWidth) },
        { label: "Camera Count", value: `${data.cams}` },
        { label: "Actual Spacing", value: fmtFt(data.spacing) }
      ],
      derivedRows: [
        { label: "Perimeter Length", value: fmtFt(data.len, 0) },
        { label: "Distance to Target", value: fmtFt(data.dist) },
        { label: "Horizontal FOV", value: `${fmt(data.hfov, 1)}°` },
        { label: "Overlap Target", value: fmtPct(data.ovPct, 1) },
        { label: "Spacing Ratio", value: fmt(data.ratio, 2) },
        { label: "Spacing Classification", value: data.spacingClass },
        { label: "Source Mode", value: sourceModeForCurrentResult(getManualOverrideMetadata(data)) },
        ...(activeAssistantScenario ? [{ label: "Assistant Branch", value: activeAssistantScenario.label }] : [])
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });

    writeFlow(data);
    renderSpacingAssistant(data);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) return renderError(data.message);
    renderSuccess(data);
  }

  function reset() {
    resetFlowOverrideState();
    clearAssistantScenario();
    hideSpacingAssistant();
    applyDefaults();
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function bind() {
    ["len", "dist", "hfov", "ov"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => {
        clearAssistantScenario();
        markFlowInputOverride(id);
        renderFlowNote();
        invalidate({ clearFlow: true });
      });
      el.addEventListener("change", () => {
        clearAssistantScenario();
        markFlowInputOverride(id);
        renderFlowNote();
        invalidate({ clearFlow: true });
      });
    });

    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);

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
    if (unlocked) initTool();

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked && !els.toolCard.dataset.initialized) {
        els.toolCard.dataset.initialized = "true";
        initTool();
      }
    }, 400);
  });
})();