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
      controlledField: "ov",
      overlapTargetPct: activeAssistantScenario.ovPct,
      cameraCount: activeAssistantScenario.cams,
      actualSpacingFt: activeAssistantScenario.spacing,
      usableWidthFt: activeAssistantScenario.usableWidth,
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

  function buildAssistantScenarios(data) {
    const scenarios = [];

    const continuityOverlap = overlapForTarget(data, data.cams + 1, 0.82);
    const continuityModel = continuityOverlap === null ? null : simulateSpacingBranch(data, continuityOverlap);
    scenarios.push(makeAssistantScenario(
      "continuity-priority",
      "Continuity Priority",
      "Reduce blind-spot risk with tighter spacing and stronger overlap reserve.",
      continuityModel,
      continuityModel
        ? "Use this when seam closure is more important than minimizing camera count. Confirm the final geometry in Blind Spot Check."
        : "The current geometry cannot add a clean continuity branch through overlap alone. Consider reducing distance, widening HFOV, or increasing planned camera count manually.",
      !!continuityModel
    ));

    const balancedOverlap = overlapForTarget(data, data.cams, 0.92);
    const balancedModel = balancedOverlap === null ? simulateSpacingBranch(data, data.ovPct) : simulateSpacingBranch(data, balancedOverlap);
    scenarios.push(makeAssistantScenario(
      "balanced-layout",
      "Balanced Layout",
      "Keep spacing, usable width, and overlap reserve in a practical middle range.",
      balancedModel,
      "Use this as the default branch when the goal is a clean handoff to Blind Spot Check without over-compressing camera spacing.",
      Number.isFinite(balancedModel?.ovPct)
    ));

    const efficiencyTarget = data.cams > 1 ? data.cams - 1 : null;
    const efficiencyOverlap = efficiencyTarget ? overlapForTarget(data, efficiencyTarget, 0.98) : null;
    const efficiencyModel = efficiencyOverlap === null ? null : simulateSpacingBranch(data, efficiencyOverlap);
    scenarios.push(makeAssistantScenario(
      "camera-count-efficiency",
      "Camera Count Efficiency",
      "Test whether the protected run can stay viable with fewer cameras.",
      efficiencyModel,
      efficiencyModel
        ? "Use only when the next Blind Spot Check still shows acceptable continuity. This branch trades reserve for camera-count efficiency."
        : "Dropping a camera is not viable from the current geometry without changing upstream assumptions or accepting gap risk.",
      !!efficiencyModel
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

  function spacingProblemLabel(data) {
    if (!data) return "Unknown";

    if (data.spacingClass === "Wide Spacing") return "Spacing is outrunning usable width";
    if (data.spacingClass === "Tight Spacing") return "Spacing is conservative and camera-heavy";
    if (Number(data.ovPct) >= 25) return "Overlap reserve is compressing usable width";

    return "Spacing is balanced";
  }

  function spacingCorrectionSummary(data) {
    if (!data) return "";

    if (data.spacingClass === "Wide Spacing") {
      return "Use the correction branches below to tighten camera spacing, increase overlap reserve, or increase camera count before relying on downstream blind-spot validation.";
    }

    if (data.spacingClass === "Tight Spacing") {
      return "The layout is probably safe for continuity, but it may be over-built. Use the efficiency branch only if Blind Spot Check still confirms clean coverage.";
    }

    if (Number(data.ovPct) >= 25) {
      return "The spacing works, but the overlap target is starting to consume useful coverage width. Consider a balanced branch before moving downstream.";
    }

    return "The current spacing is a clean baseline. Continue to Blind Spot Check, or apply a branch only if the project priority changes.";
  }

  function spacingFixCard(title, body, tone) {
    return '' +
      '<div class="spacing-branch-item ' + escapeHtml(tone || "") + '">' +
        '<div>' +
          '<strong>' + escapeHtml(title) + '</strong>' +
          '<p>' + escapeHtml(body) + '</p>' +
        '</div>' +
      '</div>';
  }

  function spacingDiagnosticHtml(data) {
    const mode = sourceModeForCurrentResult(getManualOverrideMetadata(data));
    const blocker = spacingProblemLabel(data);

    return '' +
      '<div class="spacing-advice-card">' +
        '<div class="spacing-section-kicker">Executive Diagnostic Snapshot</div>' +
        '<h4 class="spacing-section-title">' + escapeHtml(blocker) + '</h4>' +
        '<p class="spacing-section-copy">' + escapeHtml(spacingCorrectionSummary(data)) + '</p>' +
        '<div class="spacing-mini-grid">' +
          miniCard("Status", assistantStatusLabel(data)) +
          miniCard("Source", mode) +
          miniCard("Main Blocker", blocker) +
          miniCard("Next Step", "Blind Spot Check") +
        '</div>' +
      '</div>';
  }

  function spacingCorrectionPathHtml(data) {
    const cards = [];

    if (data.spacingClass === "Wide Spacing") {
      cards.push(spacingFixCard("Primary correction", "Add a camera or reduce the target spacing so actual spacing no longer exceeds usable width.", "risk"));
      cards.push(spacingFixCard("Secondary correction", "Increase overlap reserve only if the added reserve still produces a practical camera count.", "watch"));
      cards.push(spacingFixCard("Upstream correction", "If the geometry is unrealistic, recalculate upstream distance or HFOV before continuing.", "watch"));
    } else if (data.spacingClass === "Tight Spacing") {
      cards.push(spacingFixCard("Primary correction", "Keep this branch if continuity is the priority and camera count is acceptable.", "healthy"));
      cards.push(spacingFixCard("Efficiency check", "Try the camera-count efficiency branch only if downstream Blind Spot Check remains healthy.", "watch"));
      cards.push(spacingFixCard("Do not over-correct", "Avoid relaxing overlap so much that the next tool has to absorb hidden gap risk.", "watch"));
    } else {
      cards.push(spacingFixCard("Recommended path", "Carry this balanced result into Blind Spot Check and validate the final gap condition.", "healthy"));
      cards.push(spacingFixCard("Optional correction", "Use the continuity branch if seam closure matters more than camera efficiency.", "watch"));
      cards.push(spacingFixCard("Hold baseline", "Do not change upstream assumptions unless distance, HFOV, or perimeter length is wrong.", "healthy"));
    }

    return '' +
      '<div class="spacing-advice-card">' +
        '<div class="spacing-section-kicker">Correction Controls</div>' +
        '<h4 class="spacing-section-title">How to move this result toward healthy</h4>' +
        '<p class="spacing-section-copy">Use these controls as design actions, not just labels. Apply a branch only when it matches the project priority.</p>' +
        '<div class="spacing-branch-list">' + cards.join("") + '</div>' +
      '</div>';
  }

  function spacingBranchCardHtml(scenario) {
    const disabled = !scenario || !scenario.canApply;
    const label = scenario?.label || "Unavailable";
    const intent = scenario?.intent || "This branch is not available for the current geometry.";
    const note = scenario?.note || "";
    const details = disabled
      ? "Unavailable for current geometry"
      : [
          Number.isFinite(scenario.cams) ? scenario.cams + " cameras" : null,
          Number.isFinite(scenario.spacing) ? fmtFt(scenario.spacing) + " spacing" : null,
          Number.isFinite(scenario.ovPct) ? fmtPct(scenario.ovPct, 1) + " overlap" : null
        ].filter(Boolean).join(" | ");

    const button = disabled
      ? '<button class="btn spacing-assistant-apply" type="button" disabled>Unavailable</button>'
      : '<button class="btn btn-primary spacing-assistant-apply" type="button" data-spacing-scenario="' + escapeHtml(scenario.id) + '">Apply: ' + escapeHtml(details) + '</button>';

    return '' +
      '<div class="spacing-branch-item">' +
        '<div>' +
          '<strong>' + escapeHtml(label) + '</strong>' +
          '<p>' + escapeHtml(intent) + '</p>' +
          '<p><strong>Result:</strong> ' + escapeHtml(details) + '</p>' +
          (note ? '<p><strong>Use when:</strong> ' + escapeHtml(note) + '</p>' : '') +
        '</div>' +
        button +
      '</div>';
  }

  function spacingBranchesHtml(scenarios) {
    return '' +
      '<div class="spacing-advice-card">' +
        '<div class="spacing-section-kicker">Assisted Correction Branches</div>' +
        '<h4 class="spacing-section-title">Choose the branch that fixes the actual design pressure</h4>' +
        '<p class="spacing-section-copy">Each branch updates the spacing assumption and recalculates the tool. The chosen branch is saved as an assisted scenario for downstream handoff.</p>' +
        '<div class="spacing-branch-list">' + scenarios.map(spacingBranchCardHtml).join("") + '</div>' +
      '</div>';
  }

  function spacingCarryForwardHtml(data) {
    return '' +
      '<div class="spacing-advice-card">' +
        '<div class="spacing-section-kicker">Carry Forward</div>' +
        '<h4 class="spacing-section-title">What Blind Spot Check will receive</h4>' +
        '<p class="spacing-section-copy">The next tool should validate the actual coverage gap using the spacing result selected here.</p>' +
        '<div class="spacing-mini-grid">' +
          miniCard("Cameras", String(data.cams)) +
          miniCard("Spacing", fmtFt(data.spacing)) +
          miniCard("Distance", fmtFt(data.dist)) +
          miniCard("HFOV", fmt(data.hfov, 1) + " deg") +
        '</div>' +
      '</div>';
  }

  function renderSpacingAssistant(data) {
    if (!els.assistant) return;

    latestAssistantScenarios = buildAssistantScenarios(data);
    els.assistant.hidden = false;

    const statusClass = assistantStatusClass(data);
    const statusLabel = assistantStatusLabel(data);

    els.assistant.innerHTML =
      '<div class="spacing-design-head">' +
        '<div>' +
          '<div class="spacing-design-kicker">Design Assistant</div>' +
          '<h3 class="spacing-design-title">Camera spacing design assistant</h3>' +
          '<p class="spacing-design-copy">This assistant explains whether the spacing result is healthy, what is driving risk, which correction branch to apply, and what will be carried into Blind Spot Check.</p>' +
        '</div>' +
        '<div class="spacing-design-status ' + escapeHtml(statusClass) + '">' + escapeHtml(statusLabel) + '</div>' +
      '</div>' +
      assistantModeHtml() +
      spacingDiagnosticHtml(data) +
      '<div class="spacing-design-layout">' +
        '<div class="spacing-visual-card">' +
          '<div class="spacing-section-kicker">Layout Visualization</div>' +
          '<h4 class="spacing-section-title">Spacing compared to usable coverage</h4>' +
          '<p class="spacing-section-copy">The protected run below compares actual camera spacing against the usable footprint after overlap reserve is applied.</p>' +
          '<div class="spacing-visual-stage">' + spacingVisualSvg(data) + '</div>' +
          '<div class="spacing-mini-grid">' +
            miniCard("Cameras", String(data.cams)) +
            miniCard("Actual Spacing", fmtFt(data.spacing)) +
            miniCard("Usable Width", fmtFt(data.usableWidth)) +
            miniCard("Overlap", fmtPct(data.ovPct, 1)) +
          '</div>' +
        '</div>' +
        spacingCorrectionPathHtml(data) +
      '</div>' +
      '<div class="spacing-design-split">' +
        spacingBranchesHtml(latestAssistantScenarios) +
        spacingCarryForwardHtml(data) +
      '</div>' +
      '<div class="spacing-design-split">' +
        '<div class="spacing-advice-card">' + dominantDriverHtml(data) + '</div>' +
        '<div class="spacing-advice-card">' + recommendationHtml(data, latestAssistantScenarios) + '</div>' +
      '</div>';

    els.assistant.querySelectorAll(".spacing-assistant-apply").forEach((button) => {
      button.addEventListener("click", () => {
        const scenario = latestAssistantScenarios.find((item) => item.id === button.dataset.spacingScenario);
        applyAssistantScenario(scenario);
      });
    });
  }

  function applyAssistantScenario(scenario) {
    if (!scenario || !scenario.canApply || !Number.isFinite(scenario.ovPct)) return;

    activeAssistantScenario = {
      id: scenario.id,
      label: scenario.label,
      intent: scenario.intent,
      ovPct: scenario.ovPct,
      cams: scenario.cams,
      spacing: scenario.spacing,
      usableWidth: scenario.usableWidth,
      ratio: scenario.ratio,
      spacingClass: scenario.spacingClass,
      note: scenario.note
    };

    els.ov.value = String(Number(scenario.ovPct.toFixed(1)));
    delete manualFlowOverrides.ov;
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