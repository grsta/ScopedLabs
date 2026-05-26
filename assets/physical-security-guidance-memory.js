(function () {
  "use strict";

  const VERSION = "physical-security-guidance-memory-001-session-foundation";
  const CATEGORY = "physical-security";
  const STORAGE_KEY = "scopedlabs:physical-security:guidance-memory:v1";
  const MAX_AGE_MS = 1000 * 60 * 60 * 8;

  const PIPELINE_ORDER = [
    "scene-illumination",
    "mounting-height",
    "field-of-view",
    "camera-coverage-area",
    "camera-spacing",
    "blind-spot-check",
    "pixel-density",
    "lens-selection",
    "face-recognition-range",
    "license-plate-range"
  ];

  function clone(value) {
    if (value == null) return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function now() {
    return Date.now();
  }

  function canUseStorage() {
    try {
      return !!window.sessionStorage;
    } catch {
      return false;
    }
  }

  function normalizeStatus(status) {
    const value = String(status || "").toLowerCase();

    if (value.includes("risk") || value.includes("fail") || value.includes("blocked")) return "risk";
    if (value.includes("watch") || value.includes("warning") || value.includes("caution")) return "watch";
    if (value.includes("healthy") || value.includes("safe") || value.includes("ok")) return "healthy";

    return "unknown";
  }

  function emptyStore() {
    return {
      version: VERSION,
      category: CATEGORY,
      createdAt: new Date().toISOString(),
      updatedAt: "",
      tools: {}
    };
  }

  function readStore() {
    if (!canUseStorage()) return emptyStore();

    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyStore();

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return emptyStore();
      if (!parsed.tools || typeof parsed.tools !== "object") parsed.tools = {};

      return parsed;
    } catch {
      return emptyStore();
    }
  }

  function writeStore(store) {
    if (!canUseStorage()) return false;

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return true;
    } catch {
      return false;
    }
  }

  function primaryRecommendationFor(guidance) {
    if (!guidance || typeof guidance !== "object") return {};
    return guidance.primaryRecommendation || guidance.recommendation || {};
  }

  function normalizeGuidance(slug, guidance, meta) {
    const primary = primaryRecommendationFor(guidance);

    return {
      slug,
      category: CATEGORY,
      savedAt: new Date().toISOString(),
      savedAtMs: now(),
      source: meta && meta.source ? meta.source : "tool-guidance",
      status: normalizeStatus(guidance && guidance.status),
      mode: guidance && guidance.mode ? guidance.mode : "unknown",
      action: primary.action || "",
      reason: primary.reason || "",
      expectedResult: primary.expectedResult || "",
      nextStep: primary.nextStep || "",
      reportSummary: guidance && guidance.reportSummary ? guidance.reportSummary : "",
      sourceIntegrity: guidance && guidance.sourceIntegrity ? clone(guidance.sourceIntegrity) : null,
      guidance: clone(guidance || null),
      meta: clone(meta || {})
    };
  }

  function saveToolGuidance(slug, guidance, meta) {
    if (!slug || !guidance) {
      return {
        ok: false,
        reason: "Missing slug or guidance."
      };
    }

    const store = readStore();
    const record = normalizeGuidance(slug, guidance, meta);

    store.version = VERSION;
    store.category = CATEGORY;
    store.updatedAt = record.savedAt;
    store.tools[slug] = record;

    const saved = writeStore(store);

    return {
      ok: saved,
      reason: saved ? "Guidance saved." : "sessionStorage unavailable.",
      record: clone(record)
    };
  }

  function getToolGuidance(slug) {
    const store = readStore();
    const record = store.tools && store.tools[slug] ? store.tools[slug] : null;

    if (!record) return null;

    if (record.savedAtMs && now() - Number(record.savedAtMs) > MAX_AGE_MS) {
      return null;
    }

    return clone(record);
  }

  function listToolGuidance() {
    const store = readStore();

    return PIPELINE_ORDER
      .map((slug) => getToolGuidance(slug))
      .filter(Boolean);
  }

  function clearToolGuidance(slug) {
    const store = readStore();

    if (store.tools && store.tools[slug]) {
      delete store.tools[slug];
      store.updatedAt = new Date().toISOString();
      writeStore(store);
      return true;
    }

    return false;
  }

  function clearAll() {
    if (!canUseStorage()) return false;

    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  function explainMemory() {
    const records = listToolGuidance();
    const risk = records.filter((item) => item.status === "risk").length;
    const watch = records.filter((item) => item.status === "watch").length;
    const healthy = records.filter((item) => item.status === "healthy").length;

    return {
      ok: true,
      version: VERSION,
      category: CATEGORY,
      storageKey: STORAGE_KEY,
      count: records.length,
      healthy,
      watch,
      risk,
      records
    };
  }

  window.ScopedLabsPhysicalSecurityGuidanceMemory = Object.freeze({
    version: VERSION,
    category: CATEGORY,
    storageKey: STORAGE_KEY,
    pipelineOrder: clone(PIPELINE_ORDER),
    saveToolGuidance,
    getToolGuidance,
    listToolGuidance,
    clearToolGuidance,
    clearAll,
    explainMemory
  });
})();