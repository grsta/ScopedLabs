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
    return number === null ? "n/a" : number.toFixed(1).replace(/\.0$/, "") + "?";
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

  function loadAreaToForm(area) {
    if (!area) return;

    editingAreaId = area.id;
    els.areaName.value = area.name || "Area 1";
    els.areaType.value = area.areaType || "General Coverage";
    els.protectedLengthFt.value = String(area.protectedLengthFt ?? 100);
    els.distanceToTargetPlaneFt.value = String(area.distanceToTargetPlaneFt ?? 80);
    els.assumedHfovDeg.value = String(area.assumedHfovDeg ?? 70);
    els.detailGoal.value = area.detailGoal || "Observation";
    els.targetCameraCount.value = area.targetCameraCount ? String(area.targetCameraCount) : "";
  }

  function areaFromForm() {
    const id = editingAreaId || (String(els.areaName.value || "Area").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now());

    return {
      id,
      name: els.areaName.value || "Area",
      areaType: els.areaType.value || "General Coverage",
      protectedLengthFt: num(els.protectedLengthFt.value, 100),
      distanceToTargetPlaneFt: num(els.distanceToTargetPlaneFt.value, 80),
      assumedHfovDeg: num(els.assumedHfovDeg.value, 70),
      detailGoal: els.detailGoal.value || "Observation",
      targetCameraCount: num(els.targetCameraCount.value, null),
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
      parts.push("HFOV " + Number(area.lensDerivedHfovDeg).toFixed(1).replace(/\.0$/, "") + " deg");
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
        value: (area.mountingStatus || "Recorded") + (area.mountingTiltDeg ? " / " + Number(area.mountingTiltDeg).toFixed(1) + " deg tilt" : ""),
        detail: area.mountingHeightFt ? "Height: " + fmtFt(area.mountingHeightFt) : "Mounting geometry result saved"
      });
    }

    if (area.fovStatus || area.fovFitClass) {
      items.push({
        label: "Field of View",
        value: (area.fovStatus || "Recorded") + (area.fovFitClass ? " / " + area.fovFitClass : ""),
        detail: area.estimatedSceneWidthFt
          ? "Scene width: " + fmtFt(area.estimatedSceneWidthFt) + " at " + Number(area.assumedHfovDeg || 0).toFixed(1).replace(/\.0$/, "") + " deg"
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

  

  function render() {
    const api = state();
    if (!api) return;

    const ledger = api.readLedger();

    if (els.areaCountPill) {
      els.areaCountPill.textContent = ledger.areas.length + " area" + (ledger.areas.length === 1 ? "" : "s");
    }

    if (!els.areaList) return;

    els.areaList.innerHTML = ledger.areas.map((area) => {
      const activeClass = area.id === ledger.activeAreaId ? " is-active" : "";
      const cameraText = area.cameraCount ? area.cameraCount + " planned" : (area.targetCameraCount ? area.targetCameraCount + " target" : "not set");

      return '' +
        '<article class="area-card' + activeClass + '">' +
          '<div class="pill-row">' +
            '<span class="pill">' + (area.id === ledger.activeAreaId ? 'Active Area' : 'Area') + '</span>' +
            '<span class="pill">' + escapeHtml(area.status || 'PLANNING') + '</span>' +
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
        loadAreaToForm(api.getActiveArea());
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
    if (!api) return;

    const area = areaFromForm();
    api.upsertArea(area);
    editingAreaId = area.id;
    status(area.name + " saved as the active planning area.");
    render();
  }

  function newArea() {
    editingAreaId = null;
    const ledger = state()?.readLedger();
    const next = (ledger?.areas?.length || 0) + 1;
    els.areaName.value = "Area " + next;
    els.areaType.value = "General Coverage";
    els.protectedLengthFt.value = "100";
    els.distanceToTargetPlaneFt.value = "80";
    els.assumedHfovDeg.value = "70";
    els.detailGoal.value = "Observation";
    els.targetCameraCount.value = "";
    status("Enter assumptions for Area " + next + ", then save it.");
  }

  function resetAreas() {
    sessionStorage.removeItem("scopedlabs:pipeline:physical-security:areas");
    localStorage.removeItem("scopedlabs:pipeline:physical-security:areas");
    sessionStorage.removeItem("scopedlabs:pipeline:physical-security:active-area");
    localStorage.removeItem("scopedlabs:pipeline:physical-security:active-area");
    editingAreaId = null;
    const api = state();
    if (api) api.writeLedger(api.readLedger());
    loadAreaToForm(api?.getActiveArea());
    status("Area plan reset to a single starter area.");
    render();
  }

  function continueFlow() {
    saveArea();
    window.location.href = NEXT_URL;
  }

  function bind() {
    els.saveArea?.addEventListener("click", saveArea);
    els.newArea?.addEventListener("click", newArea);
    els.resetAreas?.addEventListener("click", resetAreas);
    els.continueBtn?.addEventListener("click", continueFlow);
  }

  function init() {
    if (!state()) {
      status("Area state engine did not load.");
      return;
    }

    const api = state();
    api.writeLedger(api.readLedger());
    loadAreaToForm(api.getActiveArea());
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
