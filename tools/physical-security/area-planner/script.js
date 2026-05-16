(() => {
  "use strict";

  const CATEGORY = "physical-security";
  const NEXT_URL = "/tools/physical-security/scene-illumination/";

  const $ = (id) => document.getElementById(id);

  const els = {
    areaName: $("areaName"),
    areaType: $("areaType"),
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
    printSummary: $("printAreaSummary"),
    copySummaryJson: $("copyAreaSummaryJson"),
    continueBtn: $("continue"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  let editingAreaId = null;

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

  function physicalSecuritySummaryModel(ledger) {
    const areas = (ledger?.areas || []).map(areaSummaryModel);
    const totalCameras = areas.reduce((sum, item) => sum + (Number(item.area.cameraCount || item.area.targetCameraCount || 0) || 0), 0);
    const completeAreas = areas.filter((item) => item.completionPct === 100).length;
    const attentionAreas = areas.filter((item) => item.overallStatus === "RISK" || item.overallStatus === "WATCH" || item.area.spacingRevalidationRequired).length;
    const integrityStates = Array.from(new Set(areas.map((item) => item.integrity.label)));

    return {
      generatedAt: new Date().toISOString(),
      areaCount: areas.length,
      totalCameras,
      completeAreas,
      attentionAreas,
      integrityStates,
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

  function areaSummaryHtml(model) {
    if (!model || !model.areas.length) {
      return '<div class="area-summary-warn">No areas have been created yet. Add an area before generating the summary.</div>';
    }

    const rollup = '' +
      '<div class="area-summary-rollup">' +
        metricHtml("Areas", String(model.areaCount), "Defined planning zones.") +
        metricHtml("Planned Cameras", String(model.totalCameras), "Sum of planned or target camera counts.") +
        metricHtml("Complete Areas", model.completeAreas + " / " + model.areaCount, "Areas with all tracked tool rows recorded.") +
        metricHtml("Needs Attention", String(model.attentionAreas), "Watch/Risk/revalidation areas.") +
      '</div>';

    const zones = model.areas.map((item) => {
      const area = item.area;
      const cameraText = area.cameraCount ? area.cameraCount + " planned" : (area.targetCameraCount ? area.targetCameraCount + " target" : "not set");
      const rows = item.rows.map((row) => {
        return '' +
          '<tr>' +
            '<td>' + escapeHtml(row.label) + '</td>' +
            '<td>' + escapeHtml(row.complete ? normalizeStatus(row.status) : "PENDING") + '</td>' +
            '<td>' + escapeHtml(row.detail || "") + '</td>' +
          '</tr>';
      }).join("");

      return '' +
        '<article class="area-summary-zone">' +
          '<div class="area-summary-zone-head">' +
            '<div>' +
              '<span class="area-summary-label">' + escapeHtml(area.areaType || "Area") + '</span>' +
              '<h4>' + escapeHtml(area.name || "Area") + '</h4>' +
              '<div class="area-summary-note">Length ' + escapeHtml(fmtFt(area.protectedLengthFt)) + ' | Distance ' + escapeHtml(fmtFt(area.distanceToTargetPlaneFt)) + ' | HFOV ' + escapeHtml(fmtDeg(area.assumedHfovDeg)) + ' | Cameras ' + escapeHtml(cameraText) + '</div>' +
            '</div>' +
            '<div class="pill-row">' +
              '<span class="pill">' + escapeHtml(item.overallStatus) + '</span>' +
              '<span class="pill">' + escapeHtml(item.completionPct + "% complete") + '</span>' +
              '<span class="pill">' + escapeHtml(item.integrity.label) + '</span>' +
            '</div>' +
          '</div>' +
          '<table class="area-summary-table">' +
            '<thead><tr><th>Check</th><th>Status</th><th>Result</th></tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
          '<div class="area-summary-warn"><strong>Next action:</strong> ' + escapeHtml(item.nextActions.join(" ")) + '</div>' +
          '<div class="area-summary-note"><strong>Source integrity:</strong> ' + escapeHtml(item.integrity.notes.join(" ")) + '</div>' +
        '</article>';
    }).join("");

    return rollup + '<div class="area-summary-zones">' + zones + '</div>';
  }

  function renderAreaSummary(ledger) {
    if (!els.areaSummary) return;
    const model = physicalSecuritySummaryModel(ledger);
    els.areaSummary.innerHTML = areaSummaryHtml(model);
    window.ScopedLabsPhysicalSecurityAreaSummary = model;
  }

  function printAreaSummary() {
    document.body.classList.add("print-area-summary");
    window.print();
    setTimeout(() => document.body.classList.remove("print-area-summary"), 250);
  }

  function copyAreaSummaryJson() {
    const model = window.ScopedLabsPhysicalSecurityAreaSummary || physicalSecuritySummaryModel(state()?.readLedger() || { areas: [] });
    const text = JSON.stringify(model, null, 2);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => status("Area summary data copied."))
        .catch(() => status("Could not copy automatically. Use browser dev tools to read window.ScopedLabsPhysicalSecurityAreaSummary."));
      return;
    }

    status("Copy unavailable. Use window.ScopedLabsPhysicalSecurityAreaSummary in the browser console.");
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
          '<div class="pill-row">' +
            '<span class="pill">' + (area.id === ledger.activeAreaId ? 'Active Area' : 'Area') + '</span>' +
            '<span class="pill">' + escapeHtml(formatAreaWorkflowStatus(area.status)) + '</span>' +
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

  function resetAreas() {
    sessionStorage.removeItem("scopedlabs:pipeline:physical-security:areas");
    localStorage.removeItem("scopedlabs:pipeline:physical-security:areas");
    sessionStorage.removeItem("scopedlabs:pipeline:physical-security:active-area");
    localStorage.removeItem("scopedlabs:pipeline:physical-security:active-area");

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
    status("Area plan reset. Enter the first area above, then save it.");
    render();
  }

  function continueFlow() {
    if (!saveArea()) return;
    window.location.href = NEXT_URL;
  }

  function bind() {
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
