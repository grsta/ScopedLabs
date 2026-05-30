(function () {
  "use strict";

  const VERSION = "physical-security-report-summary-010-watch-risk-note";
  const CATEGORY = "physical-security";
  const EXPORT_MOUNT_ID = "spacingExportSection";
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

  function normalizeStatus(value) {
    const text = String(value || "").toLowerCase();
    if (text.includes("risk") || text.includes("fail") || text.includes("critical")) return "risk";
    if (text.includes("watch") || text.includes("warn") || text.includes("review")) return "watch";
    if (text.includes("healthy") || text.includes("safe") || text.includes("pass") || text.includes("ok")) return "healthy";
    return "unknown";
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

  function buildSummary() {
    return buildFromCategoryExplanation(getCategoryExplanation()) || buildFromMemory();
  }

  function statusLabel(status) {
    if (status === "risk") return "Risk";
    if (status === "watch") return "Watch";
    if (status === "healthy") return "Healthy";
    return "Unknown";
  }

  function reportStatusClass(status) {
    const normalized = normalizeStatus(status);
    if (normalized === "risk") return "risk";
    if (normalized === "watch") return "watch";
    if (normalized === "healthy") return "healthy";
    return "unknown";
  }

  function renderReportStatusText(status) {
    const className = reportStatusClass(status);
    return '<span class="physical-security-report-status ' + className + '">' + escapeHtml(statusLabel(className)) + '</span>';
  }

  function renderExportTableHtml(summary) {
    if (!summary || !summary.counts || !summary.counts.generated) return "";

    const counts = summary.counts;
    const priority = summary.priorityTool || null;

    const summaryRows = [
      ["Status", renderReportStatusText(summary.status), true],
      ["Generated", String(counts.generated || 0) + " of " + String(counts.tracked || 0)],
      ["Healthy / Watch / Risk", String(counts.healthy || 0) + " / " + String(counts.watch || 0) + " / " + String(counts.risk || 0)],
      priority ? ["Priority item", priority.label || priority.slug || "Physical Security Tool"] : null,
      priority ? ["Priority action", priority.action || priority.reason || "Review before finalizing the design."] : null,
      summary.reason ? ["Category interpretation", summary.reason] : null,
      summary.nextStep ? ["Recommended next step", summary.nextStep] : null
    ].filter(Boolean);

    const detailRows = (summary.tools || [])
      .filter((tool) => normalizeStatus(tool.status) === "risk" || normalizeStatus(tool.status) === "watch")
      .slice(0, 6)
      .map((tool) => {
        const status = renderReportStatusText(tool.status);
        const action = tool.action || "Review this tool result before finalizing the category.";
        const detail = tool.reason || tool.reportSummary || tool.nextStep || tool.expectedResult || "Confirm this condition before carrying the design forward.";
        const nextStep = tool.nextStep && tool.nextStep !== detail ? " Next step: " + tool.nextStep : "";

        return [
          tool.label || tool.slug || "Physical Security Tool",
          status,
          action,
          detail + nextStep
        ];
      });

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
      ? '<p class="physical-security-watch-risk-note"><strong>Watch/Risk detail only:</strong> The table below lists items that need review or correction. Healthy and pending tools stay in the page rollup above.</p>'
      : "";

    const detailTable = detailRows.length
      ? [
          '<div style="margin-top:12px;"></div>',
          '<table class="summary-table physical-security-watch-risk-table" data-sl-physical-security-report-summary-detail-table="true">',
          '<thead><tr><th>Tool</th><th>Status</th><th>Required Action</th><th>Detail / Next Step</th></tr></thead>',
          '<tbody>',
          detailRows.map((row) => {
            return '<tr>' + row.map((cell, index) => '<td>' + (index === 1 ? cell : escapeHtml(cell)) + '</td>').join("") + '</tr>';
          }).join(""),
          '</tbody>',
          '</table>'
        ].join("")
      : "";

    return summaryTable + detailIntro + detailTable;
  }

  function renderExportHtml(summary) {
    if (!summary || !summary.counts || !summary.counts.generated) return "";

    return [
      '<section class="export-extra-section physical-security-report-summary" data-sl-report-summary-version="' + escapeHtml(VERSION) + '">',
      renderExportTableHtml(summary),
      "<p><small>This category summary is generated from the current Physical Security guidance memory stack and is intended as a planning aid. Verify final designs against site conditions, manufacturer data, and project requirements.</small></p>",
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
      priority ? "Priority item: " + priority.label + " - " + (priority.action || priority.reason || "Review before finalizing the design.") : "",
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
    const existingSlot = document.getElementById(EXPORT_SLOT_ID);

    if (!html) {
      if (existingSlot) existingSlot.remove();
      return false;
    }

    const slot = findOrCreateExportSlot(mount);
    slot.innerHTML = html;

    mount.setAttribute("data-export-section", "");
    mount.setAttribute("data-export-suppress-title", "true");
    mount.setAttribute("aria-hidden", "true");

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
