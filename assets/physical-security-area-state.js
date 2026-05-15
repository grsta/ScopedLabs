(() => {
  "use strict";

  const STORAGE_KEY = "scopedlabs:pipeline:physical-security:areas";
  const ACTIVE_KEY = "scopedlabs:pipeline:physical-security:active-area";
  const FLOW_KEY = "scopedlabs:pipeline:physical-security:area-planner";

  function safeJsonParse(value, fallback) {
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function slugify(value) {
    return String(value || "area")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "area";
  }

  function cleanNumber(value, fallback = null) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function fmtFt(value) {
    const number = cleanNumber(value);
    return number === null ? "n/a" : number.toFixed(1).replace(/\.0$/, "") + " ft";
  }

  function fmtDeg(value) {
    const number = cleanNumber(value);
    return number === null ? "n/a" : number.toFixed(1).replace(/\.0$/, "") + "?";
  }

  function normalizeArea(area, index = 0) {
    const source = area && typeof area === "object" ? area : {};
    const extra = { ...source };

    const name = String(source?.name || "Area " + (index + 1)).trim() || "Area " + (index + 1);
    const id = String(source?.id || slugify(name) + "-" + Date.now()).trim();

    return {
      ...extra,
      id,
      name,
      areaType: String(source?.areaType || "General Coverage").trim() || "General Coverage",
      protectedLengthFt: cleanNumber(source?.protectedLengthFt, 100),
      distanceToTargetPlaneFt: cleanNumber(source?.distanceToTargetPlaneFt, 80),
      assumedHfovDeg: cleanNumber(source?.assumedHfovDeg, 70),
      detailGoal: String(source?.detailGoal || "Observation").trim() || "Observation",
      targetCameraCount: cleanNumber(source?.targetCameraCount, null),
      cameraCount: cleanNumber(source?.cameraCount, null),
      spacingFt: cleanNumber(source?.spacingFt, null),
      selectedLensMm: cleanNumber(source?.selectedLensMm, null),
      sourceMode: String(source?.sourceMode || "area-planner"),
      status: String(source?.status || "PLANNING"),
      notes: Array.isArray(source?.notes) ? source.notes : [],
      updatedAt: source?.updatedAt || new Date().toISOString()
    };
  }

  function defaultLedger() {
    const area = normalizeArea({ name: "Area 1" }, 0);
    return {
      schema: "scopedlabs.physical-security.area-ledger.v1",
      projectMode: "multi-area",
      activeAreaId: area.id,
      areas: [area],
      updatedAt: new Date().toISOString()
    };
  }

  function readLedger() {
    const parsed = safeJsonParse(sessionStorage.getItem(STORAGE_KEY), null) ||
      safeJsonParse(localStorage.getItem(STORAGE_KEY), null);

    if (!parsed || !Array.isArray(parsed.areas) || !parsed.areas.length) return defaultLedger();

    const areas = parsed.areas.map(normalizeArea);
    const activeAreaId = parsed.activeAreaId && areas.some((area) => area.id === parsed.activeAreaId)
      ? parsed.activeAreaId
      : areas[0].id;

    return {
      schema: "scopedlabs.physical-security.area-ledger.v1",
      projectMode: "multi-area",
      activeAreaId,
      areas,
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  }

  function writeLedger(ledger) {
    const normalized = {
      schema: "scopedlabs.physical-security.area-ledger.v1",
      projectMode: "multi-area",
      activeAreaId: ledger.activeAreaId,
      areas: (ledger.areas || []).map(normalizeArea),
      updatedAt: new Date().toISOString()
    };

    if (!normalized.activeAreaId && normalized.areas[0]) normalized.activeAreaId = normalized.areas[0].id;

    const text = JSON.stringify(normalized, null, 2);
    sessionStorage.setItem(STORAGE_KEY, text);
    localStorage.setItem(STORAGE_KEY, text);
    sessionStorage.setItem(ACTIVE_KEY, normalized.activeAreaId || "");
    localStorage.setItem(ACTIVE_KEY, normalized.activeAreaId || "");

    const active = normalized.areas.find((area) => area.id === normalized.activeAreaId) || normalized.areas[0] || null;
    if (active) {
      const payload = {
        schema: "scopedlabs.pipeline.physical-security.area-planner.v1",
        category: "physical-security",
        step: "area-planner",
        lane: "v1",
        sourceMode: "area-planner",
        savedAt: new Date().toISOString(),
        data: {
          activeAreaId: active.id,
          areaName: active.name,
          areaType: active.areaType,
          protectedLengthFt: active.protectedLengthFt,
          distanceToTargetPlaneFt: active.distanceToTargetPlaneFt,
          assumedHfovDeg: active.assumedHfovDeg,
          detailGoal: active.detailGoal,
          targetCameraCount: active.targetCameraCount,
          areaCount: normalized.areas.length,
          areas: normalized.areas
        }
      };
      sessionStorage.setItem(FLOW_KEY, JSON.stringify(payload));
      sessionStorage.setItem("scopedlabs:pipeline:last-result", JSON.stringify(payload));
    }

    window.dispatchEvent(new CustomEvent("scopedlabs:physical-security-area-updated", { detail: normalized }));
    return normalized;
  }

  function getActiveArea() {
    const ledger = readLedger();
    return ledger.areas.find((area) => area.id === ledger.activeAreaId) || ledger.areas[0] || null;
  }

  function setActiveArea(id) {
    const ledger = readLedger();
    if (ledger.areas.some((area) => area.id === id)) {
      ledger.activeAreaId = id;
      writeLedger(ledger);
    }
    return getActiveArea();
  }

  function upsertArea(area) {
    const ledger = readLedger();
    const normalized = normalizeArea(area, ledger.areas.length);
    const index = ledger.areas.findIndex((item) => item.id === normalized.id);

    if (index >= 0) ledger.areas[index] = { ...ledger.areas[index], ...normalized, updatedAt: new Date().toISOString() };
    else ledger.areas.push({ ...normalized, updatedAt: new Date().toISOString() });

    ledger.activeAreaId = normalized.id;
    return writeLedger(ledger);
  }

  function removeArea(id) {
    const ledger = readLedger();
    if (ledger.areas.length <= 1) return ledger;
    ledger.areas = ledger.areas.filter((area) => area.id !== id);
    if (!ledger.areas.some((area) => area.id === ledger.activeAreaId)) ledger.activeAreaId = ledger.areas[0]?.id;
    return writeLedger(ledger);
  }

  function updateActiveAreaResult(result) {
    const ledger = readLedger();
    const index = ledger.areas.findIndex((area) => area.id === ledger.activeAreaId);
    if (index === -1) return ledger;

    ledger.areas[index] = {
      ...ledger.areas[index],
      ...result,
      updatedAt: new Date().toISOString()
    };

    return writeLedger(ledger);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function bannerHtml(area, ledger) {
    if (!area) {
      return '<div class="card" style="margin-top:14px;border-color:rgba(255,211,79,.28);"><strong>Area Planner</strong><p class="muted" style="margin-bottom:0;">No active area selected. Start with Area / Zone Planner before using this guided flow.</p></div>';
    }

    const cameraText = area.cameraCount ? area.cameraCount + ' camera' + (Number(area.cameraCount) === 1 ? '' : 's') : 'camera count pending';

    return '' +
      '<div class="card" style="margin-top:14px;border-color:rgba(125,255,158,.20);background:rgba(125,255,152,.035);">' +
        '<div class="pill-row"><span class="pill">Current Area</span><span class="pill">' + escapeHtml(String((ledger.areas || []).length)) + ' area' + ((ledger.areas || []).length === 1 ? '' : 's') + '</span></div>' +
        '<h2 class="h3" style="margin-top:10px;">' + escapeHtml(area.name) + '</h2>' +
        '<p class="muted" style="margin-bottom:0;">' +
          escapeHtml(area.areaType) + ' | length ' + escapeHtml(fmtFt(area.protectedLengthFt)) + ' | distance ' + escapeHtml(fmtFt(area.distanceToTargetPlaneFt)) + ' | assumed HFOV ' + escapeHtml(fmtDeg(area.assumedHfovDeg)) + ' | ' + escapeHtml(cameraText) +
        '</p>' +
        '<p class="muted" style="margin-top:10px;margin-bottom:0;">This tool result applies to the active area only. Other areas may need different distance, HFOV, spacing, camera count, or lens assumptions.</p>' +
      '</div>';
  }

  function renderAreaBanner() {
    const body = document.body;
    if (!body || body.dataset.category !== "physical-security") return;
    if (body.dataset.step === "area-planner") return;

    const existing = document.getElementById("physicalSecurityAreaBanner");
    if (existing) existing.remove();

    const ledger = readLedger();
    const area = getActiveArea();
    const container = document.createElement("div");
    container.id = "physicalSecurityAreaBanner";
    container.innerHTML = bannerHtml(area, ledger);

    const pipeline = document.getElementById("pipeline");
    const flowNote = document.getElementById("flow-note");
    const h1 = document.querySelector("h1");
    const anchor = pipeline || flowNote || h1;

    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(container, anchor.nextSibling);
    }
  }

  window.ScopedLabsPhysicalSecurityAreaState = {
    STORAGE_KEY,
    ACTIVE_KEY,
    FLOW_KEY,
    readLedger,
    writeLedger,
    getActiveArea,
    setActiveArea,
    upsertArea,
    removeArea,
    updateActiveAreaResult,
    normalizeArea,
    renderAreaBanner
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAreaBanner);
  } else {
    renderAreaBanner();
  }

  window.addEventListener("scopedlabs:physical-security-area-updated", renderAreaBanner);
})();
