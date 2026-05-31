(() => {
  "use strict";

  const CATEGORY = "physical-security";
  const NEXT_URL = "/tools/physical-security/scene-illumination/";

  const $ = (id) => document.getElementById(id);

  const els = {
    areaName: $("areaName"),
    areaType: $("areaType"),
    routeIntent: $("routeIntent"),
    protectedLengthFt: $("protectedLengthFt"),
    distanceToTargetPlaneFt: $("distanceToTargetPlaneFt"),
    assumedHfovDeg: $("assumedHfovDeg"),
    detailGoal: $("detailGoal"),
    targetCameraCount: $("targetCameraCount"),
    saveArea: $("saveArea"),
    newArea: $("newArea"),
    resetAreas: $("resetAreas"),
    areaList: $("areaList"),
    areaStatus: $("areaStatus"),
    areaCountPill: $("areaCountPill"),
    areaSummary: $("areaSummary"),
    areaCountFlowLabel: $("areaCountFlowLabel"),
    printSummary: $("printAreaSummary"),
    copySummaryJson: $("copyAreaSummaryJson"),
    continueBtn: $("continue"),
    summaryBtn: null,
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  let editingAreaId = null;

  function scrollAreaPlannerTarget(target, options = {}) {
    const el = typeof target === "string" ? document.getElementById(target) : target;
    if (!el || typeof el.scrollIntoView !== "function") return;

    const focusTarget = options.focusId ? document.getElementById(options.focusId) : null;
    const block = options.block || "center";

    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block, inline: "nearest" });

      if (focusTarget && typeof focusTarget.focus === "function") {
        window.setTimeout(() => {
          try {
            focusTarget.focus({ preventScroll: true });
          } catch {
            focusTarget.focus();
          }
        }, 180);
      }
    });
  }

  function scrollToAreaEditForm() {
    scrollAreaPlannerTarget("toolCard", { block: "start", focusId: "areaName" });
  }

  function scrollToAreaContinue() {
    scrollAreaPlannerTarget("areaPlannerFlowActions", { block: "center" });
  }


  const AREA_ROUTE_INTENTS = Object.freeze({
    CORE: "core-coverage",
    FACE: "face-recognition-zone",
    PLATE: "license-plate-zone"
  });

  function normalizeRouteIntent(value) {
    const normalized = String(value || "").trim().toLowerCase();

    if (normalized === AREA_ROUTE_INTENTS.FACE || normalized === "face" || normalized === "face-recognition") {
      return AREA_ROUTE_INTENTS.FACE;
    }

    if (normalized === AREA_ROUTE_INTENTS.PLATE || normalized === "plate" || normalized === "license-plate") {
      return AREA_ROUTE_INTENTS.PLATE;
    }

    return AREA_ROUTE_INTENTS.CORE;
  }

  function routeIntentLabel(value) {
    const intent = normalizeRouteIntent(value);

    if (intent === AREA_ROUTE_INTENTS.FACE) return "Face Recognition Zone";
    if (intent === AREA_ROUTE_INTENTS.PLATE) return "License Plate Zone";

    return "Core Coverage Area";
  }

  function routeIntentContinueLabel(value) {
    const intent = normalizeRouteIntent(value);

    if (intent === AREA_ROUTE_INTENTS.FACE) return "Face Recognition Range";
    if (intent === AREA_ROUTE_INTENTS.PLATE) return "License Plate Range";

    return "Scene Illumination";
  }

  function routeIntentUrl(value) {
    const intent = normalizeRouteIntent(value);

    if (intent === AREA_ROUTE_INTENTS.FACE) return "/tools/physical-security/face-recognition-range/";
    if (intent === AREA_ROUTE_INTENTS.PLATE) return "/tools/physical-security/license-plate-range/";

    return NEXT_URL;
  }

  function getActiveAreaFromLedger(ledger) {
    if (!ledger || !Array.isArray(ledger.areas) || !ledger.activeAreaId) return null;
    return ledger.areas.find((area) => area && area.id === ledger.activeAreaId) || null;
  }

  function getActiveAreaRouteUrl() {
    const api = state();
    const ledger = api && typeof api.readLedger === "function" ? api.readLedger() : null;
    const activeArea = getActiveAreaFromLedger(ledger);
    return routeIntentUrl(activeArea && activeArea.routeIntent);
  }

  function updateContinueButton(ledger) {
    if (!els.continueBtn) return;

    const activeArea = getActiveAreaFromLedger(ledger);
    els.continueBtn.innerHTML = "Continue &rarr; " + escapeHtml(routeIntentContinueLabel(activeArea && activeArea.routeIntent));
  }


  function removeLegacySummaryButton() {
    const existing = $("openPhysicalSecuritySummary");
    if (existing && existing.parentElement) {
      existing.parentElement.removeChild(existing);
    }

    els.summaryBtn = null;
  }


  function state() {
    return window.ScopedLabsPhysicalSecurityAreaState;
  }

  function num(value, fallback = null) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function fmtFt(value) {
    const number = num(value);
    return number === null ? "n/a" : number.toFixed(1).replace(/\.0$/, "") + " ft";
  }

  function fmtDeg(value) {
    const number = num(value);
    const degree = String.fromCharCode(176);
    return number === null ? "n/a" : number.toFixed(1).replace(/\.0$/, "") + degree;
  }

  function hasStoredAuth() {
    try {
      const key = Object.keys(localStorage).find((item) => item.startsWith("sb-"));
      if (!key) return false;
      const raw = JSON.parse(localStorage.getItem(key));
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
      return raw.split(",").map((item) => String(item).trim().toLowerCase()).filter(Boolean);
    } catch {
      return [];
    }
  }

  function unlockCategoryPage() {
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(CATEGORY);

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formNumber(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const number = Number(raw);
    return Number.isFinite(number) ? number : null;
  }

  function setBlankAreaForm(nextName = "") {
    editingAreaId = null;
    els.areaName.value = "";
    els.areaName.placeholder = nextName || "Example: Front Door";
    els.areaType.value = "General Coverage";
    if (els.routeIntent) els.routeIntent.value = AREA_ROUTE_INTENTS.CORE;
    els.protectedLengthFt.value = "";
    els.protectedLengthFt.placeholder = "Example: 100";
    els.distanceToTargetPlaneFt.value = "";
    els.distanceToTargetPlaneFt.placeholder = "Example: 60";
    els.assumedHfovDeg.value = "";
    els.assumedHfovDeg.placeholder = "Example: 90";
    els.detailGoal.value = "Observation";
    els.targetCameraCount.value = "";
    els.targetCameraCount.placeholder = "Optional";
  }

  function validateAreaForm() {
    const missing = [];

    if (!String(els.areaName.value || "").trim()) missing.push("Area Name");

    const protectedLength = formNumber(els.protectedLengthFt.value);
    const distance = formNumber(els.distanceToTargetPlaneFt.value);
    const hfov = formNumber(els.assumedHfovDeg.value);
    const targetCameras = formNumber(els.targetCameraCount.value);

    if (!(protectedLength > 0)) missing.push("Protected Length / Scene Width");
    if (!(distance > 0)) missing.push("Distance to Target Plane");
    if (!(hfov > 0 && hfov < 180)) missing.push("Starting HFOV Assumption");
    if (targetCameras !== null && targetCameras < 1) missing.push("Optional Target Camera Count must be 1 or higher");

    if (missing.length) {
      status("Add valid values for: " + missing.join(", ") + ".");
      return false;
    }

    return true;
  }

  function formNumber(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const number = Number(raw);
    return Number.isFinite(number) ? number : null;
  }

  function clearAreaForm(nextName = "Front Door") {
    editingAreaId = null;

    els.areaName.value = "";
    els.areaName.placeholder = "Example: " + nextName;

    els.areaType.value = "General Coverage";
    if (els.routeIntent) els.routeIntent.value = AREA_ROUTE_INTENTS.CORE;

    els.protectedLengthFt.value = "";
    els.protectedLengthFt.placeholder = "Example: 100";

    els.distanceToTargetPlaneFt.value = "";
    els.distanceToTargetPlaneFt.placeholder = "Example: 60";

    els.assumedHfovDeg.value = "";
    els.assumedHfovDeg.placeholder = "Example: 90";

    els.detailGoal.value = "Observation";

    els.targetCameraCount.value = "";
    els.targetCameraCount.placeholder = "Optional";
  }

  function validateAreaForm() {
    const missing = [];

    if (!String(els.areaName.value || "").trim()) missing.push("Area Name");

    const protectedLength = formNumber(els.protectedLengthFt.value);
    const distance = formNumber(els.distanceToTargetPlaneFt.value);
    const hfov = formNumber(els.assumedHfovDeg.value);
    const targetCameras = formNumber(els.targetCameraCount.value);

    if (!(protectedLength > 0)) missing.push("Protected Length / Scene Width");
    if (!(distance > 0)) missing.push("Distance to Target Plane");
    if (!(hfov > 0 && hfov < 180)) missing.push("Starting HFOV Assumption");
    if (targetCameras !== null && targetCameras < 1) missing.push("Optional Target Camera Count must be 1 or higher");

    if (missing.length) {
      status("Add valid values for: " + missing.join(", ") + ".");
      return false;
    }

    return true;
  }

  function loadAreaToForm(area) {
    if (!area) {
      clearAreaForm();
      return;
    }

    editingAreaId = area.id;
    els.areaName.value = area.name || "";
    els.areaType.value = area.areaType || "General Coverage";
    if (els.routeIntent) els.routeIntent.value = normalizeRouteIntent(area.routeIntent);
    els.protectedLengthFt.value = area.protectedLengthFt ? String(area.protectedLengthFt) : "";
    els.distanceToTargetPlaneFt.value = area.distanceToTargetPlaneFt ? String(area.distanceToTargetPlaneFt) : "";
    els.assumedHfovDeg.value = area.assumedHfovDeg ? String(area.assumedHfovDeg) : "";
    els.detailGoal.value = area.detailGoal || "Observation";
    els.targetCameraCount.value = area.targetCameraCount ? String(area.targetCameraCount) : "";
  }

  function areaFromForm() {
    const name = String(els.areaName.value || "").trim();
    const id = editingAreaId || (name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now());

    return {
      id,
      name,
      areaType: els.areaType.value || "General Coverage",
      routeIntent: normalizeRouteIntent(els.routeIntent && els.routeIntent.value),
      routeIntentLabel: routeIntentLabel(els.routeIntent && els.routeIntent.value),
      protectedLengthFt: formNumber(els.protectedLengthFt.value),
      distanceToTargetPlaneFt: formNumber(els.distanceToTargetPlaneFt.value),
      assumedHfovDeg: formNumber(els.assumedHfovDeg.value),
      detailGoal: els.detailGoal.value || "Observation",
      targetCameraCount: formNumber(els.targetCameraCount.value),
      sourceMode: "area-planner",
      status: "PLANNING"
    };
  }

  function lensProgressDetail(area) {
    if (!area) return "Lens result saved";

    const parts = [];
    const cameraCount = Number(area.cameraCount || area.targetCameraCount || 0);

    if (area.selectedLensMm) {
      parts.push(Number(area.selectedLensMm).toFixed(1).replace(/\.0$/, "") + " mm");
    }

    if (area.lensDerivedHfovDeg) {
      parts.push("HFOV " + Number(area.lensDerivedHfovDeg).toFixed(1).replace(/\.0$/, "") + "?");
    }

    if (area.lensHorizontalResolutionPx || area.horizontalResolutionPx) {
      parts.push(String(Math.round(Number(area.lensHorizontalResolutionPx || area.horizontalResolutionPx))).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " px");
    }

    if (area.lensPixelDensityPpf || area.pixelDensityPpf) {
      parts.push(Number(area.lensPixelDensityPpf || area.pixelDensityPpf).toFixed(1) + " PPF");
    }

    if (cameraCount > 1 && area.spacingRevalidationRequired) {
      parts.push("spacing revalidation needed");
    }

    return parts.length ? parts.join(" | ") : "Lens result saved";
  }



  function areaProgressHtml(area) {
    const items = [];

    if (area.lightingStatus || area.lightingClass) {
      items.push({
        label: "Lighting",
        value: (area.lightingStatus || "Recorded") + (area.lightingClass ? " / " + area.lightingClass : ""),
        detail: area.estimatedLumensRequired ? "Lumens: " + Math.round(area.estimatedLumensRequired).toLocaleString() : "Scene illumination result saved"
      });
    }

    if (area.mountingStatus || area.mountingTiltDeg) {
      items.push({
        label: "Mounting",
        value: (area.mountingStatus || "Recorded") + (area.mountingTiltDeg ? " / " + Number(area.mountingTiltDeg).toFixed(1) + "? tilt" : ""),
        detail: area.mountingHeightFt ? "Height: " + fmtFt(area.mountingHeightFt) : "Mounting geometry result saved"
      });
    }

    if (area.fovStatus || area.fovFitClass) {
      items.push({
        label: "Field of View",
        value: (area.fovStatus || "Recorded") + (area.fovFitClass ? " / " + area.fovFitClass : ""),
        detail: area.estimatedSceneWidthFt
          ? "Scene width: " + fmtFt(area.estimatedSceneWidthFt) + " at " + Number(area.assumedHfovDeg || 0).toFixed(1).replace(/\.0$/, "") + "?"
          : "FOV geometry result saved"
      });
    }

    if (area.coverageStatus || area.coverageEfficiencyClass) {
      items.push({
        label: "Coverage",
        value: (area.coverageStatus || "Recorded") + (area.coverageEfficiencyClass ? " / " + area.coverageEfficiencyClass : ""),
        detail: area.effectiveCoverageAreaSqFt
          ? "Usable area: " + Math.round(area.effectiveCoverageAreaSqFt).toLocaleString() + " sq ft"
          : area.effectiveCoverageWidthFt
            ? "Usable width: " + fmtFt(area.effectiveCoverageWidthFt)
            : "Coverage area result saved"
      });
    }

    if (area.spacingStatus || area.spacingClass || area.cameraCount || area.spacingFt) {
      items.push({
        label: "Spacing",
        value: (area.spacingStatus || "Recorded") + (area.spacingClass ? " / " + area.spacingClass : ""),
        detail: area.cameraCount
          ? area.cameraCount + " camera" + (Number(area.cameraCount) === 1 ? "" : "s") + " @ " + fmtFt(area.spacingFt) + " spacing"
          : area.spacingFt
            ? "Spacing: " + fmtFt(area.spacingFt)
            : "Camera spacing result saved"
      });
    }

    if (area.blindSpotStatus || area.blindSpotCoverageClass) {
      items.push({
        label: "Blind Spot",
        value: (area.blindSpotStatus || "Recorded") + (area.blindSpotCoverageClass ? " / " + area.blindSpotCoverageClass : ""),
        detail: Number(area.blindSpotGapFt || 0) > 0
          ? "Gap: " + fmtFt(area.blindSpotGapFt)
          : area.blindSpotTotalCoverageFt
            ? "Continuous coverage: " + fmtFt(area.blindSpotTotalCoverageFt)
            : "Blind spot result saved"
      });
    }

    if (area.pixelDensityStatus || area.pixelDensityLevel || area.pixelDensityPpf) {
      items.push({
        label: "Pixel Density",
        value: (area.pixelDensityStatus || "Recorded") + (area.pixelDensityLevel ? " / " + area.pixelDensityLevel : ""),
        detail: area.pixelDensityPpf
          ? Number(area.pixelDensityPpf).toFixed(1) + " PPF" + (area.pixelDensityTargetPpf ? " target " + Number(area.pixelDensityTargetPpf).toFixed(0) + " PPF" : "")
          : "Pixel density result saved"
      });
    }

    if (area.lensStatus || area.selectedLensMm || area.lensClass) {
      items.push({
        label: "Lens",
        value: (area.lensStatus || "Recorded") + (area.lensClass ? " / " + area.lensClass : ""),
        detail: lensProgressDetail(area)
      });
    }

    if (area.faceRecognitionStatus || area.faceRecognitionMaxDistanceFt || area.faceRecognitionDeliveredPpf) {
      items.push({
        label: "Face Recognition",
        value: (area.faceRecognitionStatus || "Recorded") + (area.faceRecognitionClass ? " / " + area.faceRecognitionClass : ""),
        detail: area.faceRecognitionMaxDistanceFt
          ? "Max range: " + fmtFt(area.faceRecognitionMaxDistanceFt) + " | delivered " + Number(area.faceRecognitionDeliveredPpf || 0).toFixed(1) + " PPF"
          : "Face recognition result saved"
      });
    }

    if (area.licensePlateStatus || area.licensePlateMaxDistanceFt || area.licensePlateDeliveredPpp) {
      items.push({
        label: "License Plate",
        value: (area.licensePlateStatus || "Recorded") + (area.licensePlateClass ? " / " + area.licensePlateClass : ""),
        detail: area.licensePlateMaxDistanceFt
          ? "Max range: " + fmtFt(area.licensePlateMaxDistanceFt) + " | delivered " + Number(area.licensePlateDeliveredPpp || 0).toFixed(1) + " px/plate"
          : "License plate result saved"
      });
    }

    if (!items.length) {
      return '' +
        '<div class="area-meta" style="margin-top:10px;">' +
          '<div><strong>Pipeline progress</strong>No tool results saved yet</div>' +
          '<div><strong>Next result</strong>Run Scene Illumination</div>' +
        '</div>';
    }

    return '' +
      '<div class="area-meta" style="margin-top:10px;">' +
        items.map((item) => {
          return '<div><strong>' + escapeHtml(item.label) + '</strong>' + escapeHtml(item.value) + '<br><span class="muted">' + escapeHtml(item.detail) + '</span></div>';
        }).join("") +
      '</div>';
  }

  

  function formatAreaWorkflowStatus(status) {
    const value = String(status || "PLANNING").trim().toUpperCase();
    if (value === "IN PROGRESS") return "Pipeline In Progress";
    if (value === "PLANNING") return "Planning";
    if (value === "COMPLETE") return "Pipeline Complete";
    return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function normalizeStatus(value) {
    const status = String(value || "").trim().toUpperCase();
    if (status.includes("RISK") || status.includes("FAIL") || status.includes("LOW") || status.includes("TOO")) return "RISK";
    if (status.includes("WATCH") || status.includes("WARN") || status.includes("MARGINAL")) return "WATCH";
    if (status.includes("HEALTHY") || status.includes("GOOD") || status.includes("OK") || status.includes("PASS")) return "HEALTHY";
    return status || "PENDING";
  }

  function worstStatus(statuses) {
    const normalized = (statuses || []).map(normalizeStatus).filter(Boolean);
    if (normalized.some((status) => status === "RISK")) return "RISK";
    if (normalized.some((status) => status === "WATCH")) return "WATCH";
    if (normalized.some((status) => status === "HEALTHY")) return "HEALTHY";
    return "PENDING";
  }

  function fmtNumber(value, decimals = 1) {
    const number = num(value);
    if (number === null) return "n/a";
    return Number(number).toFixed(decimals).replace(/\.0+$/, "");
  }

  function fmtPpf(value) {
    const number = num(value);
    return number === null ? "n/a" : number.toFixed(1).replace(/\.0$/, "") + " PPF";
  }

  function fmtPixels(value) {
    const number = num(value);
    return number === null ? "n/a" : Math.round(number).toLocaleString() + " px";
  }

  function areaToolRows(area) {
    return [
      {
        key: "lighting",
        label: "Lighting",
        complete: !!(area.lightingStatus || area.lightingClass),
        status: area.lightingStatus || "Pending",
        detail: area.estimatedLumensRequired ? "Lumens " + Math.round(area.estimatedLumensRequired).toLocaleString() : area.lightingClass || "Not recorded"
      },
      {
        key: "mounting",
        label: "Mounting",
        complete: !!(area.mountingStatus || area.mountingTiltDeg),
        status: area.mountingStatus || "Pending",
        detail: area.mountingHeightFt ? "Height " + fmtFt(area.mountingHeightFt) : "Not recorded"
      },
      {
        key: "fov",
        label: "Field of View",
        complete: !!(area.fovStatus || area.fovFitClass),
        status: area.fovStatus || "Pending",
        detail: area.estimatedSceneWidthFt ? "Scene width " + fmtFt(area.estimatedSceneWidthFt) : "Not recorded"
      },
      {
        key: "coverage",
        label: "Coverage",
        complete: !!(area.coverageStatus || area.coverageEfficiencyClass),
        status: area.coverageStatus || "Pending",
        detail: area.effectiveCoverageAreaSqFt ? "Usable " + Math.round(area.effectiveCoverageAreaSqFt).toLocaleString() + " sq ft" : area.effectiveCoverageWidthFt ? "Usable width " + fmtFt(area.effectiveCoverageWidthFt) : "Not recorded"
      },
      {
        key: "spacing",
        label: "Spacing",
        complete: !!(area.spacingStatus || area.spacingClass || area.cameraCount),
        status: area.spacingStatus || "Pending",
        detail: area.cameraCount ? area.cameraCount + " camera" + (Number(area.cameraCount) === 1 ? "" : "s") + " @ " + fmtFt(area.spacingFt) : "Not recorded"
      },
      {
        key: "blind",
        label: "Blind Spot",
        complete: !!(area.blindSpotStatus || area.blindSpotCoverageClass),
        status: area.blindSpotStatus || "Pending",
        detail: Number(area.blindSpotGapFt || 0) > 0 ? "Gap " + fmtFt(area.blindSpotGapFt) : area.blindSpotTotalCoverageFt ? "Coverage " + fmtFt(area.blindSpotTotalCoverageFt) : "Not recorded"
      },
      {
        key: "pixel",
        label: "Pixel Density",
        complete: !!(area.pixelDensityStatus || area.pixelDensityPpf),
        status: area.pixelDensityStatus || "Pending",
        detail: area.pixelDensityPpf ? fmtPpf(area.pixelDensityPpf) + (area.pixelDensityTargetPpf ? " target " + fmtPpf(area.pixelDensityTargetPpf) : "") : "Not recorded"
      },
      {
        key: "lens",
        label: "Lens",
        complete: !!(area.lensStatus || area.selectedLensMm || area.lensClass),
        status: area.lensStatus || "Pending",
        detail: lensProgressDetail(area)
      },
      {
        key: "face",
        label: "Face Recognition",
        complete: !!(area.faceRecognitionStatus || area.faceRecognitionMaxDistanceFt),
        status: area.faceRecognitionStatus || "Pending",
        detail: area.faceRecognitionMaxDistanceFt ? "Max " + fmtFt(area.faceRecognitionMaxDistanceFt) + " | " + fmtPpf(area.faceRecognitionDeliveredPpf) : "Not recorded"
      },
      {
        key: "plate",
        label: "License Plate",
        complete: !!(area.licensePlateStatus || area.licensePlateMaxDistanceFt),
        status: area.licensePlateStatus || "Pending",
        detail: area.licensePlateMaxDistanceFt ? "Max " + fmtFt(area.licensePlateMaxDistanceFt) + " | " + fmtNumber(area.licensePlateDeliveredPpp, 1) + " px/plate" : "Not recorded"
      }
    ];
  }

  function areaSourceIntegrity(area) {
    const manual = [];
    const assisted = [];

    if (Array.isArray(area.spacingManualOverrides) && area.spacingManualOverrides.length) manual.push("Spacing");
    if (Array.isArray(area.blindSpotManualOverrides) && area.blindSpotManualOverrides.length) manual.push("Blind Spot");
    if (Array.isArray(area.pixelDensityManualOverrides) && area.pixelDensityManualOverrides.length) manual.push("Pixel Density");
    if (Array.isArray(area.lensManualOverrides) && area.lensManualOverrides.length) manual.push("Lens");
    if (Array.isArray(area.faceRecognitionManualOverrides) && area.faceRecognitionManualOverrides.length) manual.push("Face Recognition");
    if (Array.isArray(area.licensePlateManualOverrides) && area.licensePlateManualOverrides.length) manual.push("License Plate");

    if (area.spacingAssistantSelected) assisted.push("Spacing Assistant");
    if (area.lensAssistantSelected) assisted.push("Lens Assistant");

    const hasManual = manual.length > 0;
    const hasAssisted = assisted.length > 0;

    let label = "Clean Area Pipeline";
    if (hasManual && hasAssisted) label = "Mixed Scenario";
    else if (hasManual) label = "Manual Override";
    else if (hasAssisted) label = "Assisted Scenario";

    const notes = [];
    if (manual.length) notes.push("Manual changes: " + manual.join(", "));
    if (assisted.length) notes.push("Assistant-selected values: " + assisted.join(", "));
    if (area.spacingRevalidationRequired) notes.push("Spacing revalidation flagged by Lens Selection");
    if (!notes.length) notes.push("No manual or assistant branch metadata recorded for this area.");

    return { label, notes };
  }

  function areaNextActions(area, rows, integrity, overallStatus) {
    const notes = [];
    const missing = rows.filter((row) => !row.complete).map((row) => row.label);

    if (area.spacingRevalidationRequired) {
      notes.push("Return to Camera Spacing with the selected lens/HFOV, then rerun downstream validation for this area.");
    }

    if (overallStatus === "RISK") {
      notes.push("One or more checks are in Risk. Review the Risk row first before treating this area as ready.");
    } else if (overallStatus === "WATCH") {
      notes.push("One or more checks are in Watch. Confirm the tradeoff is intentional or rerun the affected tool.");
    }

    if (missing.length) {
      notes.push("Missing results: " + missing.slice(0, 4).join(", ") + (missing.length > 4 ? ", and " + (missing.length - 4) + " more" : "") + ".");
    }

    if (integrity.label === "Manual Override") {
      notes.push("Manual override area: results are valid for this local what-if branch unless upstream values are recalculated.");
    } else if (integrity.label === "Assisted Scenario") {
      notes.push("Assisted scenario area: confirm the selected assistant branch before final reporting.");
    } else if (integrity.label === "Mixed Scenario") {
      notes.push("Mixed scenario area: both manual and assistant changes are present; review assumptions before final export.");
    }

    if (!notes.length) notes.push("Area appears ready for summary review. Final math/logic audit is still recommended before production use.");

    return notes;
  }

  function areaSummaryModel(area) {
    const rows = areaToolRows(area);
    const completed = rows.filter((row) => row.complete).length;
    const statuses = rows.filter((row) => row.complete).map((row) => row.status);
    const overallStatus = worstStatus(statuses);
    const integrity = areaSourceIntegrity(area);

    return {
      area,
      rows,
      completed,
      total: rows.length,
      completionPct: rows.length ? Math.round((completed / rows.length) * 100) : 0,
      overallStatus,
      integrity,
      nextActions: areaNextActions(area, rows, integrity, overallStatus)
    };
  }


  function areaRouteGroup(area) {
    const intent = normalizeRouteIntent(area && area.routeIntent);

    if (intent === AREA_ROUTE_INTENTS.FACE) return "face";
    if (intent === AREA_ROUTE_INTENTS.PLATE) return "plate";

    return "core";
  }

  function areaRouteGroupLabel(group) {
    if (group === "face") return "Face Recognition Zones";
    if (group === "plate") return "License Plate Zones";

    return "Core Coverage Areas";
  }

  function areaRouteGroupNote(group) {
    if (group === "face") {
      return "Optional specialty zones where the design must hold face-recognition detail.";
    }

    if (group === "plate") {
      return "Optional specialty zones where the design must hold readable license-plate detail.";
    }

    return "Normal camera coverage areas that follow the core Physical Security planning path.";
  }

  function areaKeyResult(item) {
    if (!item || !Array.isArray(item.rows)) return "No downstream result recorded yet.";

    const completedRows = item.rows.filter((row) => row && row.complete);
    if (!completedRows.length) return "No downstream result recorded yet.";

    const group = areaRouteGroup(item.area);
    const priorities = group === "plate"
      ? ["License Plate", "Face Recognition", "Lens", "Pixel Density", "Camera Spacing", "Coverage"]
      : group === "face"
        ? ["Face Recognition", "Lens", "Pixel Density", "Camera Spacing", "Coverage"]
        : ["Lens", "Pixel Density", "Blind Spot", "Camera Spacing", "Coverage", "Field of View", "Mounting", "Lighting"];

    const priorityRow = priorities
      .map((label) => completedRows.find((row) => row.label === label || String(row.label || "").includes(label)))
      .find(Boolean);

    const row = priorityRow || completedRows[completedRows.length - 1];
    const detail = row.detail || row.status || "Recorded";

    return row.label + ": " + detail;
  }

  function areaCompletedChecksText(item) {
    if (!item) return "0 / 0";
    return item.completed + " / " + item.total;
  }

  function areaShortNextAction(item) {
    if (!item || !Array.isArray(item.nextActions) || !item.nextActions.length) {
      return "Review the area assumptions and continue the appropriate planning path.";
    }

    return item.nextActions[0];
  }

  function groupedAreaItems(areas) {
    return {
      core: areas.filter((item) => item.routeGroup === "core"),
      face: areas.filter((item) => item.routeGroup === "face"),
      plate: areas.filter((item) => item.routeGroup === "plate")
    };
  }

  function physicalSecuritySummaryModel(ledger) {
    const activeAreaId = ledger && ledger.activeAreaId ? ledger.activeAreaId : null;
    const areas = (ledger?.areas || []).map((area) => {
      const item = areaSummaryModel(area);
      const routeGroup = areaRouteGroup(item.area);

      return {
        ...item,
        active: !!(activeAreaId && item.area && item.area.id === activeAreaId),
        routeGroup,
        routeLabel: areaRouteGroupLabel(routeGroup),
        keyResult: areaKeyResult(item),
        completedChecksText: areaCompletedChecksText(item),
        shortNextAction: areaShortNextAction(item)
      };
    });

    const groupedAreas = groupedAreaItems(areas);
    const totalCameras = areas.reduce((sum, item) => sum + (Number(item.area.cameraCount || item.area.targetCameraCount || 0) || 0), 0);
    const completeAreas = areas.filter((item) => item.completionPct === 100).length;
    const attentionAreas = areas.filter((item) => item.overallStatus === "RISK" || item.overallStatus === "WATCH" || item.area.spacingRevalidationRequired).length;
    const integrityStates = Array.from(new Set(areas.map((item) => item.integrity.label)));

    return {
      generatedAt: new Date().toISOString(),
      activeAreaId,
      areaCount: areas.length,
      totalCameras,
      completeAreas,
      attentionAreas,
      integrityStates,
      groupCounts: {
        core: groupedAreas.core.length,
        face: groupedAreas.face.length,
        plate: groupedAreas.plate.length
      },
      groupedAreas,
      areas
    };
  }

  function metricHtml(label, value, note) {
    return '' +
      '<div class="area-summary-metric">' +
        '<span class="area-summary-label">' + escapeHtml(label) + '</span>' +
        '<span class="area-summary-value">' + escapeHtml(value) + '</span>' +
        (note ? '<div class="area-summary-note">' + escapeHtml(note) + '</div>' : '') +
      '</div>';
  }


  function areaSummaryGroupHtml(model, group) {
    const items = (model.groupedAreas && model.groupedAreas[group]) || [];
    const label = areaRouteGroupLabel(group);
    const note = areaRouteGroupNote(group);
    const itemCountText = items.length + " " + (items.length === 1 ? "item" : "items");

    const rows = items.length ? items.map((item) => {
      const area = item.area || {};
      const cameraText = area.cameraCount
        ? area.cameraCount + " planned"
        : area.targetCameraCount
          ? area.targetCameraCount + " target"
          : "not set";

      return '' +
        '<tr>' +
          '<td>' +
            '<strong>' + escapeHtml(area.name || "Area") + '</strong>' +
            '<div class="area-summary-note">' + escapeHtml(area.areaType || "Area") + ' | ' + escapeHtml(routeIntentLabel(area.routeIntent)) + ' | Cameras ' + escapeHtml(cameraText) + '</div>' +
          '</td>' +
          '<td>' + escapeHtml(item.active ? "Active Area" : "Stored Area") + '</td>' +
          '<td>' + escapeHtml(item.overallStatus) + '</td>' +
          '<td>' + escapeHtml(item.completedChecksText) + '</td>' +
          '<td>' + escapeHtml(item.keyResult) + '</td>' +
          '<td>' + escapeHtml(item.shortNextAction) + '</td>' +
        '</tr>';
    }).join("") : '' +
        '<tr>' +
          '<td colspan="6">No ' + escapeHtml(label.toLowerCase()) + ' have been defined yet.</td>' +
        '</tr>';

    return '' +
      '<section class="area-summary-group" data-area-summary-group="' + escapeHtml(group) + '">' +
        '<div class="area-summary-zone-head">' +
          '<div>' +
            '<h4 class="area-summary-group-title">' + escapeHtml(label) + '</h4>' +
            '<div class="area-summary-note">' + escapeHtml(note) + '</div>' +
          '</div>' +
          '<span class="area-summary-count">' + escapeHtml(itemCountText) + '</span>' +
        '</div>' +
        '<table class="area-summary-table area-summary-table--planner">' +
          '<thead><tr><th>Area / Zone</th><th>Selected</th><th>Status</th><th>Checks</th><th>Key Saved Result</th><th>Next Action</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</section>';
  }

  function areaSummaryHtml(model) {
    if (!model || !model.areas.length) {
      return '<div class="area-summary-warn">No areas have been created yet. Add an area before generating the summary.</div>';
    }

    const rollup = '' +
      '<div class="area-summary-rollup">' +
        metricHtml("Areas", String(model.areaCount), "Defined planning areas and specialty zones.") +
        metricHtml("Core Areas", String(model.groupCounts.core), "Normal coverage areas.") +
        metricHtml("Face Zones", String(model.groupCounts.face), "Optional face-recognition zones.") +
        metricHtml("Plate Zones", String(model.groupCounts.plate), "Optional license-plate zones.") +
        metricHtml("Planned Cameras", String(model.totalCameras), "Sum of planned or target camera counts.") +
        metricHtml("Needs Attention", String(model.attentionAreas), "Watch, Risk, or revalidation areas.") +
      '</div>';

    return rollup +
      '<div class="area-summary-zones">' +
        areaSummaryGroupHtml(model, "core") +
        areaSummaryGroupHtml(model, "face") +
        areaSummaryGroupHtml(model, "plate") +
      '</div>';
  }

  function renderAreaSummary(ledger) {
    if (!els.areaSummary) return;
    const model = physicalSecuritySummaryModel(ledger);
    els.areaSummary.innerHTML = areaSummaryHtml(model);
    window.ScopedLabsPhysicalSecurityAreaSummary = model;
  }

  function areaReportStatusClass(status) {
    const value = normalizeStatus(status);
    if (value === "HEALTHY") return "healthy";
    if (value === "WATCH") return "watch";
    if (value === "RISK") return "risk";
    return "pending";
  }

  function areaReportGeneratedAt(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return new Date().toLocaleString();
    return date.toLocaleString();
  }

  function areaReportId() {
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    return "SL-PS-AREA-" + stamp;
  }

  function areaReportRows(rows) {
    return rows.map((row) => {
      const status = row.complete ? normalizeStatus(row.status) : "PENDING";
      return '' +
        '<tr>' +
          '<td>' + escapeHtml(row.label) + '</td>' +
          '<td><span class="mini-status ' + areaReportStatusClass(status) + '">' + escapeHtml(status) + '</span></td>' +
          '<td>' + escapeHtml(row.detail || "Not recorded") + '</td>' +
        '</tr>';
    }).join("");
  }

  function areaReportSummaryText(model, overallStatus) {
    if (!model.areas.length) {
      return "No Physical Security planning areas have been saved yet. Add at least one area before generating a final area summary.";
    }

    if (overallStatus === "RISK") {
      return "The Physical Security area summary contains one or more Risk conditions. Review the affected area rows and correction notes before treating this design as ready.";
    }

    if (overallStatus === "WATCH") {
      return "The Physical Security area summary contains one or more Watch conditions. Confirm the tradeoffs are intentional or rerun the affected checks before final use.";
    }

    if (overallStatus === "HEALTHY") {
      return "The Physical Security area summary is currently within healthy planning guardrails for the recorded area results.";
    }

    return "The Physical Security area summary is incomplete. Run the remaining pipeline checks before treating this as a final design report.";
  }


  function areaContextText(item) {
    if (!item) return "";
    return [
      item.areaTypeLabel,
      item.routeIntentLabel,
      item.cameraCountText
    ].filter(Boolean).join(" | ");
  }

  function buildAreaSummaryReportHtml(model) {
    const overallStatus = worstStatus(model.areas.map((item) => item.overallStatus));
    const statusClass = areaReportStatusClass(overallStatus);
    const generated = areaReportGeneratedAt(model.generatedAt);
    const reportId = areaReportId();

    const reportGroups = [
      { key: "core", label: areaRouteGroupLabel("core"), note: areaRouteGroupNote("core") },
      { key: "face", label: areaRouteGroupLabel("face"), note: areaRouteGroupNote("face") },
      { key: "plate", label: areaRouteGroupLabel("plate"), note: areaRouteGroupNote("plate") }
    ];

    const areaBlocks = reportGroups.map((group) => {
      const items = (model.groupedAreas && model.groupedAreas[group.key]) || [];
      const itemCountText = items.length + " " + (items.length === 1 ? "item" : "items");
      const rows = items.length ? items.map((item) => {
        const area = item.area || {};
        const cameraText = area.cameraCount
          ? area.cameraCount + " planned"
          : area.targetCameraCount
            ? area.targetCameraCount + " target"
            : "not set";

        return '' +
          '<tr>' +
            '<td>' +
              '<strong>' + escapeHtml(area.name || "Area") + '</strong>' +
              '<div class="area-meta-line">' +
                escapeHtml(area.areaType || "Area") +
                ' | ' + escapeHtml(routeIntentLabel(area.routeIntent)) +
                ' | Length ' + escapeHtml(fmtFt(area.protectedLengthFt)) +
                ' | Distance ' + escapeHtml(fmtFt(area.distanceToTargetPlaneFt)) +
                ' | HFOV ' + escapeHtml(fmtDeg(area.assumedHfovDeg)) +
                ' | Cameras ' + escapeHtml(cameraText) +
              '</div>' +
            '</td>' +
            '<td>' + (item.active ? '<span class="mini-status healthy">Active Area</span>' : '<span class="mini-status pending">Stored Area</span>') + '</td>' +
            '<td><span class="mini-status ' + areaReportStatusClass(item.overallStatus) + '">' + escapeHtml(item.overallStatus) + '</span></td>' +
            '<td>' + escapeHtml(item.completedChecksText) + '</td>' +
            '<td>' + escapeHtml(item.keyResult) + '</td>' +
            '<td>' + escapeHtml(item.shortNextAction) + '</td>' +
          '</tr>';
      }).join("") : '' +
          '<tr>' +
            '<td colspan="6">No ' + escapeHtml(group.label.toLowerCase()) + ' have been defined yet.</td>' +
          '</tr>';

      return '' +
        '<section class="section area-section zone-group" data-area-report-group="' + escapeHtml(group.key) + '">' +
          '<div class="area-head">' +
            '<div>' +
              '<h2>' + escapeHtml(group.label) + '</h2>' +
              '<div class="area-meta-line">' + escapeHtml(group.note) + '</div>' +
            '</div>' +
            '<div class="group-count">' + escapeHtml(itemCountText) + '</div>' +
          '</div>' +
          '<table class="compact-area-table">' +
            '<thead><tr><th>Area / Zone</th><th>Selected</th><th>Status</th><th>Checks</th><th>Key Saved Result</th><th>Next Action</th></tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</section>';
    }).join("");

    const integrity = model.integrityStates && model.integrityStates.length
      ? model.integrityStates.join(", ")
      : "No source-integrity states recorded";

    return '<!doctype html>' +
'<html lang="en">' +
'<head>' +
'  <meta charset="utf-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1">' +
'  <title>Physical Security Area Summary | ScopedLabs</title>' +
'  <style>' +
'    :root{' +
'      --ink:#172018;' +
'      --muted:#5c6a60;' +
'      --line:#dfe8e1;' +
'      --soft:#f7faf8;' +
'      --accent:#1f7a3d;' +
'      --accent-soft:#eaf7ef;' +
'      --watch:#946200;' +
'      --watch-soft:#fff7df;' +
'      --risk:#a3362b;' +
'      --risk-soft:#fff0ee;' +
'    }' +
'    *{box-sizing:border-box}' +
'    body{' +
'      margin:0;' +
'      padding:32px;' +
'      background:#eef3ef;' +
'      color:var(--ink);' +
'      font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;' +
'    }' +
'    .page{' +
'      max-width:1080px;' +
'      margin:0 auto;' +
'      background:#fff;' +
'      border:1px solid var(--line);' +
'      box-shadow:0 18px 48px rgba(22,33,26,.12);' +
'    }' +
'    .toolbar{display:flex;justify-content:flex-end;gap:10px;padding:16px 20px;border-bottom:1px solid var(--line);background:#fff;position:sticky;top:0;z-index:2}' +
'    .toolbar button{border:1px solid var(--line);background:#fff;color:#132018;border-radius:999px;padding:9px 14px;font-weight:800;cursor:pointer}' +
'    .report{padding:32px}' +
'    .brand-row{display:flex;align-items:center;gap:10px;margin-bottom:4px}' +
'    .brand-mark{width:24px;height:24px;border-radius:6px;display:inline-grid;place-items:center;background:#0b150f;color:#7dff9e;font-weight:950}' +
'    .brand-name{font-size:1.15rem;font-weight:900;letter-spacing:.02em}' +
'    .tagline{color:var(--muted);font-size:.95rem;margin-bottom:18px}' +
'    .report-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:18px 0;margin-bottom:22px}' +
'    .report-title{font-size:1.7rem;line-height:1.15;margin:0 0 6px}' +
'    .report-meta{color:var(--muted);font-size:.95rem;line-height:1.6}' +
'    .status-pill,.mini-status{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;border:1px solid transparent;white-space:nowrap}' +
'    .group-count{color:var(--accent);font-size:.82rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}' +
'    .status-pill{padding:8px 12px;font-size:.82rem}' +
'    .mini-status{padding:5px 8px;font-size:.72rem}' +
'    .healthy{color:var(--accent);background:var(--accent-soft);border-color:#c9ead7}' +
'    .watch{color:var(--watch);background:var(--watch-soft);border-color:#f2dfad}' +
'    .risk{color:var(--risk);background:var(--risk-soft);border-color:#f3c6c1}' +
'    .pending{color:#4b5563;background:#f3f4f6;border-color:#d1d5db}' +
'    .section{margin-top:24px}' +
'    .section h2{margin:0 0 10px;font-size:1rem;letter-spacing:.02em;text-transform:uppercase}' +
'    .summary,.body-copy{border:1px solid var(--line);background:#fafcfb;border-radius:14px;padding:16px 18px;line-height:1.65}' +
'    .rollup-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}' +
'    .metric{border:1px solid var(--line);background:#fafcfb;border-radius:14px;padding:14px}' +
'    .metric-label{display:block;color:var(--muted);font-size:.72rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-bottom:7px}' +
'    .metric-value{display:block;color:#111;font-size:1.25rem;font-weight:950}' +
'    .metric-note{color:var(--muted);font-size:.85rem;margin-top:7px;line-height:1.45}' +
'    .area-section{break-inside:avoid;page-break-inside:avoid}' +
'    .area-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:12px}' +
'    .area-head h2{text-transform:none;font-size:1.12rem;margin:0 0 4px}' +
'    .area-meta-line{color:var(--muted);font-size:.88rem;line-height:1.5;margin-top:4px}' +
'    table{width:100%;border-collapse:collapse;border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:.88rem}' +
'    th,td{padding:10px 10px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}' +
'    th{background:#f7faf8;font-size:.72rem;text-transform:uppercase;letter-spacing:.06em}' +
'    tr:last-child td{border-bottom:none}' +
'    .compact-area-table td:first-child{width:25%;color:var(--ink);font-weight:700}' +
'    .next-action{margin-top:12px;background:#fffdf2;border-color:#eadb9a}' +
'    .source-note{margin-top:10px}' +
'    .foot{margin-top:26px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:.9rem;line-height:1.7}' +
'    @media (max-width:900px){body{padding:14px}.report{padding:20px}.report-head,.area-head{flex-direction:column}.rollup-grid{grid-template-columns:1fr 1fr}}' +
'    @media print{@page{margin:.55in}body{background:#fff;padding:0}.page{max-width:none;border:none;box-shadow:none}.toolbar{display:none !important}.report{padding:0}.area-section{break-inside:avoid;page-break-inside:avoid}.rollup-grid{grid-template-columns:repeat(3,1fr)}}' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="page">' +
'    <div class="toolbar">' +
'      <button type="button" onclick="window.print()">Print / Save PDF</button>' +
'      <button type="button" onclick="window.close()">Close</button>' +
'    </div>' +
'    <div class="report">' +
'      <div class="brand-row"><div class="brand-mark">S</div><div class="brand-name">ScopedLabs</div></div>' +
'      <div class="tagline">Engineering - Analysis - Tools</div>' +
'      <div class="report-head">' +
'        <div>' +
'          <h1 class="report-title">Physical Security Area Summary</h1>' +
'          <div class="report-meta">' +
'            <div><strong>Category:</strong> Physical Security</div>' +
'            <div><strong>Tool:</strong> Area / Zone Planner</div>' +
'            <div><strong>Generated:</strong> ' + escapeHtml(generated) + '</div>' +
'            <div><strong>Report ID:</strong> ' + escapeHtml(reportId) + '</div>' +
'          </div>' +
'        </div>' +
'        <div class="status-pill ' + statusClass + '">' + escapeHtml(overallStatus) + '</div>' +
'      </div>' +
'      <section class="section">' +
'        <h2>Executive Summary</h2>' +
'        <div class="summary">' + escapeHtml(areaReportSummaryText(model, overallStatus)) + '</div>' +
'      </section>' +
'      <section class="section">' +
'        <h2>Site Rollup</h2>' +
'        <div class="rollup-grid">' +
'          <div class="metric"><span class="metric-label">Areas</span><span class="metric-value">' + escapeHtml(String(model.areaCount)) + '</span><div class="metric-note">Defined planning areas and specialty zones.</div></div>' +
'          <div class="metric"><span class="metric-label">Core Areas</span><span class="metric-value">' + escapeHtml(String(model.groupCounts.core)) + '</span><div class="metric-note">Normal coverage areas.</div></div>' +
'          <div class="metric"><span class="metric-label">Face Zones</span><span class="metric-value">' + escapeHtml(String(model.groupCounts.face)) + '</span><div class="metric-note">Optional face detail zones.</div></div>' +
'          <div class="metric"><span class="metric-label">Plate Zones</span><span class="metric-value">' + escapeHtml(String(model.groupCounts.plate)) + '</span><div class="metric-note">Optional plate detail zones.</div></div>' +
'          <div class="metric"><span class="metric-label">Planned Cameras</span><span class="metric-value">' + escapeHtml(String(model.totalCameras)) + '</span><div class="metric-note">Sum of planned or target camera counts.</div></div>' +
'          <div class="metric"><span class="metric-label">Needs Attention</span><span class="metric-value">' + escapeHtml(String(model.attentionAreas)) + '</span><div class="metric-note">Watch, Risk, or revalidation areas.</div></div>' +
'        </div>' +
'      </section>' +
'      <section class="section">' +
'        <h2>Source Integrity</h2>' +
'        <div class="body-copy">' + escapeHtml(integrity) + '</div>' +
'      </section>' +
       areaBlocks +
'      <section class="section">' +
'        <h2>Disclaimer</h2>' +
'        <div class="body-copy">ScopedLabs tools are planning aids only and do not replace formal engineering review, code compliance review, manufacturer validation, or project-specific professional judgment.</div>' +
'      </section>' +
'      <div class="foot">ScopedLabs Pro export for internal and client-facing documentation workflows.</div>' +
'    </div>' +
'  </div>' +
'</body>' +
'</html>';
  }

  function openAreaSummaryReportWindow(model) {
    try {
      const reportHtml = buildAreaSummaryReportHtml(model);
      const blob = new Blob([reportHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");

      if (!win) return false;

      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    } catch (err) {
      console.error("ScopedLabs area summary report open failed:", err);
      return false;
    }
  }

  function printAreaSummary() {
    const model = window.ScopedLabsPhysicalSecurityAreaSummary || physicalSecuritySummaryModel(state()?.readLedger() || { areas: [] });

    if (!model || !model.areas.length) {
      status("Add at least one planning area before opening the area summary report.");
      return;
    }

    const opened = openAreaSummaryReportWindow(model);
    status(opened ? "Area summary report opened in a new tab." : "Popup blocked or area summary report could not open.");
  }

  function areaSummaryClipboardText(model) {
    const lines = [];
    const groups = [
      { key: "core", label: "Core Coverage Areas" },
      { key: "face", label: "Face Recognition Zones" },
      { key: "plate", label: "License Plate Zones" }
    ];

    lines.push("Physical Security Area Summary");
    lines.push("Generated: " + areaReportGeneratedAt(model.generatedAt));
    lines.push("Overall status: " + worstStatus(model.areas.map((item) => item.overallStatus)));
    lines.push("Areas / zones: " + model.areaCount);
    lines.push("Planned cameras: " + model.totalCameras);
    lines.push("");

    groups.forEach((group) => {
      const items = (model.groupedAreas && model.groupedAreas[group.key]) || [];
      if (!items.length) return;

      lines.push(group.label);

      items.forEach((item) => {
        const area = item.area || {};
        const selected = item.active ? "Active Area" : "Stored Area";

        lines.push("- " + (area.name || "Area") + " (" + selected + "): " + item.overallStatus);
        lines.push("  Type: " + (area.areaType || "Area") + " | " + routeIntentLabel(area.routeIntent));
        lines.push("  Checks: " + item.completedChecksText);
        lines.push("  Key result: " + item.keyResult);
        lines.push("  Next action: " + item.shortNextAction);
      });

      lines.push("");
    });

    lines.push("ScopedLabs tools are planning aids only and do not replace formal engineering review, code compliance review, manufacturer validation, or project-specific professional judgment.");

    return lines.join("\n");
  }

  function setCopySummaryButtonFeedback(label, isError) {
    if (!els.copySummaryJson) return;

    const original = els.copySummaryJson.dataset.originalLabel || "Copy Client Summary";
    els.copySummaryJson.dataset.originalLabel = original;
    els.copySummaryJson.textContent = label;
    els.copySummaryJson.disabled = true;

    window.clearTimeout(els.copySummaryJson._feedbackTimer);
    els.copySummaryJson._feedbackTimer = window.setTimeout(() => {
      els.copySummaryJson.textContent = original;
      els.copySummaryJson.disabled = false;
    }, isError ? 2400 : 1600);
  }

  function copyAreaSummaryJson() {
    const model = window.ScopedLabsPhysicalSecurityAreaSummary || physicalSecuritySummaryModel(state()?.readLedger() || { areas: [] });

    if (!model || !model.areas.length) {
      setCopySummaryButtonFeedback("Nothing to copy", true);
      status("Add at least one planning area before copying the area summary.");
      return;
    }

    const text = areaSummaryClipboardText(model);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopySummaryButtonFeedback("Copied!", false);
          status("Client-ready area summary copied.");
        })
        .catch(() => {
          setCopySummaryButtonFeedback("Copy failed", true);
          status("Could not copy automatically. Select and copy from the printed summary instead.");
        });
      return;
    }

    status("Copy unavailable. Open the printable summary and copy from there.");
  }

  function isLegacyStarterArea(area) {
    if (!area) return false;

    const hasResults = [
      "lightingStatus",
      "mountingStatus",
      "fovStatus",
      "coverageStatus",
      "spacingStatus",
      "blindSpotStatus",
      "pixelDensityStatus",
      "lensStatus",
      "faceRecognitionStatus",
      "licensePlateStatus"
    ].some((key) => area[key]);

    return !hasResults &&
      String(area.name || "") === "Area 1" &&
      Number(area.protectedLengthFt) === 100 &&
      Number(area.distanceToTargetPlaneFt) === 80 &&
      Number(area.assumedHfovDeg) === 70;
  }

  function removeLegacyStarterAreaIfNeeded() {
    const api = state();
    if (!api) return;

    const ledger = api.readLedger();
    if (ledger.areas.length === 1 && isLegacyStarterArea(ledger.areas[0])) {
      api.writeLedger({
        ...ledger,
        activeAreaId: null,
        areas: []
      });
    }
  }



  function render() {
    const api = state();
    if (!api) return;

    const ledger = api.readLedger();

    if (els.areaCountPill) {
      els.areaCountPill.textContent = ledger.areas.length + " area" + (ledger.areas.length === 1 ? "" : "s");
    }

    renderAreaSummary(ledger);
    updateContinueButton(ledger);

    if (!els.areaList) return;

    if (!ledger.areas.length) {
      els.areaList.innerHTML = '' +
        '<article class="area-card">' +
          '<div class="pill-row">' +
            '<span class="pill">No Areas Saved</span>' +
          '</div>' +
          '<h3>No planning areas saved yet</h3>' +
          '<p class="muted">Enter the first area above, then save it. ScopedLabs will not assume a default distance, HFOV, scene width, or camera count.</p>' +
        '</article>';
      return;
    }

    els.areaList.innerHTML = ledger.areas.map((area) => {
      const activeClass = area.id === ledger.activeAreaId ? " is-active" : "";
      const cameraText = area.cameraCount ? area.cameraCount + " planned" : (area.targetCameraCount ? area.targetCameraCount + " target" : "not set");

      return '' +
        '<article class="area-card' + activeClass + '">' +
          '<div class="area-flow-line" aria-label="Area workflow state">' +
            '<span>' + escapeHtml(area.id === ledger.activeAreaId ? 'Active Area' : 'Area') + '</span>' +
            '<span class="area-flow-arrow">&rarr;</span>' +
            '<span>' + escapeHtml(routeIntentLabel(area.routeIntent)) + '</span>' +
            '<span class="area-flow-arrow">&rarr;</span>' +
            '<span>' + escapeHtml(formatAreaWorkflowStatus(area.status)) + '</span>' +
          '</div>' +
          '<h3 class="h3">' + escapeHtml(area.name) + '</h3>' +
          '<p class="muted" style="margin-bottom:0;">' + escapeHtml(area.areaType) + ' | ' + escapeHtml(area.detailGoal) + '</p>' +
          '<div class="area-meta">' +
            '<div><strong>Protected length</strong>' + escapeHtml(fmtFt(area.protectedLengthFt)) + '</div>' +
            '<div><strong>Distance</strong>' + escapeHtml(fmtFt(area.distanceToTargetPlaneFt)) + '</div>' +
            '<div><strong>Assumed HFOV</strong>' + escapeHtml(fmtDeg(area.assumedHfovDeg)) + '</div>' +
            '<div><strong>Cameras</strong>' + escapeHtml(cameraText) + '</div>' +
          '</div>' +
          areaProgressHtml(area) +
          '<div class="btn-row" style="margin-top:12px;">' +
            '<button class="btn btn-primary" type="button" data-use-area="' + escapeHtml(area.id) + '">Use Area</button>' +
            '<button class="btn" type="button" data-edit-area="' + escapeHtml(area.id) + '">Edit</button>' +
            (ledger.areas.length > 1 ? '<button class="btn" type="button" data-delete-area="' + escapeHtml(area.id) + '">Delete</button>' : '') +
          '</div>' +
        '</article>';
    }).join("");

    els.areaList.querySelectorAll("[data-use-area]").forEach((button) => {
      button.addEventListener("click", () => {
        api.setActiveArea(button.dataset.useArea);
        const nextActive = api.getActiveArea();
        loadAreaToForm(nextActive);
        status("Active area set to " + (nextActive?.name || "selected area") + ".");
        render();
        scrollToAreaContinue();
      });
    });

    els.areaList.querySelectorAll("[data-edit-area]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = api.readLedger().areas.find((area) => area.id === button.dataset.editArea);
        if (target) {
          api.setActiveArea(target.id);
          loadAreaToForm(target);
          status("Editing " + target.name + ".");
          render();
        scrollToAreaEditForm();
        }
      });
    });

    els.areaList.querySelectorAll("[data-delete-area]").forEach((button) => {
      button.addEventListener("click", () => {
        api.removeArea(button.dataset.deleteArea);
        clearAreaForm("Front Door");
        status("Area removed. Active area updated.");
        render();
      });
    });
  }

  function status(message) {
    if (els.areaStatus) els.areaStatus.textContent = message || "";
  }

  function saveArea() {
    const api = state();
    if (!api) return false;

    if (!validateAreaForm()) return false;

    const area = areaFromForm();
    api.upsertArea(area);
    editingAreaId = area.id;
    status(area.name + " saved as the active planning area.");
    render();
    return true;
  }

  function newArea() {
    const ledger = state()?.readLedger();
    const next = (ledger?.areas?.length || 0) + 1;
    clearAreaForm("Area " + next);
    status("Enter assumptions for the new area, then save it.");
  }

  function confirmResetAreaPlan() {
    if (typeof window === "undefined" || typeof window.confirm !== "function") return true;

    return window.confirm([
      "Reset Area Plan?",
      "This will delete all saved Physical Security areas/zones and clear the current Physical Security pipeline memory used by the Summary page, including area guidance, tool guidance, and tool-specific notes.",
      "This does not delete saved account snapshots.",
      "Continue?"
    ].join(String.fromCharCode(10, 10)));
  }

  function storageKeys(storage) {
    const keys = [];
    if (!storage) return keys;

    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key) keys.push(key);
      }
    } catch {}

    return keys;
  }

  function removeStorageKey(storage, key) {
    if (!storage || !key) return false;

    try {
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function removePhysicalSecurityReportPageMetadata(storage) {
    const prefix = "scopedlabs:report-metadata:page:";
    let removed = 0;

    storageKeys(storage).forEach((key) => {
      if (!key.startsWith(prefix)) return;

      let sourcePath = key.slice(prefix.length).split("#area:")[0];

      try {
        const raw = storage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && parsed.sourcePath) sourcePath = parsed.sourcePath;
      } catch {}

      if (String(sourcePath || "").toLowerCase().includes("/tools/physical-security/")) {
        if (removeStorageKey(storage, key)) removed += 1;
      }
    });

    return removed;
  }

  function clearPhysicalSecurityPlanningMemory() {
    const stores = [window.sessionStorage, window.localStorage].filter(Boolean);
    const pipelinePrefix = "scopedlabs:pipeline:physical-security:";
    const guidanceMemoryKey = "scopedlabs:physical-security:guidance-memory:v1";

    let removed = 0;

    stores.forEach((storage) => {
      storageKeys(storage).forEach((key) => {
        if (key.startsWith(pipelinePrefix) || key === guidanceMemoryKey) {
          if (removeStorageKey(storage, key)) removed += 1;
        }
      });

      removed += removePhysicalSecurityReportPageMetadata(storage);
    });

    try {
      window.ScopedLabsPhysicalSecurityGuidanceMemory?.clearAll?.();
    } catch {}

    try {
      window.dispatchEvent(new CustomEvent("scopedlabs:physical-security-guidance-cleared", {
        detail: {
          category: CATEGORY,
          source: "area-planner-reset"
        }
      }));
    } catch {}

    try {
      window.dispatchEvent(new CustomEvent("scopedlabs:report-metadata-saved", {
        detail: {
          category: CATEGORY,
          source: "area-planner-reset",
          cleared: true
        }
      }));
    } catch {}

    return removed;
  }

  function resetAreas() {
    if (!confirmResetAreaPlan()) {
      status("Area plan reset canceled.");
      return;
    }

    clearPhysicalSecurityPlanningMemory();

    editingAreaId = null;
    const api = state();
    if (api) {
      api.writeLedger({
        schema: "scopedlabs.physical-security.area-ledger.v1",
        projectMode: "multi-area",
        activeAreaId: null,
        areas: []
      });
    }

    clearAreaForm("Front Door");
    status("Area plan reset. Physical Security areas, guidance memory, and Summary tool notes were cleared. Enter the first area above, then save it.");
    render();
  }

  function areaFormHasUserInput() {
    return [
      els.areaName?.value,
      els.protectedLengthFt?.value,
      els.distanceToTargetPlaneFt?.value,
      els.assumedHfovDeg?.value,
      els.targetCameraCount?.value
    ].some((value) => String(value || "").trim() !== "");
  }

  function hasSavedPlanningArea() {
    const api = state();
    if (!api) return false;

    const ledger = api.readLedger();
    return !!(ledger && Array.isArray(ledger.areas) && ledger.areas.length > 0 && ledger.activeAreaId);
  }

  function continueFlow() {
    const api = state();
    if (!api) return;

    const shouldSaveForm = !!editingAreaId || areaFormHasUserInput();

    if (shouldSaveForm) {
      if (!saveArea()) return;
      window.location.href = getActiveAreaRouteUrl();
      return;
    }

    if (hasSavedPlanningArea()) {
      window.location.href = getActiveAreaRouteUrl();
      return;
    }

    status("Save at least one planning area before continuing.");
  }


  function bind() {
    removeLegacySummaryButton();

    els.saveArea?.addEventListener("click", saveArea);
    els.newArea?.addEventListener("click", newArea);
    els.resetAreas?.addEventListener("click", resetAreas);
    els.continueBtn?.addEventListener("click", continueFlow);
    els.printSummary?.addEventListener("click", printAreaSummary);
    els.copySummaryJson?.addEventListener("click", copyAreaSummaryJson);
  }

  function init() {
    if (!state()) {
      status("Area state engine did not load.");
      return;
    }

    const api = state();
    removeLegacyStarterAreaIfNeeded();
    clearAreaForm("Front Door");
    bind();
    render();
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    let unlocked = unlockCategoryPage();
    if (unlocked) init();

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked && els.toolCard && !els.toolCard.dataset.initialized) {
        els.toolCard.dataset.initialized = "true";
        init();
      }
    }, 400);
  });
})();
