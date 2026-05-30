(function () {
  "use strict";

  const VERSION = "physical-security-summary-selected-scope-guidance-009";

  const CORE_TOOLS = [
    ["scene-illumination", "Scene Illumination"],
    ["mounting-height", "Mounting Height"],
    ["field-of-view", "Field of View"],
    ["camera-coverage-area", "Camera Coverage Area"],
    ["camera-spacing", "Camera Spacing"],
    ["blind-spot-check", "Blind Spot Check"],
    ["pixel-density", "Pixel Density"],
    ["lens-selection", "Lens Selection"]
  ];

  const SPECIALTY_TOOLS = [
    ["face-recognition-range", "Face Recognition"],
    ["license-plate-range", "License Plate"]
  ];

  let selectedScopeId = "";

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeStatus(value) {
    const text = String(value || "").toLowerCase();
    if (text.includes("risk") || text.includes("fail") || text.includes("blocked")) return "risk";
    if (text.includes("watch") || text.includes("warn") || text.includes("caution") || text.includes("review")) return "watch";
    if (text.includes("healthy") || text.includes("safe") || text.includes("ok") || text.includes("pass")) return "healthy";
    return "unknown";
  }

  function statusLabel(value) {
    const status = normalizeStatus(value);
    if (status === "risk") return "Risk";
    if (status === "watch") return "Watch";
    if (status === "healthy") return "Healthy";
    return "Pending";
  }

  function readGuidanceRecords() {
    const api = window.ScopedLabsPhysicalSecurityGuidanceMemory;
    if (api && typeof api.listToolGuidance === "function") {
      try {
        return api.listToolGuidance() || [];
      } catch {}
    }
    return [];
  }

  function readAreaLedger() {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    const empty = { areas: [], activeAreaId: "" };

    if (!api) return empty;

    const methods = ["readLedger", "getLedger", "explainAreaState", "readState"];
    for (const method of methods) {
      if (typeof api[method] !== "function") continue;
      try {
        const value = api[method]();
        if (Array.isArray(value)) return { areas: value, activeAreaId: "" };
        if (value && Array.isArray(value.areas)) return value;
        if (value && value.ledger && Array.isArray(value.ledger.areas)) return value.ledger;
      } catch {}
    }

    return empty;
  }

  function routeGroup(area) {
    const value = String((area && (area.routeIntent || area.scopeType || area.areaType)) || "").toLowerCase();
    if (value.includes("face")) return "face";
    if (value.includes("plate") || value.includes("license")) return "plate";
    return "core";
  }

  function routeLabel(group) {
    if (group === "face") return "Face Recognition Zone";
    if (group === "plate") return "License Plate Zone";
    return "Core Coverage Area";
  }

  function recordBySlug(records) {
    return records.reduce((map, record) => {
      if (record && record.slug) map[record.slug] = record;
      return map;
    }, {});
  }

  function toolRows(tools, recordsBySlug) {
    return tools.map(([slug, label]) => {
      const record = recordsBySlug[slug] || null;
      return {
        slug,
        label,
        generated: !!record,
        status: record ? normalizeStatus(record.status) : "unknown",
        detail: record ? (record.reportSummary || record.action || record.reason || record.nextStep || "Generated guidance saved.") : "Not recorded in guidance memory yet."
      };
    });
  }

  function counts(rows) {
    return rows.reduce((acc, row) => {
      if (row.generated) acc.generated += 1;
      const status = normalizeStatus(row.status);
      if (status === "healthy") acc.healthy += 1;
      else if (status === "watch") acc.watch += 1;
      else if (status === "risk") acc.risk += 1;
      else acc.pending += 1;
      return acc;
    }, { generated: 0, healthy: 0, watch: 0, risk: 0, pending: 0 });
  }

  function overallStatus(counts) {
    if (counts.risk > 0) return "risk";
    if (counts.watch > 0) return "watch";
    if (counts.generated > 0 && counts.pending === 0) return "healthy";
    if (counts.generated > 0) return "watch";
    return "unknown";
  }

  function areaGroups(ledger) {
    const areas = Array.isArray(ledger.areas) ? ledger.areas : [];
    return {
      total: areas.length,
      activeAreaId: ledger.activeAreaId || "",
      core: areas.filter((area) => routeGroup(area) === "core"),
      face: areas.filter((area) => routeGroup(area) === "face"),
      plate: areas.filter((area) => routeGroup(area) === "plate")
    };
  }

  function kpi(title, value, detail) {
    return '<div class="summary-panel"><h3>' + escapeHtml(title) + '</h3><div class="summary-kpi">' + escapeHtml(value) + '</div><p class="muted" style="margin:8px 0 0;">' + escapeHtml(detail) + '</p></div>';
  }

  function renderRows(title, rows) {
    const body = rows.map((row) => {
      return '<tr><td>' + escapeHtml(row.label) + '</td><td><span class="summary-status ' + escapeHtml(row.status) + '">' + escapeHtml(statusLabel(row.status)) + '</span></td><td>' + escapeHtml(row.detail) + '</td></tr>';
    }).join("");

    return '<h3 class="h3" style="margin-top:18px;">' + escapeHtml(title) + '</h3><table class="summary-table"><thead><tr><th>Tool</th><th>Status</th><th>Detail</th></tr></thead><tbody>' + body + '</tbody></table>';
  }

  function areaDetail(area) {
    const parts = [];
    if (area.protectedLengthFt) parts.push("span " + area.protectedLengthFt + " ft");
    if (area.distanceToTargetPlaneFt) parts.push("distance " + area.distanceToTargetPlaneFt + " ft");
    if (area.cameraCount) parts.push(area.cameraCount + " camera" + (Number(area.cameraCount) === 1 ? "" : "s"));
    if (area.selectedLensMm) parts.push(area.selectedLensMm + " mm lens");
    if (area.faceRecognitionMaxDistanceFt) parts.push("face max " + area.faceRecognitionMaxDistanceFt + " ft");
    if (area.licensePlateMaxDistanceFt) parts.push("plate max " + area.licensePlateMaxDistanceFt + " ft");
    return parts.length ? parts.join(" | ") : "No detailed result saved yet.";
  }

  function firstAreaValue(area, keys) {
    const source = area && typeof area === "object" ? area : {};
    for (const key of keys) {
      const value = source[key];
      if (value === 0) return value;
      if (value === false) return value;
      if (value != null && String(value).trim() !== "") return value;
    }
    return "";
  }

  function areaToolDefinitions(group) {
    if (group === "face") {
      return [
        {
          label: "Face Recognition",
          statusKeys: ["faceRecognitionStatus", "faceStatus", "overallStatus"],
          detailKeys: ["faceRecognitionSummary", "faceSummary", "faceRecognitionMaxDistanceFt", "distanceToTargetPlaneFt"]
        }
      ];
    }

    if (group === "plate") {
      return [
        {
          label: "License Plate",
          statusKeys: ["licensePlateStatus", "plateStatus", "overallStatus"],
          detailKeys: ["licensePlateSummary", "plateSummary", "licensePlateMaxDistanceFt", "distanceToTargetPlaneFt"]
        }
      ];
    }

    return [
      { label: "Scene Illumination", statusKeys: ["sceneIlluminationStatus", "illuminationStatus", "lightingStatus"], detailKeys: ["sceneIlluminationSummary", "illuminationSummary", "lightingSummary"] },
      { label: "Mounting Height", statusKeys: ["mountingHeightStatus", "heightStatus"], detailKeys: ["mountingHeightSummary", "mountingHeightFt"] },
      { label: "Field of View", statusKeys: ["fieldOfViewStatus", "fovStatus"], detailKeys: ["fieldOfViewSummary", "fovSummary", "assumedHfovDeg"] },
      { label: "Camera Coverage Area", statusKeys: ["cameraCoverageAreaStatus", "coverageStatus"], detailKeys: ["cameraCoverageAreaSummary", "coverageSummary", "distanceToTargetPlaneFt", "protectedLengthFt"] },
      { label: "Camera Spacing", statusKeys: ["cameraSpacingStatus", "spacingStatus"], detailKeys: ["cameraSpacingSummary", "spacingSummary", "cameraCount", "spacingFt"] },
      { label: "Blind Spot Check", statusKeys: ["blindSpotStatus", "blindSpotCheckStatus"], detailKeys: ["blindSpotSummary", "blindSpotCheckSummary"] },
      { label: "Pixel Density", statusKeys: ["pixelDensityStatus", "densityStatus"], detailKeys: ["pixelDensitySummary", "densitySummary", "pixelDensityPpf"] },
      { label: "Lens Selection", statusKeys: ["lensSelectionStatus", "lensStatus"], detailKeys: ["lensSelectionSummary", "lensSummary", "selectedLensMm"] }
    ];
  }

  function areaToolDetail(area, definition) {
    const value = firstAreaValue(area, definition.detailKeys || []);
    if (value || value === 0 || value === false) return String(value);
    return "No area-specific result saved for this step yet.";
  }

  function areaToolRows(area) {
    const group = routeGroup(area);
    return areaToolDefinitions(group).map((definition) => {
      const statusValue = firstAreaValue(area, definition.statusKeys || []);
      const status = normalizeStatus(statusValue || "unknown");
      return {
        label: definition.label,
        status,
        detail: areaToolDetail(area, definition)
      };
    });
  }

  function renderAreaToolTable(area) {
    const rows = areaToolRows(area);
    const body = rows.map((row) => {
      return '<tr><td>' + escapeHtml(row.label) + '</td><td><span class="summary-status ' + escapeHtml(row.status) + '">' + escapeHtml(statusLabel(row.status)) + '</span></td><td>' + escapeHtml(row.detail) + '</td></tr>';
    }).join("");

    return '<table class="summary-table summary-area-tool-table" data-sl-summary-area-tool-table="true"><thead><tr><th>Tool / Area Step</th><th>Status</th><th>Area / Zone Detail</th></tr></thead><tbody>' + body + '</tbody></table>';
  }

  function renderAreaSection(title, areas, activeId) {
    const rows = areas.length
      ? areas.map((area, index) => {
          const group = routeGroup(area);
          const active = activeId && area.id === activeId ? " | Active" : "";
          const status = normalizeStatus(area.overallStatus || area.lensStatus || area.spacingStatus || area.faceRecognitionStatus || area.licensePlateStatus || area.status || "unknown");
          const label = title.replace(/s$/, "");

          return '<div class="summary-row summary-area-rollup-card" data-sl-summary-area-rollup-card="true"><h3>' + escapeHtml(label + ' ' + String(index + 1) + ': ' + (area.name || 'Unnamed Area')) + '</h3><p class="summary-area-rollup-meta">' + escapeHtml(routeLabel(group) + active + ' | ' + areaDetail(area)) + '</p><p><span class="summary-status ' + escapeHtml(status) + '">' + escapeHtml(statusLabel(status)) + '</span></p>' + renderAreaToolTable(area) + '</div>';
        }).join("")
      : '<div class="summary-row" style="margin-top:10px;"><p class="muted" style="margin:0;">No ' + escapeHtml(title.toLowerCase()) + ' recorded yet.</p></div>';

    return '<h3 class="h3" style="margin-top:18px;">' + escapeHtml(title) + '</h3>' + rows;
  }

  function scopeStatus(area) {
    return normalizeStatus(area && (area.overallStatus || area.lensStatus || area.spacingStatus || area.faceRecognitionStatus || area.licensePlateStatus || area.status || "unknown"));
  }

  function scopeId(area, group, index) {
    const raw = area && area.id ? String(area.id) : group + "-" + String(index + 1);
    return group + "::" + raw;
  }

  function scopeNumberLabel(group, index) {
    if (group === "face") return "Face Zone " + String(index + 1);
    if (group === "plate") return "Plate Zone " + String(index + 1);
    return "Area " + String(index + 1);
  }

  function scopeSequence(groups) {
    const list = [];
    const source = groups || { core: [], face: [], plate: [], activeAreaId: "" };

    [["core", source.core || []], ["face", source.face || []], ["plate", source.plate || []]].forEach(([group, areas]) => {
      areas.forEach((area, index) => {
        const numberLabel = scopeNumberLabel(group, index);
        const name = area && area.name ? String(area.name) : "Unnamed Area";

        list.push({
          id: scopeId(area, group, index),
          rawId: area && area.id ? String(area.id) : "",
          group,
          index,
          area,
          numberLabel,
          label: numberLabel + ": " + name,
          route: routeLabel(group),
          status: scopeStatus(area)
        });
      });
    });

    return list;
  }

  function selectedScope(scopes, activeAreaId) {
    if (!Array.isArray(scopes) || !scopes.length) return null;

    const saved = selectedScopeId ? scopes.find((scope) => scope.id === selectedScopeId) : null;
    if (saved) return saved;

    const active = activeAreaId ? scopes.find((scope) => scope.rawId && scope.rawId === activeAreaId) : null;
    if (active) {
      selectedScopeId = active.id;
      return active;
    }

    const risk = scopes.find((scope) => normalizeStatus(scope.status) === "risk");
    if (risk) {
      selectedScopeId = risk.id;
      return risk;
    }

    const watch = scopes.find((scope) => normalizeStatus(scope.status) === "watch");
    if (watch) {
      selectedScopeId = watch.id;
      return watch;
    }

    selectedScopeId = scopes[0].id;
    return scopes[0];
  }


  function renderAreaSelectorRail(scopes, selected) {
    if (!Array.isArray(scopes) || scopes.length <= 1 || !selected) return "";

    const selectedStatus = normalizeStatus(selected.status);
    const steps = scopes.map((scope, index) => {
      const isActive = scope.id === selected.id;
      const active = isActive ? " active" : "";
      const currentAttr = isActive ? ' aria-current="step"' : "";
      const status = normalizeStatus(scope.status);
      const arrow = index < scopes.length - 1 ? '<span class="summary-area-selector-arrow" aria-hidden="true">→</span>' : "";

      return '<button type="button" class="summary-area-selector-step ' + escapeHtml(status + active) + '" data-sl-summary-scope-select="' + escapeHtml(scope.id) + '"' + currentAttr + '><span class="summary-area-selector-led" aria-hidden="true"></span><span class="summary-area-selector-label">' + escapeHtml(scope.label) + '</span><span class="summary-area-selector-status">' + escapeHtml(statusLabel(status)) + '</span></button>' + arrow;
    }).join("");

    return '<div class="summary-area-selector-wrap" data-sl-summary-area-selector-rail="true"><div class="summary-area-selector-rail" role="list" aria-label="Area and zone selector">' + steps + '</div><p class="summary-area-selector-current"><span class="summary-area-current-led ' + escapeHtml(selectedStatus) + '" aria-hidden="true"></span>Currently viewing: <strong>' + escapeHtml(selected.label) + '</strong><span class="summary-area-selector-current-status ' + escapeHtml(selectedStatus) + '">' + escapeHtml(statusLabel(selectedStatus)) + '</span></p></div>';
  }


  function renderSelectedAreaScope(scope, activeAreaId) {
    if (!scope) {
      return '<div class="summary-row" style="margin-top:10px;"><p class="muted" style="margin:0;">No areas or zones recorded yet.</p></div>';
    }

    const active = scope.rawId && activeAreaId && scope.rawId === activeAreaId ? " | Active" : "";
    const area = scope.area || {};
    const status = normalizeStatus(scope.status);

    return '<div class="summary-row summary-area-rollup-card" data-sl-summary-area-rollup-card="true"><h3>Currently viewing: ' + escapeHtml(scope.label) + '</h3><p class="summary-area-rollup-meta">' + escapeHtml(scope.route + active + ' | ' + areaDetail(area)) + '</p><p><span class="summary-status ' + escapeHtml(status) + '">' + escapeHtml(statusLabel(status)) + '</span></p></div>';
  }

  function renderAreaRollup(groups) {
    const source = groups || { activeAreaId: "" };
    const scopes = scopeSequence(source);
    const selected = selectedScope(scopes, source.activeAreaId || "");

    return '<h3 class="h3" style="margin-top:18px;">Area / Zone Rollup</h3>' + renderAreaSelectorRail(scopes, selected) + renderSelectedAreaScope(selected, source.activeAreaId || "");
  }


  function currentSelectedScope(groups) {
    const source = groups || { activeAreaId: "" };
    const scopes = scopeSequence(source);
    return selectedScope(scopes, source.activeAreaId || "");
  }

  function selectedGuidanceTitle(scope) {
    if (!scope) return "Selected Area Guidance";
    if (scope.group === "face" || scope.group === "plate") return "Specialty Branch Guidance for Selected Zone";
    return "Core Pipeline Guidance for Selected Area";
  }

  function renderSelectedScopeGuidance(groups) {
    const selected = currentSelectedScope(groups);

    if (!selected) {
      return '<h3 class="h3" style="margin-top:18px;">Selected Area Guidance</h3><div class="summary-row" style="margin-top:10px;"><p class="muted" style="margin:0;">No selected area or zone guidance is available yet.</p></div>';
    }

    return '<h3 class="h3" style="margin-top:18px;">' + escapeHtml(selectedGuidanceTitle(selected)) + '</h3>' + renderAreaToolTable(selected.area || {});
  }

  function bindAreaSelector(mount) {
    if (!mount) return;

    mount.querySelectorAll("[data-sl-summary-scope-select]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedScopeId = button.getAttribute("data-sl-summary-scope-select") || "";
        render();
      });
    });
  }

  function buildModel() {
    const records = readGuidanceRecords();
    const recordsBySlug = recordBySlug(records);
    const coreRows = toolRows(CORE_TOOLS, recordsBySlug);
    const specialtyRows = toolRows(SPECIALTY_TOOLS, recordsBySlug);
    const allRows = coreRows.concat(specialtyRows);
    const allCounts = counts(allRows);
    const ledger = readAreaLedger();
    const groups = areaGroups(ledger);

    return {
      version: VERSION,
      records,
      coreRows,
      specialtyRows,
      allRows,
      counts: allCounts,
      status: overallStatus(allCounts),
      ledger,
      groups
    };
  }

  function payload(model) {
    return {
      schema: "scopedlabs.category-summary.v1",
      category: "physical-security",
      summaryPageVersion: VERSION,
      crossCategoryReady: true,
      generatedAt: new Date().toISOString(),
      scopeTypes: ["core-coverage", "face-recognition-zone", "license-plate-zone"],
      futureSiteAssistantInputs: {
        areaZoneScopeIds: true,
        equipmentProfileRefs: true,
        assumptions: true,
        risksAndWatchItems: true,
        dependencies: ["network-poe", "power-runtime", "storage-retention", "access-control-doors"],
        finalReports: true
      },
      counts: {
        guidance: model.counts,
        scopes: {
          total: model.groups.total,
          core: model.groups.core.length,
          face: model.groups.face.length,
          plate: model.groups.plate.length
        }
      },
      records: model.records.map((record) => ({
        slug: record.slug || "",
        status: normalizeStatus(record.status),
        action: record.action || "",
        reason: record.reason || "",
        nextStep: record.nextStep || "",
        savedAt: record.savedAt || ""
      }))
    };
  }

  function statusRank(value) {
    const status = normalizeStatus(value);
    if (status === "risk") return 0;
    if (status === "watch") return 1;
    if (status === "unknown") return 2;
    return 3;
  }

  function masterReadiness(model) {
    const counts = model.counts || {};
    const corePending = (model.coreRows || []).filter((row) => !row.generated || normalizeStatus(row.status) === "unknown").length;

    if (counts.risk > 0) {
      return {
        label: "Risk-first review",
        detail: "Resolve the highest-priority Physical Security risk before treating this category as report-ready."
      };
    }

    if (counts.watch > 0) {
      return {
        label: "Watch-list validation",
        detail: "Confirm watch assumptions before locking the Physical Security summary into a final report."
      };
    }

    if (corePending > 0) {
      return {
        label: "Core pipeline incomplete",
        detail: String(corePending) + " core tool" + (corePending === 1 ? " is" : "s are") + " still missing generated guidance."
      };
    }

    return {
      label: "Report-ready review",
      detail: "Generated core guidance is healthy across the available Physical Security tool results."
    };
  }

  function masterPriorityQueue(model, explanation) {
    const queue = [];
    const rows = (model.allRows || []).slice().sort((a, b) => statusRank(a.status) - statusRank(b.status));
    const priorityTool = explanation && explanation.priorityTool ? explanation.priorityTool : null;
    const prioritySlug = priorityTool && priorityTool.slug ? priorityTool.slug : "";

    if (priorityTool) {
      queue.push({
        label: "Top priority",
        detail: (priorityTool.label || prioritySlug || "Priority tool") + (priorityTool.nextStep ? ": " + priorityTool.nextStep : " should be reviewed first.")
      });
    }

    rows.filter((row) => row.generated && (normalizeStatus(row.status) === "risk" || normalizeStatus(row.status) === "watch"))
      .slice(0, 3)
      .forEach((row) => {
        if (prioritySlug && row.slug === prioritySlug) return;
        queue.push({
          label: statusLabel(row.status) + " item",
          detail: row.label + ": " + row.detail
        });
      });

    const missingCore = (model.coreRows || []).filter((row) => !row.generated || normalizeStatus(row.status) === "unknown");
    if (missingCore.length) {
      queue.push({
        label: "Core completion",
        detail: "Still missing: " + missingCore.map((row) => row.label).join(", ") + "."
      });
    }

    if (!queue.length) {
      queue.push({
        label: "Ready for report",
        detail: "No category-level risk or watch priority is currently blocking the Physical Security summary."
      });
    }

    return queue.slice(0, 4);
  }

  function renderMasterContext(model, explanation) {
    const mount = byId("physicalSecuritySummaryMasterContext");
    if (!mount) return;

    const readiness = masterReadiness(model);
    const queue = masterPriorityQueue(model, explanation || {});
    const groups = model.groups || { total: 0, core: [], face: [], plate: [] };
    const counts = model.counts || { generated: 0, healthy: 0, watch: 0, risk: 0 };

    const queueHtml = queue.map((item) => {
      return '<div class="summary-master-action-item"><span>' + escapeHtml(item.label) + '</span><p>' + escapeHtml(item.detail) + '</p></div>';
    }).join("");

    mount.innerHTML = [
      '<div class="summary-master-context-grid">',
      '<div class="summary-master-context-card"><strong>' + escapeHtml(readiness.label) + '</strong><p>' + escapeHtml(readiness.detail) + '</p></div>',
      '<div class="summary-master-context-card"><strong>Area / zone rollup</strong><p>' + escapeHtml(String(groups.total) + ' scope' + (groups.total === 1 ? '' : 's') + ' | ' + groups.core.length + ' core | ' + groups.face.length + ' face | ' + groups.plate.length + ' plate') + '</p></div>',
      '<div class="summary-master-context-card"><strong>Guidance stack</strong><p>' + escapeHtml(String(counts.generated) + ' generated | ' + counts.healthy + ' healthy | ' + counts.watch + ' watch | ' + counts.risk + ' risk') + '</p></div>',
      '</div>',
      '<div class="summary-master-action-list">' + queueHtml + '</div>'
    ].join("");
  }

  function renderMasterAssistant(model) {
    const mount = byId("physicalSecuritySummaryMasterMount");
    const categoryApi = window.ScopedLabsPhysicalSecurityCategoryGuidance;
    const renderer = window.ScopedLabsPhysicalSecurityCategoryGuidanceRenderer;

    if (!mount) return;

    if (categoryApi && typeof categoryApi.explainCurrentGuidance === "function" && renderer && typeof renderer.mount === "function") {
      const explanation = categoryApi.explainCurrentGuidance();
      renderer.mount(mount, explanation, {
        title: "Physical Security Master Assistant",
        kicker: "Category Master",
        subtitle: "Coordinates local tool guidance, optional specialty zones, report readiness, and future Site Assistant handoff context."
      });
      renderMasterContext(model || buildModel(), explanation);
      return;
    }

    mount.innerHTML = '<p class="muted">Physical Security category guidance is not loaded yet.</p>';
    renderMasterContext(model || buildModel(), null);
  }

  function renderReportSummary(model) {
    const mount = byId("physicalSecurityReportMount");
    const reportApi = window.ScopedLabsPhysicalSecurityReportSummary;

    if (!mount) return;

    if (reportApi && typeof reportApi.buildSummary === "function" && typeof reportApi.renderExportHtml === "function") {
      mount.innerHTML = reportApi.renderExportHtml(reportApi.buildSummary());
      return;
    }

    mount.innerHTML = '<table class="summary-table"><thead><tr><th>Category Summary</th><th>Detail</th></tr></thead><tbody><tr><td>Generated guidance</td><td>' + escapeHtml(model.counts.generated) + '</td></tr><tr><td>Healthy / Watch / Risk</td><td>' + escapeHtml(model.counts.healthy + " / " + model.counts.watch + " / " + model.counts.risk) + '</td></tr></tbody></table>';
  }

  function render() {
    const model = buildModel();

    const results = byId("results");
    if (results) {
      results.innerHTML =
        kpi("Category Status", statusLabel(model.status), "Overall readiness from guidance memory and current scope context.") +
        kpi("Tool Guidance", String(model.counts.generated), model.counts.healthy + " healthy | " + model.counts.watch + " watch | " + model.counts.risk + " risk") +
        kpi("Areas / Zones", String(model.groups.total), model.groups.core.length + " core | " + model.groups.face.length + " face | " + model.groups.plate.length + " plate");
    }

    const scopeMount = byId("physicalSecurityScopeMount");
    if (scopeMount) {
      scopeMount.innerHTML =
        renderAreaRollup(model.groups) +
        renderSelectedScopeGuidance(model.groups);
      bindAreaSelector(scopeMount);
    }

    renderMasterAssistant(model);
    renderReportSummary(model);

    const payloadEl = byId("physicalSecurityCrossCategoryPayload");
    const currentPayload = payload(model);

    if (payloadEl) payloadEl.textContent = JSON.stringify(currentPayload, null, 2);

    window.ScopedLabsPhysicalSecuritySummary = Object.freeze({
      version: VERSION,
      model,
      crossCategoryPayload: currentPayload
    });
  }

  function init() {
    render();
    window.addEventListener("storage", render);
    window.addEventListener("scopedlabs:physical-security-guidance-updated", render);
    window.addEventListener("scopedlabs:physical-security-guidance-cleared", render);
  }

  window.ScopedLabsPhysicalSecuritySummaryPage = Object.freeze({
    version: VERSION,
    buildModel,
    render
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
