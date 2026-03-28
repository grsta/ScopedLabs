window.ScopedPipelineState = (() => {
  "use strict";

  const LEGACY_FLOW_KEY = "scopedlabs:pipeline:last-result";
  const PREFIX = "scopedlabs:pipeline";

  function clean(value) {
    return value == null ? "" : String(value).trim().toLowerCase();
  }

  function getPipelinesRoot() {
    return window.SCOPED_PIPELINES?.categories || {};
  }

  function getCategory(category) {
    const cat = clean(category);
    return getPipelinesRoot()[cat] || null;
  }

  function getLane(category, lane = "v1") {
    const cat = getCategory(category);
    if (!cat?.lanes) return [];
    return Array.isArray(cat.lanes[lane]) ? cat.lanes[lane] : [];
  }

  function getStep(category, lane = "v1", step) {
    const laneSteps = getLane(category, lane);
    const stepId = clean(step);
    return laneSteps.find((item) => clean(item.id) === stepId) || null;
  }

  function getStepIndex(category, lane = "v1", step) {
    const laneSteps = getLane(category, lane);
    const stepId = clean(step);
    return laneSteps.findIndex((item) => clean(item.id) === stepId);
  }

  function getUpstreamStep(category, lane = "v1", step) {
    const laneSteps = getLane(category, lane);
    const idx = getStepIndex(category, lane, step);
    if (idx <= 0) return null;
    return laneSteps[idx - 1] || null;
  }

  function getDownstreamSteps(category, lane = "v1", step) {
    const laneSteps = getLane(category, lane);
    const idx = getStepIndex(category, lane, step);
    if (idx === -1) return [];
    return laneSteps.slice(idx + 1);
  }

  function getStepKey(category, step) {
    const cat = clean(category);
    const stepId = clean(step);
    if (!cat || !stepId) return LEGACY_FLOW_KEY;
    return `${PREFIX}:${cat}:${stepId}`;
  }

  function readRaw(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeRaw(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  }

  function removeRaw(key) {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  }

  function readStep(category, step) {
    const key = getStepKey(category, step);
    const raw = readRaw(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeStep(category, step, payload) {
    const key = getStepKey(category, step);
    writeRaw(key, JSON.stringify(payload));
    return key;
  }

  function clearStep(category, step) {
    removeRaw(getStepKey(category, step));
  }

  function clearDownstream(category, lane = "v1", step) {
    const downstream = getDownstreamSteps(category, lane, step);
    downstream.forEach((item) => clearStep(category, item.id));
  }

  function clearLane(category, lane = "v1") {
    getLane(category, lane).forEach((item) => clearStep(category, item.id));
  }

  function clearCategory(category) {
    const cat = getCategory(category);
    if (!cat?.lanes) return;
    Object.keys(cat.lanes).forEach((lane) => clearLane(category, lane));
  }

  function getUpstreamFlow(category, lane = "v1", step) {
    const upstream = getUpstreamStep(category, lane, step);
    if (!upstream) return null;
    return readStep(category, upstream.id);
  }

  function getCurrentBodyMeta() {
    const body = document.body;
    return {
      category: clean(body?.dataset?.category),
      lane: clean(body?.dataset?.lane) || "v1",
      step: clean(body?.dataset?.step)
    };
  }

  function resolveFlowKey(flowKey, category, step) {
    if (flowKey && flowKey !== LEGACY_FLOW_KEY) return flowKey;
    if (clean(category) && clean(step)) return getStepKey(category, step);
    return flowKey || LEGACY_FLOW_KEY;
  }

  function migrateLegacyForCategory(category, lane = "v1") {
    const raw = readRaw(LEGACY_FLOW_KEY);
    if (!raw) return false;

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    if (!parsed || clean(parsed.category) !== clean(category) || !clean(parsed.step)) {
      return false;
    }

    writeStep(category, parsed.step, parsed);
    removeRaw(LEGACY_FLOW_KEY);
    return true;
  }

  return {
    LEGACY_FLOW_KEY,
    PREFIX,
    clean,
    getCategory,
    getLane,
    getStep,
    getStepIndex,
    getUpstreamStep,
    getDownstreamSteps,
    getStepKey,
    readStep,
    writeStep,
    clearStep,
    clearDownstream,
    clearLane,
    clearCategory,
    getUpstreamFlow,
    getCurrentBodyMeta,
    resolveFlowKey,
    migrateLegacyForCategory
  };
})();