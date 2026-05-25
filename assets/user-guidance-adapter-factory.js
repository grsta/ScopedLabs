(function () {
  "use strict";

  const VERSION = "user-guidance-adapter-factory-001-foundation";

  function clone(value) {
    if (value == null) return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function getHelper() {
    return window.ScopedLabsUserAssistantGuidance || null;
  }

  function fallbackExplain(guidance) {
    if (!guidance) {
      return {
        ok: false,
        summary: "No guidance has been generated yet.",
        nextStep: "Run a calculation first."
      };
    }

    const primary = guidance.primaryRecommendation || {};
    return {
      ok: true,
      status: guidance.status || "unknown",
      mode: guidance.mode || "unknown",
      action: primary.action || "",
      reason: primary.reason || "",
      expected: primary.expectedResult || "",
      confidence: primary.confidence || "",
      nextStep: primary.nextStep || "",
      guidance: clone(guidance)
    };
  }

  function normalizeGuidanceInput(input, config) {
    const helper = getHelper();
    const base = input && typeof input === "object" ? clone(input) : {};

    if (!base.status) base.status = "unknown";
    if (!base.mode) base.mode = "pipeline";

    if (!base.primaryRecommendation) {
      base.primaryRecommendation = {
        action: "Review current assumptions",
        reason: "The current result needs review before it is carried forward.",
        expectedResult: "",
        confidence: "",
        nextStep: ""
      };
    }

    if (!Array.isArray(base.secondaryOptions)) {
      base.secondaryOptions = [];
    }

    if (!base.sourceIntegrity) {
      const sourceMode = base.mode || "pipeline";
      let sourceLabel = sourceMode === "manual-override" ? "Manual override" : "Clean pipeline";
      let sourceMessage = "Use this result only when the assumptions match the intended design branch.";

      if (helper && typeof helper.sourceLabelForMode === "function") {
        sourceLabel = helper.sourceLabelForMode(sourceMode);
      }

      if (helper && typeof helper.sourceMessageForMode === "function") {
        sourceMessage = helper.sourceMessageForMode(sourceMode);
      }

      base.sourceIntegrity = {
        label: sourceLabel,
        mode: sourceMode,
        affectedFields: [],
        message: sourceMessage
      };
    }

    if (!base.reportSummary) {
      const primary = base.primaryRecommendation || {};
      base.reportSummary = [
        primary.action || "",
        primary.reason || "",
        primary.expectedResult ? "Expected result: " + primary.expectedResult : ""
      ].filter(Boolean).join(" ");
    }

    if (!base.carryForward) {
      base.carryForward = {
        allowed: true,
        nextTool: config.nextTool || "",
        message: config.carryForwardMessage || ""
      };
    }

    return base;
  }

  function createAdapter(config) {
    if (!config || typeof config !== "object") {
      throw new Error("createAdapter(config) requires a configuration object.");
    }

    if (!config.toolKey) {
      throw new Error("Guidance adapter config is missing toolKey.");
    }

    if (!config.globalName) {
      throw new Error("Guidance adapter config is missing globalName.");
    }

    if (typeof config.buildGuidance !== "function") {
      throw new Error("Guidance adapter config requires buildGuidance(data).");
    }

    let latestGuidance = null;

    function build(data) {
      const helper = getHelper();
      const input = normalizeGuidanceInput(config.buildGuidance(data), config);

      if (helper && typeof helper.createGuidance === "function") {
        return helper.createGuidance(input);
      }

      return Object.assign({
        version: VERSION + "-fallback"
      }, input);
    }

    function update(data) {
      try {
        latestGuidance = build(data);
      } catch (error) {
        latestGuidance = {
          version: VERSION + "-error",
          status: "unknown",
          mode: "unknown",
          error: error && error.message ? error.message : String(error || "Unknown adapter error")
        };
      }

      return clone(latestGuidance);
    }

    function clear() {
      latestGuidance = null;
    }

    function getLastGuidance() {
      return clone(latestGuidance);
    }

    function explainLastGuidance() {
      const helper = getHelper();

      if (helper && typeof helper.explainGuidance === "function" && latestGuidance) {
        return helper.explainGuidance(latestGuidance);
      }

      return fallbackExplain(latestGuidance);
    }

    function attachGlobal() {
      window[config.globalName] = Object.freeze({
        version: config.version || VERSION,
        toolKey: config.toolKey,
        getLastGuidance,
        explainLastGuidance,
        updateFromData: update,
        clear
      });

      return window[config.globalName];
    }

    return Object.freeze({
      version: config.version || VERSION,
      toolKey: config.toolKey,
      globalName: config.globalName,
      update,
      clear,
      getLastGuidance,
      explainLastGuidance,
      attachGlobal
    });
  }

  window.ScopedLabsUserGuidanceAdapterFactory = Object.freeze({
    version: VERSION,
    cloneGuidance: clone,
    createAdapter
  });
})();