(function () {
  "use strict";

  const VERSION = "physical-security-report-summary-025-area-step-headings";
  const CATEGORY = "physical-security";
  const EXPORT_MOUNT_ID = "physicalSecurityReportMount";
  const EXPORT_SLOT_ID = "physicalSecurityReportSummaryExportSlot";

  const TOOL_ORDER = [
    "scene-illumination",
    "mounting-height",
    "field-of-view",
    "camera-coverage-area",
    "camera-spacing",
    "blind-spot-check",
    "pixel-density",
    "face-recognition-range",
    "license-plate-range"
  ];

  const TOOL_LABELS = {
    "scene-illumination": "Scene Illumination",
    "mounting-height": "Mounting Height",
    "field-of-view": "Field of View",
    "camera-coverage-area": "Camera Coverage Area",
    "camera-spacing": "Camera Spacing",
    "blind-spot-check": "Blind Spot Check",
    "pixel-density": "Pixel Density",
    "face-recognition-range": "Face Recognition Range",
    "license-plate-range": "License Plate Range"
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function plainReportText(value) {
    return String(value ?? "")
      .replace(/<[^>]*>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
  }


  function normalizeStatus(value) {
    const text = String(value || "").toLowerCase();

    if (text.includes("risk") || text.includes("fail") || text.includes("critical")) return "risk";
    if (text.includes("watch") || text.includes("warn") || text.includes("review")) return "watch";
    if (text.includes("healthy") || text.includes("safe") || text.includes("pass") || text.includes("ok")) return "healthy";
    if (text.includes("pending") || text.includes("incomplete") || text.includes("not started") || text.includes("not saved") || text.includes("unknown")) return "pending";

    return "pending";
  }

  function statusRank(status) {
    if (status === "risk") return 3;
    if (status === "watch") return 2;
    if (status === "healthy") return 1;
    return 0;
  }

  function getMemoryApi() {
    return window.ScopedLabsPhysicalSecurityGuidanceMemory || null;
  }

  function getCategoryApi() {
    return window.ScopedLabsPhysicalSecurityCategoryGuidance || null;
  }

  function tryCall(api, names) {
    if (!api) return null;

    for (const name of names) {
      if (typeof api[name] !== "function") continue;

      try {
        const value = api[name]();
        if (value) return value;
      } catch {}
    }

    return null;
  }

  function primaryRecommendationFor(guidance) {
    if (!guidance || typeof guidance !== "object") return {};
    return guidance.primaryRecommendation || guidance.recommendation || {};
  }

  function getToolRecordFromMemory(slug) {
    const memory = getMemoryApi();
    if (!memory) return null;

    if (typeof memory.getToolGuidance === "function") {
      try {
        return memory.getToolGuidance(slug) || null;
      } catch {}
    }

    return null;
  }

  function recordFromMemory(slug) {
    const record = getToolRecordFromMemory(slug);
    if (!record) return null;

    const guidance = record.guidance || record;
    const primary = primaryRecommendationFor(guidance);

    return {
      slug,
      label: TOOL_LABELS[slug] || slug,
      generated: true,
      status: normalizeStatus(record.status || guidance.status),
      mode: record.mode || guidance.mode || "unknown",
      action: record.action || primary.action || "",
      reason: record.reason || primary.reason || "",
      expectedResult: record.expectedResult || primary.expectedResult || "",
      nextStep: record.nextStep || primary.nextStep || "",
      reportSummary: record.reportSummary || guidance.reportSummary || "",
      savedAt: record.savedAt || ""
    };
  }

  function normalizeToolFromCategory(tool) {
    if (!tool || typeof tool !== "object") return null;

    return {
      slug: tool.slug || "",
      label: tool.label || TOOL_LABELS[tool.slug] || tool.slug || "Physical Security Tool",
      generated: !!tool.generated,
      status: normalizeStatus(tool.status),
      mode: tool.mode || "unknown",
      action: tool.action || "",
      reason: tool.reason || "",
      expectedResult: tool.expectedResult || "",
      nextStep: tool.nextStep || "",
      reportSummary: tool.reportSummary || "",
      savedAt: tool.memoryRecord && tool.memoryRecord.savedAt ? tool.memoryRecord.savedAt : ""
    };
  }

  function getCategoryExplanation() {
    const api = getCategoryApi();

    const explanation = tryCall(api, [
      "getCurrentExplanation",
      "currentExplanation",
      "createCurrentExplanation",
      "explainCurrentCategory",
      "explain",
      "getExplanation",
      "getSummary"
    ]);

    if (explanation && typeof explanation === "object") {
      return explanation;
    }

    return null;
  }

  function buildFromCategoryExplanation(explanation) {
    if (!explanation || typeof explanation !== "object") return null;

    const rawTools =
      Array.isArray(explanation.tools) ? explanation.tools :
      Array.isArray(explanation.entries) ? explanation.entries :
      Array.isArray(explanation.guidance) ? explanation.guidance :
      [];

    const tools = rawTools
      .map(normalizeToolFromCategory)
      .filter(Boolean)
      .filter((tool) => tool.generated);

    if (!tools.length) return null;

    return buildSummaryFromTools(tools, explanation);
  }

  function buildFromMemory() {
    const tools = TOOL_ORDER
      .map(recordFromMemory)
      .filter(Boolean)
      .filter((tool) => tool.generated);

    if (!tools.length) return null;

    return buildSummaryFromTools(tools, null);
  }

  function buildSummaryFromTools(tools, explanation) {
    const counts = tools.reduce(
      (acc, tool) => {
        const status = normalizeStatus(tool.status);
        acc.generated += 1;
        if (status === "healthy") acc.healthy += 1;
        else if (status === "watch") acc.watch += 1;
        else if (status === "risk") acc.risk += 1;
        else acc.unknown += 1;
        return acc;
      },
      { generated: 0, tracked: TOOL_ORDER.length, healthy: 0, watch: 0, risk: 0, unknown: 0 }
    );

    const priorityTool =
      tools
        .slice()
        .sort((a, b) => statusRank(normalizeStatus(b.status)) - statusRank(normalizeStatus(a.status)))[0] || null;

    const status =
      counts.risk > 0 ? "risk" :
      counts.watch > 0 ? "watch" :
      counts.generated > 0 && counts.unknown === 0 ? "healthy" :
      "unknown";

    return {
      version: VERSION,
      category: CATEGORY,
      status,
      counts,
      priorityTool,
      tools,
      action:
        explanation && explanation.action ? explanation.action :
        priorityTool && priorityTool.action ? priorityTool.action :
        status === "risk" ? "Resolve Physical Security risk items before finalizing the design." :
        status === "watch" ? "Validate Physical Security watch items before treating the design as clean." :
        "Continue the Physical Security design flow.",
      reason:
        explanation && explanation.reason ? explanation.reason :
        priorityTool && priorityTool.reason ? priorityTool.reason :
        status === "healthy" ? "Generated Physical Security guidance is currently healthy across the available tool results." :
        "The Physical Security guidance stack has generated report-ready context from the available tool results.",
      nextStep:
        explanation && explanation.nextStep ? explanation.nextStep :
        priorityTool && priorityTool.nextStep ? priorityTool.nextStep :
        status === "risk" ? "Correct the highest-priority risk item, then re-run the affected downstream tools." :
        status === "watch" ? "Confirm watch assumptions before carrying the design forward." :
        "Continue to the next planning step or produce the final category summary."
    };
  }


  /* physical-security-report-summary-022-area-ledger-fallback
     Build a report summary from scoped area/zone rows when category guidance memory is empty. */
  function buildFromScopedReport() {
    const scopedCounts = buildScopedReportCounts();

    if (!scopedCounts || !scopedCounts.generated) return null;

    const detailRows = buildScopedActionRows();
    const priority = scopedPriority(detailRows);
    const status = scopedCounts.status || (scopedCounts.risk ? "risk" : scopedCounts.watch ? "watch" : "healthy");

    return {
      version: VERSION,
      category: CATEGORY,
      status,
      counts: {
        generated: scopedCounts.generated || 0,
        tracked: scopedCounts.tracked || 0,
        healthy: scopedCounts.healthy || 0,
        watch: scopedCounts.watch || 0,
        risk: scopedCounts.risk || 0,
        unknown: scopedCounts.pending || 0,
        pending: scopedCounts.pending || 0
      },
      priorityTool: priority ? {
        key: "scoped-area-priority",
        label: priority.tool || priority.scope || "Scoped area result",
        status,
        action: priority.action || "Review scoped area and zone results before finalizing the report.",
        reason: priority.detail || "The report includes area/zone detail from the active Physical Security planning ledger.",
        nextStep: priority.detail || "Review the Area / Zone Report Sections below."
      } : null,
      tools: [],
      action: status === "risk" ? "Resolve Physical Security risk items before finalizing the design." :
        status === "watch" ? "Validate Physical Security watch items before treating the design as clean." :
        "Review the Physical Security area and zone report sections.",
      reason: "The Physical Security report is generated from the area/zone planning ledger because scoped area results are available.",
      nextStep: "Review Watch/Risk items and the Area / Zone Report Sections before finalizing."
    };
  }


  function buildSummary() {
    return buildFromCategoryExplanation(getCategoryExplanation()) || buildFromMemory() || buildFromScopedReport();
  }


  function statusLabel(status) {
    if (status === "risk") return "Risk";
    if (status === "watch") return "Watch";
    if (status === "healthy") return "Healthy";
    if (status === "pending") return "Pending";
    return "Pending";
  }


  function reportStatusClass(status) {
    const normalized = normalizeStatus(status);
    if (normalized === "risk") return "risk";
    if (normalized === "watch") return "watch";
    if (normalized === "healthy") return "healthy";
    if (normalized === "pending") return "pending";
    return "pending";
  }

  function renderReportStatusText(status) {
    const className = reportStatusClass(status);
    return '<span class="physical-security-report-status ' + className + '">' + escapeHtml(statusLabel(className)) + '</span>';
  }

  function getAreaStateApi() {
    return window.ScopedLabsPhysicalSecurityAreaState || null;
  }

  function readAreaLedger() {
    const api = getAreaStateApi();
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

  function scopeNumberLabel(group, index) {
    if (group === "face") return "Face Zone " + String(index + 1);
    if (group === "plate") return "Plate Zone " + String(index + 1);
    return "Area " + String(index + 1);
  }

  function scopeStatus(area) {
    return normalizeStatus(area && (area.overallStatus || area.lensStatus || area.spacingStatus || area.faceRecognitionStatus || area.licensePlateStatus || area.status || "unknown"));
  }

  function scopeTitle(area, group, index) {
    const name = area && area.name ? String(area.name) : "Unnamed Area";
    return scopeNumberLabel(group, index) + ": " + name;
  }


  function areaDetail(area) {
    const parts = [];
    if (area && area.protectedLengthFt) parts.push("span " + area.protectedLengthFt + " ft");
    if (area && area.distanceToTargetPlaneFt) parts.push("distance " + area.distanceToTargetPlaneFt + " ft");

    const camera = reportCarryValueByKeys(area, ["cameraCount", "targetCameraCount", "plannedCameraCount", "lensCameraCount", "spacingCameraCount", "coverageCount"], { positiveOnly: true });
    if (camera) parts.push(formatCameraCount(camera.value));

    const lens = reportCarryValueByKeys(area, ["selectedLensMm", "adjustedFocalMm", "lensSelectedMm", "lensInputSelectedMm", "lensDraftSelectedMm", "selectedLens", "lensMm"], { positiveOnly: true });
    if (lens) parts.push(formatMillimeters(lens.value));

    if (area && area.faceRecognitionMaxDistanceFt) parts.push("face max " + area.faceRecognitionMaxDistanceFt + " ft");
    if (area && area.licensePlateMaxDistanceFt) parts.push("plate max " + area.licensePlateMaxDistanceFt + " ft");
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
        { label: "Face Recognition", url: "/tools/physical-security/face-recognition-range/", statusKeys: ["faceRecognitionStatus", "faceStatus", "overallStatus"], detailKeys: ["faceRecognitionSummary", "faceSummary", "faceRecognitionMaxDistanceFt", "distanceToTargetPlaneFt"] }
      ];
    }

    if (group === "plate") {
      return [
        { label: "License Plate", url: "/tools/physical-security/license-plate-range/", statusKeys: ["licensePlateStatus", "plateStatus", "overallStatus"], detailKeys: ["licensePlateSummary", "plateSummary", "licensePlateMaxDistanceFt", "distanceToTargetPlaneFt"] }
      ];
    }

    return [
      { label: "Scene Illumination", url: "/tools/physical-security/scene-illumination/", statusKeys: ["sceneIlluminationStatus", "illuminationStatus", "lightingStatus"], detailKeys: ["sceneIlluminationSummary", "sceneIlluminationDetail", "lightingSummary", "lightingInterpretation", "lightingGuidance", "estimatedLumensRequired", "targetIlluminationFc", "lightingClass"] },
      { label: "Mounting Height", url: "/tools/physical-security/mounting-height/", statusKeys: ["mountingHeightStatus", "heightStatus"], detailKeys: ["mountingHeightSummary", "mountingHeightFt"] },
      { label: "Field of View", url: "/tools/physical-security/field-of-view/", statusKeys: ["fieldOfViewStatus", "fovStatus"], detailKeys: ["fieldOfViewSummary", "fovSummary", "assumedHfovDeg"] },
      { label: "Camera Coverage Area", url: "/tools/physical-security/camera-coverage-area/", statusKeys: ["cameraCoverageAreaStatus", "coverageStatus"], detailKeys: ["cameraCoverageAreaSummary", "coverageSummary", "distanceToTargetPlaneFt", "protectedLengthFt"] },
      { label: "Camera Spacing", url: "/tools/physical-security/camera-spacing/", statusKeys: ["cameraSpacingStatus", "spacingStatus"], detailKeys: ["cameraCount", "targetCameraCount", "plannedCameraCount", "lensCameraCount", "spacingCameraCount", "coverageCount", "spacingFt", "actualSpacingFt", "cameraSpacingSummary", "spacingSummary", "cameraSpacingDetail"] },
      { label: "Blind Spot Check", url: "/tools/physical-security/blind-spot-check/", statusKeys: ["blindSpotStatus", "blindSpotCheckStatus"], detailKeys: ["blindSpotSummary", "blindSpotCheckSummary"] },
      { label: "Pixel Density", url: "/tools/physical-security/pixel-density/", statusKeys: ["pixelDensityStatus", "densityStatus"], detailKeys: ["pixelDensitySummary", "densitySummary", "pixelDensityPpf"] },
      { label: "Lens Selection", url: "/tools/physical-security/lens-selection/", statusKeys: ["lensSelectionStatus", "lensStatus"], detailKeys: ["selectedLensMm", "adjustedFocalMm", "lensSelectedMm", "lensInputSelectedMm", "lensDraftSelectedMm", "selectedLens", "lensMm", "lensClass", "lensSelectionClass", "lensSelectionSummary", "lensSummary"] }
    ];
  }




  /* physical-security-report-summary-024-report-carryover-values
     Report area/zone detail uses the same positive-value preference as the live Summary rollup. */
  function reportCarryNumericValue(value) {
    const text = String(value ?? "").replace(/[^0-9.-]/g, "").trim();
    if (!text) return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }

  function reportCarryIsPositive(value) {
    const number = reportCarryNumericValue(value);
    return Number.isFinite(number) && number > 0;
  }

  function reportCarryValueByKeys(source, keys, options = {}) {
    const area = source && typeof source === "object" ? source : {};
    const positiveOnly = !!options.positiveOnly;

    for (const key of keys || []) {
      const value = area[key];
      if (value === undefined || value === null) continue;

      const text = String(value).trim();
      if (!text && value !== 0 && value !== false) continue;
      if (positiveOnly && !reportCarryIsPositive(value)) continue;

      return { key, value };
    }

    return null;
  }

  function reportAreaToolDetailCandidate(source, definition) {
    const area = source && typeof source === "object" ? source : {};
    const label = String(definition && definition.label ? definition.label : "").toLowerCase();
    const keys = Array.isArray(definition.detailKeys) ? definition.detailKeys : [];

    if (label.includes("camera spacing")) {
      const positiveCamera = reportCarryValueByKeys(area, ["cameraCount", "targetCameraCount", "plannedCameraCount", "lensCameraCount", "spacingCameraCount", "coverageCount"], { positiveOnly: true });
      if (positiveCamera) return positiveCamera;

      const positiveSpacing = reportCarryValueByKeys(area, ["spacingFt", "actualSpacingFt"], { positiveOnly: true });
      if (positiveSpacing) return positiveSpacing;

      const summary = reportCarryValueByKeys(area, ["cameraSpacingSummary", "spacingSummary", "cameraSpacingDetail"]);
      if (summary) return summary;

      return reportCarryValueByKeys(area, ["cameraCount", "targetCameraCount", "plannedCameraCount", "lensCameraCount", "spacingCameraCount"]);
    }

    if (label.includes("lens selection")) {
      const positiveLens = reportCarryValueByKeys(area, ["selectedLensMm", "adjustedFocalMm", "lensSelectedMm", "lensInputSelectedMm", "lensDraftSelectedMm", "selectedLens", "lensMm"], { positiveOnly: true });
      if (positiveLens) return positiveLens;

      const lensClass = reportCarryValueByKeys(area, ["lensClass", "lensSelectionClass"]);
      if (lensClass) return lensClass;

      const summary = reportCarryValueByKeys(area, ["lensSelectionSummary", "lensSummary"]);
      if (summary) return summary;

      return reportCarryValueByKeys(area, ["selectedLensMm", "adjustedFocalMm", "lensInputSelectedMm", "lensDraftSelectedMm", "selectedLens"]);
    }

    for (const key of keys) {
      const value = area[key];
      if (value === 0 || value === false || (value != null && String(value).trim() !== "")) {
        return { key, value };
      }
    }

    return null;
  }


  function areaToolDetail(area, definition, status) {
    const source = area && typeof area === "object" ? area : {};
    const candidate = reportAreaToolDetailCandidate(source, definition);

    if (candidate) {
      return formatAreaToolDetailValue(definition, candidate.key, candidate.value);
    }

    if (statusIsGenerated(status)) {
      return generatedAreaDetailFallback(definition, status);
    }

    return "No area-specific result saved for this step yet.";
  }

  function cleanDetailValue(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function formatFeet(value) {
    const text = cleanDetailValue(value);
    if (!text) return text;
    return /\b(ft|feet)\b/i.test(text) ? text : text + " ft";
  }

  function formatDegrees(value) {
    const text = cleanDetailValue(value);
    if (!text) return text;
    return /(°|\bdeg\b|\bdegree)/i.test(text) ? text : text + "°";
  }

  function formatMillimeters(value) {
    const text = cleanDetailValue(value);
    if (!text) return text;
    return /(\bmm\b|\blens\b)/i.test(text) ? text : text + " mm lens";
  }

  function formatPpf(value) {
    const text = cleanDetailValue(value);
    if (!text) return text;
    return /\b(ppf|pixels? per foot)\b/i.test(text) ? text : text + " PPF";
  }

  function formatCameraCount(value) {
    const text = cleanDetailValue(value);
    const count = Number(text);
    if (Number.isFinite(count)) return text + " camera" + (count === 1 ? "" : "s");
    return text;
  }


  function formatLumensValue(value) {
    const text = cleanDetailValue(value);
    if (!text) return text;
    if (/\b(lm|lumen|lumens)\b/i.test(text)) return text;

    const numeric = Number(String(text).replace(/,/g, ""));
    if (Number.isFinite(numeric)) {
      return Math.round(numeric).toLocaleString() + " lumens";
    }

    return text + " lumens";
  }

  function formatFootcandles(value) {
    const text = cleanDetailValue(value);
    if (!text) return text;
    return /\b(fc|footcandle|footcandles)\b/i.test(text) ? text : text + " fc";
  }

  function generatedAreaDetailFallback(definition, status) {
    const label = String(definition && definition.label ? definition.label : "Tool").trim();
    const statusText = statusLabel(normalizeStatus(status));

    return label + " status is saved as " + statusText + ", but no detailed metric was stored for this area yet. Recalculate this tool to refresh the area-specific report detail.";
  }

  function formatAreaToolDetailValue(definition, key, value) {
    const text = cleanDetailValue(value);
    const normalizedKey = String(key || "").toLowerCase();
    const label = String(definition && definition.label ? definition.label : "Tool detail").trim();

    if (!text) return "No area-specific result saved for this step yet.";

    if (/summary|reason|note|description|interpretation/i.test(normalizedKey)) {
      return text;
    }

    if (normalizedKey === "assumedhfovdeg") {
      return "Horizontal field of view (HFOV): " + formatDegrees(text);
    }

    if (normalizedKey === "selectedlensmm" || normalizedKey === "adjustedfocalmm" || normalizedKey === "lensselectedmm" || normalizedKey === "lensinputselectedmm" || normalizedKey === "lensdraftselectedmm" || normalizedKey === "selectedlens" || normalizedKey === "lensmm") {
      const numeric = Number(String(text).replace(/[^0-9.]/g, ""));
      const prefix = normalizedKey === "lensinputselectedmm" || normalizedKey === "lensdraftselectedmm" ? "Selected lens input: " : "Selected lens: ";
      const suffix = Number.isFinite(numeric) && numeric <= 0 ? " (invalid / not selected)" : "";
      return prefix + formatMillimeters(text) + suffix;
    }

    if (normalizedKey === "lensclass" || normalizedKey === "lensselectionclass") {
      return "Lens class: " + text;
    }

    if (normalizedKey === "pixeldensityppf") {
      return "Pixel density: " + formatPpf(text);
    }

    if (normalizedKey === "mountingheightft") {
      return "Mounting height: " + formatFeet(text);
    }

    if (normalizedKey === "distancetotargetplaneft") {
      return "Distance to target plane: " + formatFeet(text);
    }

    if (normalizedKey === "targetilluminationfc") {
      return "Target illumination: " + formatFootcandles(text);
    }

    if (normalizedKey === "estimatedlumensrequired") {
      return "Estimated required light: " + formatLumensValue(text);
    }

    if (normalizedKey === "sceneareasqft") {
      return "Lighting area: " + text + " sq ft";
    }

    if (normalizedKey === "effectivelightingfactor") {
      return "Effective planning factor: " + text;
    }

    if (normalizedKey === "lightingclass") {
      return "Lighting class: " + text;
    }

    if (normalizedKey === "protectedlengthft") {
      return "Protected span / scene width: " + formatFeet(text);
    }

    if (normalizedKey === "spacingft" || normalizedKey === "actualspacingft") {
      return "Camera spacing: " + formatFeet(text);
    }

    if (normalizedKey === "cameracount" || normalizedKey === "lenscameracount" || normalizedKey === "spacingcameracount" || normalizedKey === "targetcameracount" || normalizedKey === "plannedcameracount" || normalizedKey === "coveragecount") {
      const prefix = normalizedKey === "targetcameracount" || normalizedKey === "plannedcameracount" ? "Planned camera count: " : "Camera count: ";
      return prefix + formatCameraCount(text);
    }

    if (normalizedKey === "facerecognitionmaxdistanceft") {
      return "Face recognition max distance: " + formatFeet(text);
    }

    if (normalizedKey === "licenseplatemaxdistanceft") {
      return "License plate max distance: " + formatFeet(text);
    }

    if (/ft$|feet$/.test(normalizedKey)) {
      return label + ": " + formatFeet(text);
    }

    if (/deg$|degree/.test(normalizedKey)) {
      return label + ": " + formatDegrees(text);
    }

    if (/mm$/.test(normalizedKey)) {
      return label + ": " + formatMillimeters(text);
    }

    if (/ppf$/.test(normalizedKey)) {
      return label + ": " + formatPpf(text);
    }

    return label + ": " + text;
  }



  function areaToolRows(area) {
    const group = routeGroup(area);
    return areaToolDefinitions(group).map((definition) => {
      const statusValue = firstAreaValue(area, definition.statusKeys || []);
      const hasStatus = statusValue || statusValue === 0 || statusValue === false;
      const status = normalizeStatus(hasStatus ? statusValue : "pending");

      return {
        label: definition.label,
        url: definition.url || "",
        status,
        detail: areaToolDetail(area, definition, status)
      };
    });
  }


  function statusIsGenerated(status) {
    const normalized = normalizeStatus(status);
    return normalized === "healthy" || normalized === "watch" || normalized === "risk";
  }

  function areaGroups() {
    const ledger = readAreaLedger();
    const areas = Array.isArray(ledger.areas) ? ledger.areas : [];

    return [
      ["core", areas.filter((area) => routeGroup(area) === "core")],
      ["face", areas.filter((area) => routeGroup(area) === "face")],
      ["plate", areas.filter((area) => routeGroup(area) === "plate")]
    ];
  }

  function buildScopedReportRows() {
    const rows = [];

    areaGroups().forEach(([group, groupAreas]) => {
      groupAreas.forEach((area, index) => {
        const scope = scopeTitle(area, group, index);

        areaToolRows(area).forEach((row) => {
          const status = normalizeStatus(row.status);

          rows.push({
            scope,
            group,
            area,
            tool: row.label,
            toolUrl: row.url || "",
            areaId: area && area.id ? String(area.id) : "",
            status,
            detail: row.detail || "No area-specific result saved for this step yet.",
            generated: statusIsGenerated(status)
          });
        });
      });
    });

    return rows;
  }


  function renderScopedToolLink(row) {
    const label = row && row.tool ? String(row.tool) : "Physical Security Tool";
    const href = row && row.toolUrl ? String(row.toolUrl) : "";
    const areaId = row && row.areaId ? String(row.areaId) : "";

    if (!href || !areaId) return escapeHtml(label);

    return '<a class="physical-security-scoped-tool-link" href="' + escapeHtml(href) + '" data-sl-physical-security-scoped-tool-link="true" data-area-id="' + escapeHtml(areaId) + '" data-tool-url="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a>';
  }

  function setActiveAreaFromScopedToolLink(areaId) {
    const id = String(areaId || "").trim();
    if (!id) return false;

    const api = getAreaStateApi();
    if (api && typeof api.setActiveArea === "function") {
      try {
        api.setActiveArea(id);
        return true;
      } catch {}
    }

    const ledger = readAreaLedger();
    if (!ledger || !Array.isArray(ledger.areas) || !ledger.areas.some((area) => area && area.id === id)) return false;

    ledger.activeAreaId = id;
    if (api && typeof api.writeLedger === "function") {
      try {
        api.writeLedger(ledger);
        return true;
      } catch {}
    }

    return false;
  }

  function bindScopedToolLinks() {
    if (document.documentElement.dataset.physicalSecurityScopedToolLinksBound === "true") return;
    document.documentElement.dataset.physicalSecurityScopedToolLinksBound = "true";

    document.addEventListener("click", function (event) {
      const link = event.target && event.target.closest ? event.target.closest("[data-sl-physical-security-scoped-tool-link]") : null;
      if (!link) return;

      const areaId = link.getAttribute("data-area-id") || "";
      const href = link.getAttribute("data-tool-url") || link.getAttribute("href") || "";

      setActiveAreaFromScopedToolLink(areaId);

      if (href && href !== "#") {
        event.preventDefault();
        window.location.href = href;
      }
    }, true);
  }

  function buildScopedReportCounts() {
    const rows = buildScopedReportRows();
    if (!rows.length) return null;

    const counts = {
      tracked: rows.length,
      generated: 0,
      healthy: 0,
      watch: 0,
      risk: 0,
      pending: 0
    };

    rows.forEach((row) => {
      const status = normalizeStatus(row.status);

      if (status === "risk") {
        counts.risk += 1;
        counts.generated += 1;
        return;
      }

      if (status === "watch") {
        counts.watch += 1;
        counts.generated += 1;
        return;
      }

      if (status === "healthy") {
        counts.healthy += 1;
        counts.generated += 1;
        return;
      }

      counts.pending += 1;
    });

    if (counts.risk) counts.status = "risk";
    else if (counts.watch) counts.status = "watch";
    else if (counts.pending) counts.status = "pending";
    else if (counts.healthy) counts.status = "healthy";
    else counts.status = "pending";

    return counts;
  }


  function renderAreaZoneToolTable(area, scopeLabel) {
    const rows = areaToolRows(area);
    const scopeText = String(scopeLabel || "Selected area / zone").trim();
    const heading = '<p class="physical-security-area-zone-tool-heading"><strong>Tool / Area Step Results - ' + escapeHtml(scopeText) + '</strong></p>';

    const body = rows.map((row) => {
      return '<tr><td>' + escapeHtml(row.label) + '</td><td>' + renderReportStatusText(row.status) + '</td><td>' + escapeHtml(row.detail) + '</td></tr>';
    }).join("");

    return heading + '<table class="summary-table physical-security-area-zone-tool-table" data-sl-physical-security-area-zone-tool-table="true" data-sl-area-zone-scope="' + escapeHtml(scopeText) + '"><thead><tr><th>Tool / Area Step</th><th>Status</th><th>Area / Zone Detail</th></tr></thead><tbody>' + body + '</tbody></table>';
  }


  function renderAreaZoneGroup(title, areas, group) {
    if (!areas.length) return '<h3>' + escapeHtml(title) + '</h3><p class="physical-security-area-zone-empty">No ' + escapeHtml(title.toLowerCase()) + ' recorded yet.</p>';

    const cards = areas.map((area, index) => {
      const status = scopeStatus(area);
      const titleText = scopeTitle(area, group, index);

      return '<div class="physical-security-area-zone-card" data-sl-physical-security-area-zone-card="true"><h4>' + escapeHtml(titleText) + '</h4><p class="physical-security-area-zone-meta">' + escapeHtml(routeLabel(group) + ' | ' + areaDetail(area)) + '</p><p>' + renderReportStatusText(status) + '</p>' + renderAreaZoneToolTable(area, titleText) + '</div>';
    }).join("");

    return '<h3>' + escapeHtml(title) + '</h3>' + cards;
  }

  function renderAreaZoneSectionsHtml() {
    const ledger = readAreaLedger();
    const areas = Array.isArray(ledger.areas) ? ledger.areas : [];
    if (!areas.length) return "";

    const core = areas.filter((area) => routeGroup(area) === "core");
    const face = areas.filter((area) => routeGroup(area) === "face");
    const plate = areas.filter((area) => routeGroup(area) === "plate");

    return '<div class="physical-security-area-zone-report" data-sl-physical-security-area-zone-report="true"><h3>Area / Zone Report Sections</h3>' +
      renderAreaZoneGroup("Core Coverage Areas", core, "core") +
      '<h3>Optional Specialty Zones</h3>' +
      renderAreaZoneGroup("Face Recognition Zones", face, "face") +
      renderAreaZoneGroup("License Plate Zones", plate, "plate") +
      '</div>';
  }




  /* physical-security-summary-action-next-steps-021
     Watch/Risk rows now describe the next user action.
     Raw saved engineering values stay in the Area / Zone Detail tables. */
  function scopedToolKey(row) {
    const text = String(row && row.tool ? row.tool : "").toLowerCase();

    if (text.includes("scene illumination")) return "scene";
    if (text.includes("field of view")) return "fov";
    if (text.includes("lens selection")) return "lens";
    if (text.includes("mounting height")) return "mounting";
    if (text.includes("camera coverage")) return "coverage";
    if (text.includes("camera spacing")) return "spacing";
    if (text.includes("blind spot")) return "blind";
    if (text.includes("pixel density")) return "pixel";
    if (text.includes("face recognition")) return "face";
    if (text.includes("license plate")) return "plate";

    return "generic";
  }


  function scopedActionValue(row, keys) {
    const area = row && row.area ? row.area : {};
    const toolKey = scopedToolKey(row);
    const list = Array.isArray(keys) ? keys : [];

    if (toolKey === "lens" && list.some((key) => /lens|selected/i.test(String(key)))) {
      const positiveLens = reportCarryValueByKeys(area, ["selectedLensMm", "adjustedFocalMm", "lensSelectedMm", "lensInputSelectedMm", "lensDraftSelectedMm", "selectedLens", "lensMm"], { positiveOnly: true });
      if (positiveLens) return positiveLens.value;

      const lensClass = reportCarryValueByKeys(area, ["lensClass", "lensSelectionClass"]);
      if (lensClass) return lensClass.value;

      const summary = reportCarryValueByKeys(area, ["lensSelectionSummary", "lensSummary"]);
      if (summary) return summary.value;
    }

    if (toolKey === "spacing" && list.some((key) => /camera|count|cameras/i.test(String(key)))) {
      const positiveCamera = reportCarryValueByKeys(area, ["cameraCount", "targetCameraCount", "plannedCameraCount", "lensCameraCount", "spacingCameraCount", "coverageCount"], { positiveOnly: true });
      if (positiveCamera) return positiveCamera.value;
    }

    return firstAreaValue(area, list);
  }

  function hasScopedValue(value) {
    return value === 0 || value === false || (value != null && String(value).trim() !== "");
  }

  function actionFact(label, value, formatter) {
    if (!hasScopedValue(value)) return "";
    const formatted = typeof formatter === "function" ? formatter(value) : cleanDetailValue(value);
    if (!formatted) return "";
    return label + " " + formatted;
  }

  function joinActionFacts(parts) {
    const clean = (parts || []).filter(Boolean);
    return clean.length ? " Current values: " + clean.join(", ") + "." : "";
  }

  function scopedRequiredAction(row) {
    const scope = row && row.scope ? row.scope : "this area";
    const key = scopedToolKey(row);
    const status = normalizeStatus(row && row.status);

    if (key === "scene") {
      return (status === "risk" ? "Improve" : "Validate") + " lighting for " + scope + " before finalizing the report.";
    }

    if (key === "fov") {
      return "Correct Field of View for " + scope + " before finalizing the report.";
    }

    if (key === "lens") {
      return "Select or correct the lens choice for " + scope + " before finalizing the report.";
    }

    if (key === "mounting") {
      return "Validate mounting height for " + scope + " before finalizing the report.";
    }

    if (key === "coverage") {
      return "Validate camera coverage geometry for " + scope + " before finalizing the report.";
    }

    if (key === "spacing") {
      return "Correct camera count or spacing for " + scope + " before finalizing the report.";
    }

    if (key === "blind") {
      return "Resolve blind spot coverage for " + scope + " before finalizing the report.";
    }

    if (key === "pixel") {
      return "Correct pixel density for " + scope + " before finalizing the report.";
    }

    if (key === "face") {
      return "Validate face recognition range for " + scope + " before finalizing the report.";
    }

    if (key === "plate") {
      return "Validate license plate capture range for " + scope + " before finalizing the report.";
    }

    return "Review " + (row && row.tool ? row.tool : "this tool") + " for " + scope + " before finalizing the report.";
  }

  function scopedActionNextStep(row) {
    const key = scopedToolKey(row);
    const status = normalizeStatus(row && row.status);

    if (key === "scene") {
      const target = scopedActionValue(row, ["targetIlluminationFc", "targetFc", "fc"]);
      const lumens = scopedActionValue(row, ["estimatedLumensRequired", "requiredLumens", "lumens"]);
      const area = scopedActionValue(row, ["sceneAreaSqFt", "lightingAreaSqFt", "areaSqFt", "area"]);
      const factor = scopedActionValue(row, ["effectiveLightingFactor", "effectiveFactor"]);
      const lightingClass = scopedActionValue(row, ["lightingClass"]);

      const action = status === "risk"
        ? "Increase or redesign lighting before finalizing this area."
        : "Validate that the lighting plan can support the camera design before finalizing this area.";

      return action + joinActionFacts([
        actionFact("target", target, formatFootcandles),
        actionFact("estimated light", lumens, formatLumensValue),
        actionFact("area", area, (value) => cleanDetailValue(value) + " sq ft"),
        actionFact("planning factor", factor),
        actionFact("lighting class", lightingClass)
      ]);
    }

    if (key === "fov") {
      const hfov = scopedActionValue(row, ["assumedHfovDeg", "horizontalFieldOfViewDeg", "hfovDeg"]);
      return "Narrow the field of view, select a better-matched lens, or split the area so coverage stays usable before finalizing." +
        joinActionFacts([actionFact("HFOV", hfov, formatDegrees)]);
    }

    if (key === "lens") {
      const lens = scopedActionValue(row, ["selectedLensMm", "lensMm", "selectedLens"]);
      const numericLens = Number(String(lens).replace(/[^0-9.]/g, ""));

      if (hasScopedValue(lens) && Number.isFinite(numericLens) && numericLens <= 0) {
        return "Select a valid lens before finalizing this area; the saved lens value is incomplete or invalid." +
          joinActionFacts([actionFact("saved lens", lens, formatMillimeters)]);
      }

      return "Confirm the selected lens supports the required field of view and target distance before finalizing." +
        joinActionFacts([actionFact("selected lens", lens, formatMillimeters)]);
    }

    if (key === "mounting") {
      const height = scopedActionValue(row, ["mountingHeightFt", "heightFt"]);
      return "Confirm the mounting height supports the desired viewing angle, serviceability, and tamper resistance before finalizing." +
        joinActionFacts([actionFact("mounting height", height, formatFeet)]);
    }

    if (key === "coverage") {
      const distance = scopedActionValue(row, ["distanceToTargetPlaneFt", "targetDistanceFt"]);
      const span = scopedActionValue(row, ["protectedLengthFt", "protectedSpanFt"]);
      return "Adjust distance, span, or coverage reserve so the camera footprint matches the protected area before finalizing." +
        joinActionFacts([
          actionFact("distance", distance, formatFeet),
          actionFact("span", span, formatFeet)
        ]);
    }

    if (key === "spacing") {
      const count = scopedActionValue(row, ["cameraCount", "cameras"]);
      const spacing = scopedActionValue(row, ["spacingFt", "actualSpacingFt"]);
      return "Correct camera count, spacing, or overlap so the area is covered without gaps or excessive overlap before finalizing." +
        joinActionFacts([
          actionFact("camera count", count, formatCameraCount),
          actionFact("spacing", spacing, formatFeet)
        ]);
    }

    if (key === "blind") {
      return "Resolve remaining blind spot exposure or document why the uncovered area is acceptable before finalizing this scope.";
    }

    if (key === "pixel") {
      const ppf = scopedActionValue(row, ["pixelDensityPpf", "densityPpf", "ppf"]);
      return "Increase pixel density by reducing distance, narrowing the view, raising resolution, or lowering the target requirement before finalizing." +
        joinActionFacts([actionFact("pixel density", ppf, formatPpf)]);
    }

    if (key === "face") {
      const distance = scopedActionValue(row, ["faceRecognitionMaxDistanceFt", "faceMaxDistanceFt", "distanceToTargetPlaneFt"]);
      return "Confirm the face recognition zone is within reliable capture distance, or move the camera closer / narrow the view before finalizing." +
        joinActionFacts([actionFact("max distance", distance, formatFeet)]);
    }

    if (key === "plate") {
      const distance = scopedActionValue(row, ["licensePlateMaxDistanceFt", "plateMaxDistanceFt", "distanceToTargetPlaneFt"]);
      return "Confirm the plate capture zone is within reliable capture distance, or move the camera closer / narrow the view before finalizing." +
        joinActionFacts([actionFact("max distance", distance, formatFeet)]);
    }

    return "Correct or validate this scoped Watch/Risk result before finalizing. The saved engineering values are listed in the Area / Zone Detail section below.";
  }


  function buildScopedActionRows() {
    return buildScopedReportRows()
      .filter((row) => normalizeStatus(row.status) === "risk" || normalizeStatus(row.status) === "watch")
      .map((row) => {
        return [
          row.scope,
          renderScopedToolLink(row),
          renderReportStatusText(row.status),
          scopedRequiredAction(row),
          scopedActionNextStep(row)
        ];
      });
  }

  function buildGlobalActionRows(summary) {
    return (summary.tools || [])
      .filter((tool) => normalizeStatus(tool.status) === "risk" || normalizeStatus(tool.status) === "watch")
      .slice(0, 8)
      .map((tool) => {
        const status = renderReportStatusText(tool.status);
        const action = tool.action || "Review this tool result before finalizing the category.";
        const detail = tool.reason || tool.reportSummary || tool.nextStep || tool.expectedResult || "Confirm this condition before carrying the design forward.";
        const nextStep = tool.nextStep && tool.nextStep !== detail ? " Next step: " + tool.nextStep : "";

        return [
          "Category-wide",
          tool.label || tool.slug || "Physical Security Tool",
          status,
          action,
          detail + nextStep
        ];
      });
  }



  function scopedPriority(detailRows) {
    if (!Array.isArray(detailRows) || !detailRows.length) return null;

    const firstRisk = detailRows.find((row) => String(row[2] || "").toLowerCase().includes("risk"));
    const row = firstRisk || detailRows[0];

    if (!row) return null;

    return {
      scope: plainReportText(row[0] || "Area / Zone"),
      tool: plainReportText(row[1] || "Physical Security Tool"),
      action: plainReportText(row[3] || "Review this area or zone result before finalizing the report."),
      detail: plainReportText(row[4] || "")
    };
  }


  function renderExportTableHtml(summary) {
    if (!summary || !summary.counts || !summary.counts.generated) return "";

    const counts = summary.counts;
    const priority = summary.priorityTool || null;

    const scopedCounts = buildScopedReportCounts();
    const scopedDetailRows = buildScopedActionRows();
    const detailRows = (scopedDetailRows.length ? scopedDetailRows : buildGlobalActionRows(summary)).slice(0, 14);
    const scopedPriorityItem = scopedPriority(detailRows);

    const summaryStatus = scopedCounts ? scopedCounts.status : summary.status;
    const generatedText = scopedCounts
      ? String(scopedCounts.generated || 0) + " of " + String(scopedCounts.tracked || 0)
      : String(counts.generated || 0) + " of " + String(counts.tracked || 0);

    const countText = scopedCounts
      ? String(scopedCounts.healthy || 0) + " / " + String(scopedCounts.watch || 0) + " / " + String(scopedCounts.risk || 0) + " / " + String(scopedCounts.pending || 0)
      : String(counts.healthy || 0) + " / " + String(counts.watch || 0) + " / " + String(counts.risk || 0) + " / 0";

    const summaryRows = [
      ["Status", renderReportStatusText(summaryStatus), true],
      ["Generated", generatedText],
      ["Healthy / Watch / Risk / Pending", countText],
      scopedPriorityItem ? ["Top priority scope", scopedPriorityItem.scope] : null,
      scopedPriorityItem ? ["Top priority item", scopedPriorityItem.tool] : priority ? ["Top priority item", priority.label || priority.slug || "Physical Security Tool"] : null,
      scopedPriorityItem ? ["Top priority action", scopedPriorityItem.action] : priority ? ["Top priority action", priority.action || priority.reason || "Review before finalizing the design."] : null,
      scopedPriorityItem ? ["Top priority interpretation", scopedPriorityItem.tool + " for " + scopedPriorityItem.scope + ": " + (scopedPriorityItem.detail || "Review this scoped Watch/Risk item before finalizing the report.")] : summary.reason ? ["Category master note", summary.reason] : null,
      scopedPriorityItem ? ["Priority note", "Top priority is the first/highest scoped Watch/Risk issue. See the Watch/Risk detail table for all scoped issues."] : null,
      scopedPriorityItem ? ["Report next step", "Review the Watch/Risk detail table and correct scoped issues before finalizing the report."] : summary.nextStep ? ["Recommended next step", summary.nextStep] : null
    ].filter(Boolean);

    const summaryTable = [
      '<table class="summary-table physical-security-category-summary-table" data-sl-physical-security-report-summary-table="true">',
      '<thead><tr><th>Summary Item</th><th>Detail</th></tr></thead>',
      '<tbody>',
      summaryRows.map((row) => {
        return '<tr><td>' + escapeHtml(row[0]) + '</td><td>' + (row[2] ? row[1] : escapeHtml(row[1])) + '</td></tr>';
      }).join(""),
      '</tbody>',
      '</table>'
    ].join("");

    const detailIntro = detailRows.length
      ? '<p class="physical-security-watch-risk-note"><strong>Watch/Risk detail only:</strong> The table below lists items that need review or correction by area/zone when scope data is available. Healthy and pending tools stay in the area/zone report sections below.</p>'
      : "";

    const detailTable = detailRows.length
      ? [
          '<div style="margin-top:12px;"></div>',
          '<table class="summary-table physical-security-watch-risk-table" data-sl-physical-security-report-summary-detail-table="true">',
          '<thead><tr><th>Scope / Area</th><th>Tool</th><th>Status</th><th>Required Action</th><th>Detail / Next Step</th></tr></thead>',
          '<tbody>',
          detailRows.map((row) => {
            return '<tr>' + row.map((cell, index) => '<td>' + ((index === 1 && String(cell).includes('data-sl-physical-security-scoped-tool-link')) || index === 2 ? cell : escapeHtml(cell)) + '</td>').join("") + '</tr>';
          }).join(""),
          '</tbody>',
          '</table>'
        ].join("")
      : "";

    const areaZoneSections = renderAreaZoneSectionsHtml();

    return summaryTable + detailIntro + detailTable + areaZoneSections;
  }


  function renderExportHtml(summary) {
    const resolvedSummary = summary || buildFromScopedReport();
    if (!resolvedSummary || !resolvedSummary.counts || !resolvedSummary.counts.generated) return "";

    return [
      '<section class="export-extra-section physical-security-report-summary" data-sl-report-summary-version="' + escapeHtml(VERSION) + '">',
      renderExportTableHtml(resolvedSummary),
      "<p><small>This category summary is generated from the current Physical Security guidance memory stack and/or area-zone planning ledger, and is intended as a planning aid. Verify final designs against site conditions, manufacturer data, and project requirements.</small></p>",
      "</section>"
    ].join("");
  }

  function renderReportText(summary) {
    if (!summary || !summary.counts || !summary.counts.generated) {
      return "No Physical Security category guidance summary is available yet.";
    }

    const counts = summary.counts;
    const priority = summary.priorityTool;

    return [
      "Physical Security Category Summary",
      "Status: " + statusLabel(summary.status),
      "Generated: " + counts.generated + " of " + counts.tracked,
      "Healthy: " + counts.healthy + ", Watch: " + counts.watch + ", Risk: " + counts.risk,
      priority ? "Top priority item: " + priority.label + " - " + (priority.action || priority.reason || "Review before finalizing the design.") : "",
      summary.reason ? "Category interpretation: " + summary.reason : "",
      summary.nextStep ? "Recommended next step: " + summary.nextStep : ""
    ].filter(Boolean).join("\n");
  }

  function findOrCreateExportSlot(mount) {
    let slot = document.getElementById(EXPORT_SLOT_ID);

    if (slot && slot.parentElement !== mount) {
      slot.remove();
      slot = null;
    }

    if (!slot) {
      slot = document.createElement("div");
      slot.id = EXPORT_SLOT_ID;
      slot.setAttribute("data-sl-physical-security-report-summary-slot", "true");
      mount.insertBefore(slot, mount.firstChild);
    }

    return slot;
  }



  function refreshExportSection() {
    const mount = document.getElementById(EXPORT_MOUNT_ID);
    if (!mount) return false;

    const summary = buildSummary();
    const html = renderExportHtml(summary);

    mount.hidden = false;
    mount.removeAttribute("aria-hidden");

    if (!html) {
      mount.innerHTML = "";
      return false;
    }

    // Single-render rule:
    // Summary script and this report helper both target the same mount.
    // Replace the mount contents instead of inserting a nested report slot,
    // otherwise export capture reads the Physical Security report body twice.
    mount.innerHTML = html;

    return true;
  }

  function attachExportRefresh() {
    document.addEventListener("click", function (event) {
      const target = event.target && event.target.closest ? event.target.closest("#exportReport") : null;
      if (target) refreshExportSection();
    }, true);

    window.addEventListener("scopedlabs:physical-security-guidance-updated", refreshExportSection);
    window.addEventListener("scopedlabs:physical-security-guidance-cleared", refreshExportSection);
  }

  function init() {
    bindScopedToolLinks();
    refreshExportSection();
    attachExportRefresh();
  }

  window.ScopedLabsPhysicalSecurityReportSummary = Object.freeze({
    version: VERSION,
    category: CATEGORY,
    buildSummary,
    renderExportHtml,
    renderReportText,
    refreshExportSection,
    init
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
