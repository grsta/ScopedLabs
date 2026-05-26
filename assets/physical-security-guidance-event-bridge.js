(function () {
  "use strict";

  const VERSION = "physical-security-guidance-event-bridge-001-foundation";
  const EVENT_NAME = "scopedlabs:physical-security-guidance-updated";

  const state = {
    signatures: Object.create(null),
    dirty: Object.create(null)
  };

  function normalizeSlug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function stableValue(value) {
    if (Array.isArray(value)) {
      return value.map(stableValue);
    }

    if (value && typeof value === "object") {
      return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
          if (typeof value[key] !== "function" && typeof value[key] !== "undefined") {
            acc[key] = stableValue(value[key]);
          }
          return acc;
        }, {});
    }

    return value;
  }

  function guidanceStatus(guidance) {
    return String(
      guidance && (
        guidance.status ||
        guidance.state ||
        guidance.level ||
        guidance.severity ||
        ""
      )
    ).trim().toLowerCase();
  }

  function isValidGuidance(guidance) {
    const status = guidanceStatus(guidance);

    return !!(
      guidance &&
      typeof guidance === "object" &&
      guidance.ok !== false &&
      /^(healthy|watch|risk)$/.test(status)
    );
  }

  function signatureFromGuidance(guidance) {
    if (!isValidGuidance(guidance)) {
      return "";
    }

    return JSON.stringify(stableValue({
      ok: guidance.ok !== false,
      status: guidanceStatus(guidance),
      mode: guidance.mode || "",
      action: guidance.action || guidance.recommendedAction || "",
      reason: guidance.reason || "",
      confidence: guidance.confidence || "",
      nextStep: guidance.nextStep || guidance.next || "",
      title: guidance.title || guidance.heading || "",
      summary: guidance.summary || guidance.message || guidance.description || "",
      values: guidance.values || guidance.metrics || guidance.result || guidance.results || guidance.data || null
    }));
  }

  function getMemoryRecord(tool) {
    const memory = window.ScopedLabsPhysicalSecurityGuidanceMemory;

    if (!memory || typeof memory.getToolGuidance !== "function") {
      return null;
    }

    return memory.getToolGuidance(tool);
  }

  function saveMemory(tool, guidance) {
    const memory = window.ScopedLabsPhysicalSecurityGuidanceMemory;

    if (!memory || typeof memory.saveToolGuidance !== "function") {
      return false;
    }

    return memory.saveToolGuidance(tool, guidance);
  }

  function clearMemory(tool) {
    const memory = window.ScopedLabsPhysicalSecurityGuidanceMemory;

    if (!memory || typeof memory.clearToolGuidance !== "function") {
      return false;
    }

    return memory.clearToolGuidance(tool);
  }

  function publishGuidanceChanged(options) {
    const detail = Object.assign({
      category: "physical-security",
      source: "guidance-event-bridge",
      version: VERSION,
      eventName: EVENT_NAME,
      timestamp: new Date().toISOString()
    }, options || {});

    detail.tool = normalizeSlug(detail.tool);
    detail.category = normalizeSlug(detail.category || "physical-security");
    detail.signature = detail.signature || signatureFromGuidance(detail.guidance);

    if (!detail.tool || !isValidGuidance(detail.guidance) || !detail.signature) {
      return false;
    }

    saveMemory(detail.tool, detail.guidance);

    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));

    return detail;
  }

  function publishIfChanged(options) {
    const detail = Object.assign({}, options || {});
    const tool = normalizeSlug(detail.tool);
    const guidance = detail.guidance;
    const signature = signatureFromGuidance(guidance);

    if (!tool || !isValidGuidance(guidance) || !signature) {
      return false;
    }

    const memoryRecord = getMemoryRecord(tool);
    const missingMemory = !memoryRecord;
    const changed = state.signatures[tool] !== signature;
    const dirty = !!state.dirty[tool];

    if (!changed && !dirty && !missingMemory) {
      return false;
    }

    state.signatures[tool] = signature;
    state.dirty[tool] = false;

    return publishGuidanceChanged(Object.assign({}, detail, {
      tool,
      signature
    }));
  }

  function markDirty(tool) {
    const slug = normalizeSlug(tool);

    if (slug) {
      state.dirty[slug] = true;
    }

    return slug;
  }

  function clearTool(tool) {
    const slug = normalizeSlug(tool);

    if (!slug) {
      return false;
    }

    state.dirty[slug] = true;
    clearMemory(slug);

    return true;
  }

  function resetTool(tool) {
    const slug = normalizeSlug(tool);

    if (!slug) {
      return false;
    }

    delete state.signatures[slug];
    delete state.dirty[slug];

    return true;
  }

  function createSampler(options) {
    const settings = Object.assign({
      category: "physical-security",
      delayMs: 120
    }, options || {});

    const tool = normalizeSlug(settings.tool);

    if (!tool || typeof settings.getGuidance !== "function") {
      return null;
    }

    let timer = null;

    function sample(source) {
      window.clearTimeout(timer);

      timer = window.setTimeout(() => {
        const guidance = settings.getGuidance();

        const published = publishIfChanged({
          category: settings.category,
          tool,
          guidance,
          source: source || settings.source || "guidance-sampler"
        });

        if (published && typeof settings.onPublished === "function") {
          settings.onPublished(published);
        }
      }, settings.delayMs);

      return true;
    }

    return {
      tool,
      sample,
      markDirty: () => markDirty(tool),
      clear: () => clearTool(tool),
      reset: () => resetTool(tool),
      signature: () => state.signatures[tool] || ""
    };
  }

  window.ScopedLabsPhysicalSecurityGuidanceEventBridge = {
    version: VERSION,
    eventName: EVENT_NAME,
    normalizeSlug,
    isValidGuidance,
    signatureFromGuidance,
    publishGuidanceChanged,
    publishIfChanged,
    markDirty,
    clearTool,
    resetTool,
    createSampler
  };
})();