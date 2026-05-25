(function (root) {
  "use strict";

  const VERSION = "user-assistant-guidance-001-schema-foundation";

  const VALID_STATUSES = new Set(["healthy", "watch", "risk", "setup", "unknown"]);
  const VALID_MODES = new Set(["pipeline", "manual-override", "assistant-scenario", "mixed", "setup", "unknown"]);

  function text(value, fallback) {
    const clean = String(value == null ? "" : value).trim();
    return clean || String(fallback == null ? "" : fallback);
  }

  function bool(value, fallback) {
    if (typeof value === "boolean") return value;
    return fallback === true;
  }

  function list(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  function normalizeStatus(value) {
    const clean = text(value, "unknown").toLowerCase();
    return VALID_STATUSES.has(clean) ? clean : "unknown";
  }

  function normalizeMode(value) {
    const clean = text(value, "unknown").toLowerCase();
    return VALID_MODES.has(clean) ? clean : "unknown";
  }

  function normalizePrimaryRecommendation(value) {
    const source = value && typeof value === "object" ? value : {};

    return {
      action: text(source.action, "Review the current design result."),
      reason: text(source.reason, "The current design should be reviewed before carrying it forward."),
      expectedResult: text(source.expectedResult, "The corrected result should improve the limiting design condition."),
      confidence: text(source.confidence, "Guidance"),
      nextStep: text(source.nextStep, "Review the next pipeline step.")
    };
  }

  function normalizeSecondaryOption(value) {
    const source = value && typeof value === "object" ? value : {};

    return {
      label: text(source.label, "Alternative option"),
      intent: text(source.intent, "Use this option when the project priority differs from the primary recommendation."),
      expectedResult: text(source.expectedResult, "This option should improve one design tradeoff while potentially affecting another."),
      tradeoff: text(source.tradeoff, "Review tradeoffs before applying."),
      canApply: bool(source.canApply, true)
    };
  }

  function normalizeSourceIntegrity(value) {
    const source = value && typeof value === "object" ? value : {};
    const mode = normalizeMode(source.mode);

    return {
      label: text(source.label, sourceLabelForMode(mode)),
      mode,
      affectedFields: list(source.affectedFields),
      message: text(source.message, sourceMessageForMode(mode))
    };
  }

  function normalizeCarryForward(value) {
    const source = value && typeof value === "object" ? value : {};

    return {
      allowed: bool(source.allowed, true),
      nextTool: text(source.nextTool, ""),
      message: text(source.message, "Use this result only when the assumptions match the intended design path.")
    };
  }

  function sourceLabelForMode(mode) {
    if (mode === "manual-override") return "Manual override";
    if (mode === "assistant-scenario") return "Assisted scenario";
    if (mode === "mixed") return "Mixed scenario";
    if (mode === "setup") return "Setup / planning entry";
    if (mode === "pipeline") return "Clean pipeline";
    return "Source status unknown";
  }

  function sourceMessageForMode(mode) {
    if (mode === "manual-override") {
      return "This is a local what-if branch. Recalculate upstream if this value should become the clean pipeline assumption.";
    }

    if (mode === "assistant-scenario") {
      return "This recommendation reflects the selected assistant scenario.";
    }

    if (mode === "mixed") {
      return "This result combines manual edits and an assistant scenario. Treat it as a local design branch until upstream assumptions are reconciled.";
    }

    if (mode === "setup") {
      return "This step defines planning context for downstream tools.";
    }

    if (mode === "pipeline") {
      return "This recommendation is based on the active pipeline assumptions.";
    }

    return "Source status could not be determined.";
  }

  function createGuidance(input) {
    const source = input && typeof input === "object" ? input : {};
    const mode = normalizeMode(source.mode || source.sourceMode);
    const status = normalizeStatus(source.status);

    const guidance = {
      version: VERSION,
      status,
      mode,
      primaryRecommendation: normalizePrimaryRecommendation(source.primaryRecommendation || {
        action: source.action,
        reason: source.reason,
        expectedResult: source.expectedResult,
        confidence: source.confidence,
        nextStep: source.nextStep
      }),
      secondaryOptions: list(source.secondaryOptions).map(normalizeSecondaryOption),
      sourceIntegrity: normalizeSourceIntegrity(source.sourceIntegrity || {
        mode,
        label: source.sourceLabel,
        affectedFields: source.affectedFields,
        message: source.sourceMessage
      }),
      reportSummary: text(source.reportSummary, ""),
      carryForward: normalizeCarryForward(source.carryForward)
    };

    if (!guidance.reportSummary) {
      guidance.reportSummary = guidance.primaryRecommendation.action + " " + guidance.primaryRecommendation.reason;
    }

    return guidance;
  }

  function validateGuidance(value) {
    const guidance = value && typeof value === "object" ? value : {};
    const issues = [];

    if (!VALID_STATUSES.has(String(guidance.status || "").toLowerCase())) {
      issues.push("status must be healthy, watch, risk, setup, or unknown");
    }

    if (!VALID_MODES.has(String(guidance.mode || "").toLowerCase())) {
      issues.push("mode must be pipeline, manual-override, assistant-scenario, mixed, setup, or unknown");
    }

    if (!guidance.primaryRecommendation || typeof guidance.primaryRecommendation !== "object") {
      issues.push("primaryRecommendation object is required");
    } else {
      ["action", "reason", "expectedResult", "nextStep"].forEach((field) => {
        if (!text(guidance.primaryRecommendation[field], "")) {
          issues.push("primaryRecommendation." + field + " is required");
        }
      });
    }

    if (!guidance.sourceIntegrity || typeof guidance.sourceIntegrity !== "object") {
      issues.push("sourceIntegrity object is required");
    }

    if (!text(guidance.reportSummary, "")) {
      issues.push("reportSummary is required");
    }

    return {
      ok: issues.length === 0,
      issues
    };
  }

  function explainGuidance(value) {
    const guidance = createGuidance(value);
    const validation = validateGuidance(guidance);

    return {
      ok: validation.ok,
      status: guidance.status,
      mode: guidance.mode,
      action: guidance.primaryRecommendation.action,
      reason: guidance.primaryRecommendation.reason,
      expectedResult: guidance.primaryRecommendation.expectedResult,
      nextStep: guidance.primaryRecommendation.nextStep,
      source: guidance.sourceIntegrity.label,
      reportSummary: guidance.reportSummary,
      issues: validation.issues
    };
  }

  const api = Object.freeze({
    version: VERSION,
    createGuidance,
    validateGuidance,
    explainGuidance,
    sourceLabelForMode,
    sourceMessageForMode
  });

  root.ScopedLabsUserAssistantGuidance = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
