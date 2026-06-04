(() => {
  "use strict";

  /* shared-export-027-section-titles */
  /* shared-export-028-planner-sections */
  /* shared-export-029-access-report-polish */
  /* shared-export-030-semantic-report-tones */
  const DEFAULTS = {
    siteName: "ScopedLabs",
    siteTagline: "Engineering · Analysis · Tools",
    logoUrl: "https://scopedlabs.com/assets/favicon/favicon-32x32.png?v=1",
    resultSelector: "#results",
    extraSectionSelector: "[data-export-section]",
    inputContainerSelector: ".tool-card .form-grid, #toolCard .form-grid, main .form-grid",
    exportStatusSelector: "#exportStatus",
    exportButtonSelector: "#exportReport",
    snapshotButtonSelector: "#saveSnapshot",
    reportTitleSelector: "#reportTitle",
    projectNameSelector: "#projectName",
    clientNameSelector: "#clientName",
    preparedBySelector: "#preparedBy",
    customNotesSelector: "#customNotes",
    snapshotLimit: 25,
    snapshotSaveEndpoint: "/api/snapshots/save",
    snapshotApiMode: "remote-first",
    siteKey: "scopedlabs",
    enableOnProPages: true,
    alwaysExportReady: false,
    invalidateOnInput: true,
    readyStatusMessage: "",
    emptyExportOutputs: [],
    suppressStandardReportSections: false,
    suppressHeaderStatusPill: false,
    customPayloadBuilder: null,
    payloadBuilder: null,
    stackReportSections: false,
    squareToolbarButtons: false,
    inputSectionTitle: "Inputs",
    outputSectionTitle: "Calculated Outputs"
  };

  const state = {
    options: {},
    observer: null,
    initialized: false
  };

  const $ = (selector, root = document) => root.querySelector(selector);

  function mergeOptions(options = {}) {
    const body = document.body || {};

    const categorySlug = options.categorySlug || body.dataset?.category || "general";
    const toolSlug =
      options.toolSlug ||
      body.dataset?.tool ||
      body.dataset?.step ||
      document.location.pathname.split("/").filter(Boolean).pop() ||
      "tool";

    const categoryLabel = options.categoryLabel || titleCase(categorySlug);
    const toolLabel =
      options.toolLabel ||
      document.querySelector("h1")?.textContent?.trim() ||
      titleCase(toolSlug);

    return {
      ...DEFAULTS,
      categorySlug,
      categoryLabel,
      toolSlug,
      toolLabel,
      reportPrefix: options.reportPrefix || makePrefix(categorySlug, toolSlug),
      snapshotKey:
        options.snapshotKey ||
        `scopedlabs:reports:${categorySlug}:${toolSlug}`,
      assumptions:
        options.assumptions ||
        [
          "This report reflects the visible tool inputs and outputs at the time the export was generated.",
          "ScopedLabs outputs are planning aids only and should be verified against project requirements, manufacturer documentation, and site-specific conditions."
        ],
      disclaimer:
        options.disclaimer ||
        "ScopedLabs outputs are planning aids only and do not replace formal engineering review, code compliance review, site-specific validation, manufacturer documentation, or platform-specific design validation.",
      ...options
    };
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function makePrefix(categorySlug, toolSlug) {
    const cat = String(categorySlug || "GEN")
      .split("-")
      .map((x) => x[0] || "")
      .join("")
      .toUpperCase();

    const tool = String(toolSlug || "TOOL")
      .split("-")
      .map((x) => x[0] || "")
      .join("")
      .toUpperCase();

    return `SL-${cat}-${tool}`;
  }

  function normalizeSlug(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDateTime(isoString) {
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return String(isoString || "");
    }
  }

  function makeReportId(prefix = "SL-REPORT") {
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    return `${prefix}-${stamp}`;
  }

  function hasStoredAuth() {
    try {
      const keys = Object.keys(localStorage);

      for (const key of keys) {
        if (!key.startsWith("sb-")) continue;

        const rawText = localStorage.getItem(key);
        if (!rawText) continue;

        const raw = JSON.parse(rawText);

        if (
          raw?.access_token ||
          raw?.currentSession?.access_token ||
          raw?.session?.access_token ||
          raw?.user?.aud === "authenticated" ||
          (Array.isArray(raw) && raw.some((item) => item?.access_token))
        ) {
          return true;
        }
      }
    } catch {}

    return false;
  }

  function valueContainsCategory(value, category) {
    const target = normalizeSlug(category);

    if (value == null) return false;

    if (typeof value === "string") {
      return normalizeSlug(value).includes(target);
    }

    if (Array.isArray(value)) {
      return value.some((item) => valueContainsCategory(item, target));
    }

    if (typeof value === "object") {
      return Object.entries(value).some(([key, val]) => {
        const k = normalizeSlug(key);

        if (k === target && (val === true || val === "true" || val === 1 || val === "1")) {
          return true;
        }

        if (
          ["category", "category_slug", "categorySlug", "slug", "id", "name"].includes(key) &&
          normalizeSlug(val) === target
        ) {
          return true;
        }

        return valueContainsCategory(val, target);
      });
    }

    return false;
  }

  function getUnlockedCategories() {
    const found = new Set();

    try {
      const direct = localStorage.getItem("sl_unlocked_categories");

      if (direct) {
        try {
          const parsed = JSON.parse(direct);

          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (typeof item === "string") found.add(normalizeSlug(item));
              else if (item?.category) found.add(normalizeSlug(item.category));
              else if (item?.category_slug) found.add(normalizeSlug(item.category_slug));
              else if (item?.slug) found.add(normalizeSlug(item.slug));
            });
          } else if (typeof parsed === "object" && parsed) {
            Object.entries(parsed).forEach(([key, value]) => {
              if (value === true || value === "true" || value === 1 || value === "1") {
                found.add(normalizeSlug(key));
              }

              if (typeof value === "string") {
                found.add(normalizeSlug(value));
              }
            });
          }
        } catch {
          direct
            .split(",")
            .map((x) => normalizeSlug(x))
            .filter(Boolean)
            .forEach((x) => found.add(x));
        }
      }

      Object.keys(localStorage).forEach((key) => {
        const lowerKey = normalizeSlug(key);

        if (
          !lowerKey.includes("unlock") &&
          !lowerKey.includes("entitlement") &&
          !lowerKey.includes("category")
        ) {
          return;
        }

        const raw = localStorage.getItem(key);
        if (!raw) return;

        if (normalizeSlug(raw).includes(state.options.categorySlug)) {
          found.add(state.options.categorySlug);
        }

        try {
          const parsed = JSON.parse(raw);
          if (valueContainsCategory(parsed, state.options.categorySlug)) {
            found.add(state.options.categorySlug);
          }
        } catch {}
      });
    } catch {}

    return Array.from(found).filter(Boolean);
  }

  function hasExportAccess() {
    const body = document.body;

    if (state.options.alwaysAllowExport === true) return true;

    if (
      state.options.enableOnProPages &&
      (body?.dataset?.tier === "pro" || body?.dataset?.protected === "true")
    ) {
      return true;
    }

    return hasStoredAuth() && getUnlockedCategories().includes(state.options.categorySlug);
  }

  function setStatus(message = "") {
    const statusEl = $(state.options.exportStatusSelector);
    if (statusEl) statusEl.textContent = message;
  }

  function setButtonsEnabled(enabled) {
    const exportBtn = $(state.options.exportButtonSelector);
    const snapshotBtn = $(state.options.snapshotButtonSelector);

    if (exportBtn) exportBtn.disabled = !enabled;
    if (snapshotBtn) snapshotBtn.disabled = !enabled;
  }

  function getResultRows() {
    const resultEl = $(state.options.resultSelector);
    if (!resultEl) return [];

    return Array.from(resultEl.querySelectorAll(".result-row"))
      .map((rowEl) => {
        const label =
          rowEl.querySelector(".result-label")?.textContent?.trim() ||
          rowEl.querySelector(".k")?.textContent?.trim() ||
          "";

        const value =
          rowEl.querySelector(".result-value")?.textContent?.trim() ||
          rowEl.querySelector(".v")?.textContent?.trim() ||
          "";

        return { label, value };
      })
      .filter((item) => item.label && item.value);
  }

  function getFallbackOutputRows() {
    const configured = state.options.emptyExportOutputs;

    if (typeof state.options.emptyExportOutputRows === "function") {
      try {
        const rows = state.options.emptyExportOutputRows();
        if (Array.isArray(rows) && rows.length) return rows.filter((row) => row && row.label && row.value);
      } catch {}
    }

    if (Array.isArray(configured) && configured.length) {
      return configured.filter((row) => row && row.label && row.value);
    }

    return [
      { label: "Report Type", value: state.options.toolLabel || "ScopedLabs Report" },
      { label: "Report Readiness", value: "Ready without calculator step" }
    ];
  }

  function hasUsableResults() {
    if (state.options.alwaysExportReady === true) return true;
    return getResultRows().length > 0;
  }

  function readFieldLabel(field) {
    return (
      field.querySelector(".label")?.textContent?.trim() ||
      field.querySelector("label")?.textContent?.trim() ||
      field.textContent?.trim() ||
      ""
    );
  }

  function readControlValue(control) {
    if (!control) return "";

    if (control.tagName === "SELECT") {
      return control.options[control.selectedIndex]?.textContent?.trim() || control.value || "";
    }

    if (control.type === "checkbox") {
      return control.checked ? "Yes" : "No";
    }

    if (control.type === "radio") {
      return control.checked ? control.value : "";
    }

    return String(control.value ?? "").trim();
  }

  function getInputRows() {
    const container = $(state.options.inputContainerSelector);
    if (!container) return [];

    return Array.from(container.querySelectorAll(".field"))
      .map((field) => {
        const control = field.querySelector("input, select, textarea");
        if (!control) return null;

        const label = readFieldLabel(field);
        const value = readControlValue(control);

        if (!label || value === "") return null;

        return { label, value };
      })
      .filter(Boolean);
  }

  function getMeta() {
    return {
      reportTitle:
        ($(state.options.reportTitleSelector)?.value || "").trim() ||
        `${state.options.toolLabel} Assessment`,
      projectName: ($(state.options.projectNameSelector)?.value || "").trim(),
      clientName: ($(state.options.clientNameSelector)?.value || "").trim(),
      preparedBy: ($(state.options.preparedBySelector)?.value || "").trim(),
      customNotes: ($(state.options.customNotesSelector)?.value || "").trim()
    };
  }

  function getVisiblePageStatus() {
  const roots = [
    $(state.options.resultSelector),
    document.querySelector("#analysis-copy")
  ].filter(Boolean);

  const visibleTexts = [];

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }

  for (const root of roots) {
    const nodes = Array.from(root.querySelectorAll("*"));

    for (const node of nodes) {
      if (!isVisible(node)) continue;

      const text = String(node.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) continue;

      if (/status\s*:\s*risk/i.test(text) || /^risk$/i.test(text)) visibleTexts.push("RISK");
      if (/status\s*:\s*watch/i.test(text) || /^watch$/i.test(text)) visibleTexts.push("WATCH");
      if (/status\s*:\s*healthy/i.test(text) || /^healthy$/i.test(text)) visibleTexts.push("HEALTHY");
    }
  }

  if (visibleTexts.includes("RISK")) return "RISK";
  if (visibleTexts.includes("WATCH")) return "WATCH";
  if (visibleTexts.includes("HEALTHY")) return "HEALTHY";

  return "";
}

  function getStatusFromOutputs(outputs) {
  const visibleStatus = getVisiblePageStatus();
  if (visibleStatus) return visibleStatus;

  function classifyText(value) {
    const raw = normalizeSlug(value);

    if (!raw) return "";

    if (
      raw.includes("risk") ||
      raw.includes("critical") ||
      raw.includes("failed") ||
      raw.includes("failure") ||
      raw.includes("overload") ||
      raw.includes("saturation") ||
      raw.includes("unsafe") ||
      raw.includes("out of range") ||
      raw.includes("exceeded") ||
      raw.includes("exceeds") ||
      raw.includes("problematic")
    ) {
      return "RISK";
    }

    if (
      raw.includes("watch") ||
      raw.includes("warning") ||
      raw.includes("caution") ||
      raw.includes("moderate") ||
      raw.includes("tight") ||
      raw.includes("limited") ||
      raw.includes("borderline") ||
      raw.includes("elevated")
    ) {
      return "WATCH";
    }

    if (
      raw.includes("healthy") ||
      raw.includes("good") ||
      raw.includes("pass") ||
      raw.includes("acceptable") ||
      raw.includes("balanced") ||
      raw.includes("excellent") ||
      raw.includes("safe") ||
      raw.includes("normal")
    ) {
      return "HEALTHY";
    }

    return "";
  }

  const priorityLabels = [
    "System Status",
    "Status",
    "Operational Risk",
    "Install Difficulty",
    "Complexity",
    "Risk",
    "Health",
    "CPU Class",
    "Capacity Class",
    "Density Class",
    "Throughput Class",
    "Performance Class",
    "Latency Class",
    "Power Class",
    "Thermal Class",
    "Assessment",
    "Result Class"
  ];

  for (const label of priorityLabels) {
    const found = outputs.find((row) => {
      return normalizeSlug(row.label) === normalizeSlug(label);
    });

    const status = classifyText(found?.value || "");
    if (status) return status;
  }

  const classLikeRow = outputs.find((row) => {
    const label = normalizeSlug(row.label);

    return (
      label.includes("status") ||
      label.includes("risk") ||
      label.includes("class") ||
      label.includes("assessment") ||
      label.includes("condition") ||
      label.includes("health")
    );
  });

  const classLikeStatus = classifyText(classLikeRow?.value || "");
  if (classLikeStatus) return classLikeStatus;

  for (const row of outputs) {
    const status = classifyText(row.value || "");
    if (status === "RISK") return "RISK";
  }

  for (const row of outputs) {
    const status = classifyText(row.value || "");
    if (status === "WATCH") return "WATCH";
  }

  return "HEALTHY";
}

  function getInterpretationFromOutputs(outputs) {
    const found = outputs.find((row) => {
      const label = normalizeSlug(row.label);
      return (
        label.includes("engineering insight") ||
        label.includes("engineering interpretation") ||
        label.includes("interpretation") ||
        label.includes("analysis") ||
        label.includes("guidance")
      );
    });

    return found?.value || "";
  }

  function getSummaryFromOutputs(outputs) {
    if (typeof state.options.summaryBuilder === "function") {
      try {
        const summary = state.options.summaryBuilder(outputs, getInputRows());
        if (summary) return summary;
      } catch {}
    }

    const status = getStatusFromOutputs(outputs);
    const first = outputs[0];
    const second = outputs[1];

    if (first && second) {
      return `${state.options.toolLabel} returned ${first.label}: ${first.value} and ${second.label}: ${second.value}. Overall status: ${status}.`;
    }

    if (first) {
      return `${state.options.toolLabel} returned ${first.label}: ${first.value}. Overall status: ${status}.`;
    }

    return `${state.options.toolLabel} report generated from the current visible calculator results.`;
  }

  function getAnalysisSections() {
  const titles = [
    "Engineering Interpretation",
    "Dominant Constraint",
    "Actionable Guidance",
    "Recommended Action",
    "Recommended Actions",
    "Design Guidance",
    "Best Practices"
  ];

  const roots = [
    $(state.options.resultSelector),
    document.querySelector("#analysis-copy")
  ].filter(Boolean);

  const sections = [];
  const seen = new Set();

  function cleanText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function titleMatch(text) {
    const clean = cleanText(text).toLowerCase();

    return titles.find((title) => {
      const t = title.toLowerCase();
      return clean === t || clean.startsWith(`${t} `);
    });
  }

  for (const root of roots) {
    const nodes = Array.from(
      root.querySelectorAll("h2, h3, h4, strong, b, .h2, .h3, .analysis-title")
    );

    for (const node of nodes) {
      const matchedTitle = titleMatch(node.textContent);

      if (!matchedTitle) continue;

      const container =
        node.closest(".card") ||
        node.closest(".analysis-card") ||
        node.closest(".result-card") ||
        node.parentElement;

      if (!container) continue;

      let body = cleanText(container.textContent);
      body = body.replace(new RegExp(`^${matchedTitle}\\s*`, "i"), "").trim();

      if (!body || body.toLowerCase() === matchedTitle.toLowerCase()) continue;

      const key = `${matchedTitle}:${body}`;

      if (seen.has(key)) continue;
      seen.add(key);

      sections.push({
        title: matchedTitle,
        body
      });
    }
  }

  return sections;
}

  function captureVisibleChart() {
  function findVisibleCanvas() {
    const candidates = Array.from(document.querySelectorAll("canvas"));

    return candidates.find((canvas) => {
      const rect = canvas.getBoundingClientRect();
      const hiddenParent = canvas.closest("[hidden], .hidden");
      return !hiddenParent && rect.width > 0 && rect.height > 0;
    });
  }

  function exportCanvasWithBackground(sourceCanvas) {
    const sourceWidth = sourceCanvas.width || Math.round(sourceCanvas.getBoundingClientRect().width);
    const sourceHeight = sourceCanvas.height || Math.round(sourceCanvas.getBoundingClientRect().height);

    if (!sourceWidth || !sourceHeight) return "";

    const canvas = document.createElement("canvas");
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.save();

    /*
      Important:
      Do NOT reinterpret the chart values, bands, threshold lines, or colors here.
      The page chart is the source of truth. We only add a dark backing layer so
      transparent analyzer labels remain readable inside the white report.
    */
    ctx.fillStyle = "#07120d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

    ctx.restore();

    return canvas.toDataURL("image/png", 1);
  }

  if (typeof state.options.getChartImage === "function") {
    try {
      const custom = state.options.getChartImage();
      if (custom) return custom;
    } catch (err) {
      console.warn("ScopedLabs export custom chart capture failed:", err);
    }
  }

  try {
    const visibleCanvas = findVisibleCanvas();

    if (!visibleCanvas) return "";

    return exportCanvasWithBackground(visibleCanvas);
  } catch (err) {
    console.warn("ScopedLabs export chart capture failed:", err);
    return "";
  }
}


  function cleanExtraTableText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  // shared-export-023-ignore-table-action-children
  function exportableTableCellText(cell) {
    const clone = cell.cloneNode(true);
    clone.querySelectorAll('[data-export-ignore="true"]').forEach((item) => item.remove());
    return cleanExtraTableText(clone.textContent);
  }

  function directTableRowCells(row) {
    return Array.from(row?.children || [])
      .filter((cell) => cell.dataset?.exportIgnore !== "true" && cell.getAttribute("data-export-ignore") !== "true")
      .map((cell) => ({
        text: exportableTableCellText(cell),
        colSpan: Number(cell.getAttribute("colspan") || cell.colSpan || 1)
      }));
  }

  function readExtraTable(table) {
    if (!table) return null;

    const headerRows = Array.from(table.querySelectorAll(":scope > thead > tr"));
    let tableTitle =
      cleanExtraTableText(table.dataset?.exportTableTitle || table.getAttribute("data-export-table-title") || "");
    let effectiveHeaderRow = headerRows[0] || null;

    if (headerRows.length > 1) {
      const firstHeaderCells = directTableRowCells(headerRows[0]);
      const firstHeaderLooksLikeTitle =
        firstHeaderCells.length === 1 &&
        firstHeaderCells[0].text &&
        firstHeaderCells[0].colSpan > 1;

      if (firstHeaderLooksLikeTitle) {
        tableTitle = tableTitle || firstHeaderCells[0].text;
        effectiveHeaderRow =
          headerRows.slice(1).find((row) => directTableRowCells(row).length > 1) ||
          headerRows[headerRows.length - 1];
      }
    } else if (headerRows.length === 1) {
      const firstHeaderCells = directTableRowCells(headerRows[0]);
      const onlyHeaderLooksLikeTitle =
        firstHeaderCells.length === 1 &&
        firstHeaderCells[0].text &&
        firstHeaderCells[0].colSpan > 1;

      if (onlyHeaderLooksLikeTitle) {
        tableTitle = tableTitle || firstHeaderCells[0].text;
        effectiveHeaderRow = null;
      }
    }

    const headerCells = effectiveHeaderRow
      ? directTableRowCells(effectiveHeaderRow).map((cell) => cell.text).filter(Boolean)
      : [];

    let bodyRows = Array.from(table.querySelectorAll(":scope > tbody > tr")).map((row) => {
      return directTableRowCells(row).map((cell) => cell.text);
    });

    if (!bodyRows.length) {
      const allRows = Array.from(table.querySelectorAll(":scope > tr")).map((row) => {
        return directTableRowCells(row).map((cell) => cell.text);
      });

      bodyRows = headerCells.length ? allRows.slice(1) : allRows;
    }

    const rows = bodyRows.filter((row) => row.some(Boolean));

    if (!rows.length) return null;

    return {
      title: tableTitle,
      headers: headerCells,
      rows
    };
  }

  function getExtraExportSections() {
    const selector = state.options.extraSectionSelector || "[data-export-section]";
    const nodes = Array.from(document.querySelectorAll(selector));
    const sections = [];

    for (const node of nodes) {
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();

      if (style.display === "none" || style.visibility === "hidden" || rect.width === 0) {
        continue;
      }

      const suppressTitle =
        String(
          node.dataset?.exportSuppressTitle ||
          node.getAttribute("data-export-suppress-title") ||
          ""
        ).trim().toLowerCase() === "true";

      const title =
        node.dataset?.exportTitle ||
        node.getAttribute("aria-label") ||
        node.querySelector("h2, h3, h4")?.textContent?.trim() ||
        "Additional Output";

      const compactSvg =
        String(
          node.dataset?.exportCompactSvg ||
          node.getAttribute("data-export-compact-svg") ||
          ""
        ).trim().toLowerCase() === "true";

      const tables = Array.from(node.querySelectorAll("table"))
        .map(readExtraTable)
        .filter(Boolean);

      const textNodes = Array.from(
        node.querySelectorAll("[data-export-text], .export-text")
      )
        .map((el) => String(el.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean);

      const svgNodes = Array.from(node.querySelectorAll("svg[data-export-svg], [data-export-svg] svg"));
      const seenSvg = new Set();
      const svgs = [];

      for (const svg of svgNodes) {
        if (!svg || seenSvg.has(svg)) continue;
        seenSvg.add(svg);

        const clone = svg.cloneNode(true);
        clone.setAttribute("width", "100%");
        clone.removeAttribute("height");
        clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svgs.push(clone.outerHTML);
      }

      const text = textNodes.join("\n\n");

      if (!tables.length && !text && !svgs.length) continue;

      sections.push({
        suppressTitle,
        compactSvg,
        title,
        tables,
        text,
        svgs
      });
    }

    return sections;
  }

  function renderExtraExportSections(sections = []) {
    return sections.map((section) => {
      const textBlock = section.text
        ? `<div class="body-copy">${escapeHtml(section.text).replace(/\n/g, "<br>")}</div>`
        : "";

      const svgBlocks = (section.svgs || []).map((svg) => {
        const svgWrapClass = section.compactSvg
          ? "extra-svg-wrap extra-svg-wrap--compact print-low-ink-sentinel"
          : "extra-svg-wrap print-low-ink-sentinel";

        return `<div class="${svgWrapClass}">${svg}</div>`;
      }).join("");

      function renderReportCell(cell) {
        if (cell && typeof cell === "object" && !Array.isArray(cell)) {
          const text = cell.text ?? cell.value ?? "";
          const tone = String(cell.tone || "")
            .replace(/[^a-zA-Z0-9_-]/g, "")
            .trim();
          const className = String(cell.className || "")
            .replace(/[^a-zA-Z0-9_\-\s]/g, "")
            .trim();

          const classes = [
            tone ? "report-tone report-tone--" + tone : "",
            className
          ].filter(Boolean).join(" ");

          return classes
            ? `<td class="${classes}">${escapeHtml(text)}</td>`
            : `<td>${escapeHtml(text)}</td>`;
        }

        return `<td>${escapeHtml(cell)}</td>`;
      }

      const tableBlocks = (section.tables || []).map((table) => {
        const headers = (table.headers || []).length
          ? table.headers
          : ((table.rows || [])[0] || []).map((_, index) => `Column ${index + 1}`);

        const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");

        const rowHtml = (table.rows || []).map((row) => `
          <tr>
            ${row.map((cell) => renderReportCell(cell)).join("")}
          </tr>
        `).join("");

        const tableTitleBlock = table.title
          ? `<h3 class="extra-table-title">${escapeHtml(table.title)}</h3>`
          : "";

        const requestedClass = String(table.className || section.tableClass || "")
          .replace(/[^a-zA-Z0-9_\-\s]/g, "")
          .trim();

        const tableClass = requestedClass
          ? `extra-export-table ${requestedClass}`
          : (/physical security tool notes/i.test(String(section.title || table.title || ""))
            ? "extra-export-table extra-export-table--physical-security-tool-notes"
            : "extra-export-table");

        return `
          ${tableTitleBlock}
          <table class="${tableClass}">
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${rowHtml}</tbody>
          </table>
        `;
      }).join("");

      const headingBlock = section.suppressTitle
        ? ""
        : `
          <div class="section-heading-row">
            <h2>${escapeHtml(section.title)}</h2>
            ${section.countLabel ? `<span class="section-count ${section.countTone ? "section-count--" + String(section.countTone).replace(/[^a-zA-Z0-9_-]/g, "") : ""}">${escapeHtml(section.countLabel)}</span>` : ""}
          </div>
          ${section.description ? `<p class="section-description">${escapeHtml(section.description)}</p>` : ""}
        `;

      return `
        <section class="${section.compactSvg ? "section section--compact-svg" : "section"}">
          ${headingBlock}
          ${textBlock}
          ${svgBlocks}
          ${tableBlocks}
        </section>
      `;
    }).join("");
  }

  function shouldSuppressDefaultInterpretationBlock() {
    const body = document.body || null;
    if (!body) return false;

    const value =
      body.dataset?.suppressDefaultExportInterpretation ||
      body.getAttribute("data-suppress-default-export-interpretation") ||
      "";

    return String(value).trim().toLowerCase() === "true";
  }

  function resolveFunctionReference(reference) {
    if (typeof reference === "function") return reference;
    if (typeof reference !== "string" || !reference.trim()) return null;

    return reference.split(".").reduce((target, key) => {
      if (!target) return null;
      return target[key] || null;
    }, window);
  }

  function buildCustomPayload() {
    const builder = resolveFunctionReference(state.options.customPayloadBuilder || state.options.payloadBuilder);
    if (!builder) return null;

    try {
      const custom = builder({
        options: state.options,
        getMeta,
        getInputRows,
        getResultRows
      });

      if (!custom) return null;

      return {
        reportId: custom.reportId || makeReportId(state.options.reportPrefix),
        generatedAt: custom.generatedAt || new Date().toISOString(),
        category: custom.category || state.options.categoryLabel,
        categorySlug: custom.categorySlug || state.options.categorySlug,
        tool: custom.tool || state.options.toolLabel,
        toolSlug: custom.toolSlug || state.options.toolSlug,
        status: custom.status || "",
        summary: custom.summary || "",
        interpretation: custom.interpretation || "",
        analysisSections: Array.isArray(custom.analysisSections) ? custom.analysisSections : [],
        extraSections: Array.isArray(custom.extraSections) ? custom.extraSections : [],
        inputs: Array.isArray(custom.inputs) ? custom.inputs : getInputRows(),
        outputs: Array.isArray(custom.outputs) ? custom.outputs : getResultRows(),
        assumptions: Array.isArray(custom.assumptions) ? custom.assumptions : state.options.assumptions,
        chartImage: custom.chartImage || "",
        stackReportSections: custom.stackReportSections === true,
        meta: {
          ...getMeta(),
          ...(custom.meta || {})
        }
      };
    } catch (err) {
      console.warn("ScopedLabs custom export payload failed:", err);
      return null;
    }
  }

  function buildPayload() {
    const customPayload = buildCustomPayload();
    if (customPayload) return customPayload;

    let outputs = getResultRows();

    if (!outputs.length && state.options.alwaysExportReady === true) {
      outputs = getFallbackOutputRows();
    }

    if (!outputs.length) return null;

    const inputs = getInputRows();
    const meta = getMeta();
    const status = getStatusFromOutputs(outputs);
const analysisSections = getAnalysisSections();

let interpretation = getInterpretationFromOutputs(outputs);

const interpretationSection = analysisSections.find((section) => {
  return normalizeSlug(section.title) === normalizeSlug("Engineering Interpretation");
});

if (!interpretation && interpretationSection?.body) {
  interpretation = interpretationSection.body;
}

const chartImage = captureVisibleChart();
const extraSections = getExtraExportSections();

if (shouldSuppressDefaultInterpretationBlock()) {
  interpretation = "";
}

    return {
      reportId: makeReportId(state.options.reportPrefix),
      generatedAt: new Date().toISOString(),
      category: state.options.categoryLabel,
      categorySlug: state.options.categorySlug,
      tool: state.options.toolLabel,
      toolSlug: state.options.toolSlug,
      status,
      summary: getSummaryFromOutputs(outputs),
      interpretation,
      analysisSections,
      extraSections,
      inputs,
      outputs,
      assumptions: state.options.assumptions,
      chartImage,
      meta
    };
  }

  function readSnapshots(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeSnapshots(key, items) {
    localStorage.setItem(key, JSON.stringify(items));
  }

  function saveSnapshotLocal(payload) {
    const key = state.options.snapshotKey;
    const existing = readSnapshots(key);

    existing.unshift({
      ...payload,
      savedAt: new Date().toISOString()
    });

    const trimmed = existing.slice(0, state.options.snapshotLimit);
    writeSnapshots(key, trimmed);

    return trimmed.length;
  }

    function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function withTimeout(promise, ms, fallback = null) {
    let timer;

    try {
      return await Promise.race([
        promise,
        new Promise((resolve) => {
          timer = setTimeout(() => resolve(fallback), ms);
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function waitForAuthReady() {
    try {
      if (window.SL_AUTH?.ready && typeof window.SL_AUTH.ready.then === "function") {
        await withTimeout(window.SL_AUTH.ready, 2500, null);
      }
    } catch {}
  }

  async function getSupabaseSession() {
    await waitForAuthReady();

    if (window.SL_AUTH?.__session?.access_token) {
      return window.SL_AUTH.__session;
    }

    const candidates = [
      window.SL_AUTH?.sb,
      window.ScopedLabsAuth?.sb,
      window.supabaseClient,
      window.sb
    ].filter(Boolean);

    for (const client of candidates) {
      if (!client?.auth?.getSession) continue;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const result = await withTimeout(client.auth.getSession(), 2500, null);
          const session = result?.data?.session || result?.session || null;

          if (session?.access_token) {
            if (window.SL_AUTH) window.SL_AUTH.__session = session;
            return session;
          }
        } catch {}

        await sleep(250);
      }
    }

    return null;
  }

  function findStoredAccessToken() {
    try {
      const keys = Object.keys(localStorage);

      for (const key of keys) {
        if (!key.startsWith("sb-")) continue;

        const rawText = localStorage.getItem(key);
        if (!rawText) continue;

        const raw = JSON.parse(rawText);

        if (raw?.access_token) return raw.access_token;
        if (raw?.currentSession?.access_token) return raw.currentSession.access_token;
        if (raw?.session?.access_token) return raw.session.access_token;

        if (Array.isArray(raw)) {
          const found = raw.find((item) => item?.access_token);
          if (found?.access_token) return found.access_token;
        }
      }
    } catch {}

    return "";
  }

    async function getSnapshotAccessToken() {
    const session = await getSupabaseSession();
    if (session?.access_token) return session.access_token;

    // Last-resort fallback for pages that have localStorage hydrated before Supabase client is ready.
    const stored = findStoredAccessToken();
    if (stored) return stored;

    // One short retry covers the first page load immediately after magic-link auth.
    await sleep(500);

    const retrySession = await getSupabaseSession();
    if (retrySession?.access_token) return retrySession.access_token;

    return findStoredAccessToken();
  }

  function buildSnapshotRequest(payload) {
    return {
      site_key: state.options.siteKey || "scopedlabs",
      snapshot_type: "tool_report",
      schema_version: "snapshot-v1",

      category_slug: payload.categorySlug || state.options.categorySlug || "",
      category_label: payload.category || state.options.categoryLabel || "",

      tool_slug: payload.toolSlug || state.options.toolSlug || "",
      tool_label: payload.tool || state.options.toolLabel || "",

      report_title: payload.meta?.reportTitle || payload.tool || "Tool Snapshot",
      project_name: payload.meta?.projectName || "",
      client_name: payload.meta?.clientName || "",
      prepared_by: payload.meta?.preparedBy || "",

      status: payload.status || "",
      summary: payload.summary || "",

      payload_json: {
        ...payload,
        savedAt: new Date().toISOString()
      }
    };
  }

  async function saveSnapshot(payload) {
    const token = await getSnapshotAccessToken();

    if (!token) {
      const localCount = saveSnapshotLocal(payload);

      return {
        ok: false,
        mode: "local",
        reason: "not_signed_in",
        localCount
      };
    }

    const endpoint = state.options.snapshotSaveEndpoint || "/api/snapshots/save";

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(buildSnapshotRequest(payload))
      });

      const text = await resp.text();
      const data = text ? JSON.parse(text) : {};

      if (!resp.ok || data?.ok === false) {
        const localCount = saveSnapshotLocal(payload);

        return {
          ok: false,
          mode: "local",
          reason: data?.error || "remote_save_failed",
          detail: data?.detail || text,
          localCount
        };
      }

      return {
        ok: true,
        mode: "account",
        snapshot: data.snapshot || null
      };
    } catch (err) {
      const localCount = saveSnapshotLocal(payload);

      return {
        ok: false,
        mode: "local",
        reason: "network_error",
        detail: err?.message || String(err),
        localCount
      };
    }
  }


  function buildReportHTML(payload) {
    const inputRows = (payload.inputs || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td>${escapeHtml(item.value)}</td>
      </tr>
    `).join("");

    const outputRows = (payload.outputs || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td>${escapeHtml(item.value)}</td>
      </tr>
    `).join("");

    const assumptions = (payload.assumptions || []).map((item) => `
      <li>${escapeHtml(item)}</li>
    `).join("");

    const projectDetails = [
      payload.meta?.projectName ? `<div><strong>Project:</strong> ${escapeHtml(payload.meta.projectName)}</div>` : "",
      payload.meta?.clientName ? `<div><strong>Client:</strong> ${escapeHtml(payload.meta.clientName)}</div>` : "",
      payload.meta?.preparedBy ? `<div><strong>Prepared By:</strong> ${escapeHtml(payload.meta.preparedBy)}</div>` : ""
    ].filter(Boolean).join("");

    const notesBlock = payload.meta?.customNotes
      ? `
        <section class="section">
          <h2>Custom Notes</h2>
          <div class="body-copy">${escapeHtml(payload.meta.customNotes).replace(/\n/g, "<br>")}</div>
        </section>
      `
      : "";

    const chartBlock = payload.chartImage
      ? `
        <section class="section">
          <h2>Chart Snapshot</h2>
          <div class="chart-wrap">
            <img src="${payload.chartImage}" alt="${escapeHtml(payload.tool)} chart">
          </div>
        </section>
      `
      : "";

    const extraSectionsBlock = renderExtraExportSections(payload.extraSections || []);

    const interpretationBlock = payload.interpretation
      ? `
        <section class="section">
          <h2>Engineering Interpretation</h2>
          <div class="body-copy">${escapeHtml(payload.interpretation)}</div>
        </section>
      `
      : "";

      // Suppressed until section-level export parsing is rebuilt safely.
      // Engineering Interpretation remains the primary narrative section.
      const additionalAnalysisBlock = "";

    const stackReportSections = state.options.stackReportSections === true || payload.stackReportSections === true;
    const standardGridClass = stackReportSections ? "grid grid--stacked" : "grid";
    const toolbarButtonRadius = state.options.squareToolbarButtons === true ? "10px" : "999px";

    const statusClass = String(payload.status || "").toLowerCase();
    const suppressStandardSections = state.options.suppressStandardReportSections === true;
    const suppressHeaderStatusPill = state.options.suppressHeaderStatusPill === true;
    const headerStatusPillBlock = suppressHeaderStatusPill ? "" : '<div class="status-pill ' + statusClass + '">' + escapeHtml(payload.status || "") + '</div>';

    const suppressedProjectDetailsBlock = suppressStandardSections && projectDetails
      ? `
        <section class="section">
          <h2>Report Metadata</h2>
          <div class="summary"><div class="project-details">${projectDetails}</div></div>
        </section>
      `
      : "";
    const standardSummaryBlock = suppressStandardSections ? "" : `
      <section class="section">
        <h2>Executive Summary</h2>
        <div class="summary">
          ${escapeHtml(payload.summary || "")}
          <div class="project-details">${projectDetails}</div>
        </div>
      </section>
    `;

    const standardInputsOutputsBlock = suppressStandardSections ? "" : `
      <section class="section">
        <div class="${standardGridClass}">
          <div>
            <h2>${escapeHtml(state.options.inputSectionTitle || "Inputs")}</h2>
            <table>
              <thead><tr><th>Input</th><th>Value</th></tr></thead>
              <tbody>${inputRows}</tbody>
            </table>
          </div>
          <div>
            <h2>${escapeHtml(state.options.outputSectionTitle || "Calculated Outputs")}</h2>
            <table>
              <thead><tr><th>Output</th><th>Value</th></tr></thead>
              <tbody>${outputRows}</tbody>
            </table>
          </div>
        </div>
      </section>
    `;

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(payload.meta?.reportTitle || payload.tool || "ScopedLabs Report")}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
    :root{
      --ink:#111827;
      --muted:#4b5563;
      --line:#dce6df;
      --soft:#f5f8f6;
      --accent:#0a7a3f;
      --accent-soft:#e9f8ef;
      --watch:#9a6700;
      --watch-soft:#fff7df;
      --risk:#b42318;
      --risk-soft:#fff0ee;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      background:#eef3f0;
      color:var(--ink);
      font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      line-height:1.45;
    }
    .page{
      max-width:980px;
      margin:0 auto;
      background:#fff;
      min-height:100vh;
      box-shadow:0 24px 80px rgba(15,23,42,.12);
    }
    .toolbar{
      position:sticky;
      top:0;
      z-index:5;
      display:flex;
      justify-content:flex-end;
      gap:10px;
      padding:14px 18px;
      border-bottom:1px solid var(--line);
      background:#fbfcfb;
    }
    .toolbar button{
      appearance:none;
      border:1px solid #c9d8cf;
      background:#fff;
      color:var(--ink);
      border-radius:${toolbarButtonRadius};
      padding:10px 14px;
      font-weight:700;
      cursor:pointer;
    }
    .toolbar button:hover{background:#f3f7f5}
    .report{padding:28px 30px 32px}
    .brand-row{
      display:flex;
      align-items:center;
      gap:12px;
      margin-bottom:10px;
    }
    .brand-row img{
      width:28px;
      height:28px;
      display:block;
    }
    .brand-name{
      font-size:1.15rem;
      font-weight:800;
      letter-spacing:.02em;
    }
    .tagline{
      color:var(--muted);
      font-size:.95rem;
      margin-bottom:18px;
    }
    .report-head{
      display:flex;
      justify-content:space-between;
      gap:18px;
      align-items:flex-start;
      border-top:1px solid var(--line);
      border-bottom:1px solid var(--line);
      padding:18px 0;
      margin-bottom:22px;
    }
    .report-title{
      font-size:1.7rem;
      line-height:1.15;
      margin:0 0 6px;
    }
    .report-meta{
      color:var(--muted);
      font-size:.95rem;
      line-height:1.6;
    }
    .status-pill{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:8px 12px;
      border-radius:${toolbarButtonRadius};
      font-size:.82rem;
      font-weight:800;
      letter-spacing:.06em;
      text-transform:uppercase;
      border:1px solid transparent;
      white-space:nowrap;
    }
    .status-pill.healthy{
      color:var(--accent);
      background:var(--accent-soft);
      border-color:#c9ead7;
    }
    .status-pill.watch{
      color:var(--watch);
      background:var(--watch-soft);
      border-color:#f2dfad;
    }
    .status-pill.risk{
      color:var(--risk);
      background:var(--risk-soft);
      border-color:#f3c6c1;
    }
    .section{margin-top:24px}
    .section h2{
      margin:0 0 10px;
      font-size:1rem;
      letter-spacing:.02em;
      text-transform:uppercase;
    }
    .section-heading-row{
      display:flex;
      align-items:baseline;
      justify-content:space-between;
      gap:16px;
      margin-bottom:4px;
    }
    .section-heading-row h2{
      margin:0;
    }
    .section-count{
      color:var(--accent);
      font-size:.84rem;
      font-weight:900;
      letter-spacing:.06em;
      text-transform:uppercase;
      white-space:nowrap;
    }
    .section-count--muted{
      color:var(--muted);
    }
    .report-tone{
      font-weight:900;
    }
    .report-tone--active,
    .report-tone--complete,
    .report-tone--safe{
      color:var(--accent);
    }
    .report-tone--authority,
    .report-tone--watch{
      color:var(--watch);
    }
    .report-tone--risk{
      color:var(--risk);
    }
    .report-tone--muted{
      color:var(--muted);
      font-weight:750;
    }
    .section-description{
      color:var(--muted);
      margin:0 0 10px;
      font-size:.94rem;
      line-height:1.5;
    }
    .extra-table-title{
      margin:18px 0 8px;
      font-size:.88rem;
      letter-spacing:.045em;
      text-transform:uppercase;
      color:var(--ink);
    }
    .summary,
    .body-copy{
      border:1px solid var(--line);
      background:#fafcfb;
      border-radius:14px;
      padding:16px 18px;
      line-height:1.65;
    }
    .project-details{
      display:grid;
      gap:6px;
      margin-top:10px;
      color:var(--muted);
      font-size:.95rem;
    }
    /* shared-export-024-report-text-wrap */
    .summary,
    .body-copy,
    .project-details,
    .report-meta,
    .foot,
    .extra-table-title,
    th,
    td,
    li,
    p{
      max-width:100%;
      overflow-wrap:anywhere;
      word-break:break-word;
    }
    .body-copy{
      white-space:normal;
    }
    table{
      table-layout:fixed;
    }
    /* shared-export-025-tool-notes-column-widths */
    table.extra-export-table--planner td{
      font-size:.91rem;
    }
    table.extra-export-table--planner th,
    table.extra-export-table--planner td{
      overflow-wrap:anywhere;
    }
    table.extra-export-table--planner td{
      font-weight:650;
    }
    table.extra-export-table--planner td:first-child{
      color:var(--ink);
      font-weight:800;
    }
    table.extra-export-table--access-scope{
      font-size:.86rem;
    }
    table.extra-export-table--access-scope th,
    table.extra-export-table--access-scope td{
      padding:9px 10px;
      overflow-wrap:normal;
      word-break:normal;
    }
    table.extra-export-table--access-scope th:nth-child(1),
    table.extra-export-table--access-scope td:nth-child(1){
      width:22%;
    }
    table.extra-export-table--access-scope th:nth-child(2),
    table.extra-export-table--access-scope td:nth-child(2){
      width:13%;
    }
    table.extra-export-table--access-scope th:nth-child(3),
    table.extra-export-table--access-scope td:nth-child(3){
      width:14%;
    }
    table.extra-export-table--access-scope th:nth-child(4),
    table.extra-export-table--access-scope td:nth-child(4){
      width:7%;
      text-align:center;
    }
    table.extra-export-table--access-scope th:nth-child(5),
    table.extra-export-table--access-scope td:nth-child(5){
      width:22%;
    }
    table.extra-export-table--access-scope th:nth-child(6),
    table.extra-export-table--access-scope td:nth-child(6){
      width:22%;
    }
    table.extra-export-table--access-scope td{
      font-weight:650;
      line-height:1.45;
    }
    table.extra-export-table--access-scope td:first-child{
      color:var(--ink);
      font-weight:800;
    }
    table.extra-export-table--decision{
      font-size:.89rem;
    }
    table.extra-export-table--decision th,
    table.extra-export-table--decision td{
      padding:9px 10px;
    }
    table.extra-export-table--decision th:nth-child(1),
    table.extra-export-table--decision td:nth-child(1){
      width:18%;
    }
    table.extra-export-table--decision th:nth-child(2),
    table.extra-export-table--decision td:nth-child(2){
      width:18%;
    }
    table.extra-export-table--decision th:nth-child(3),
    table.extra-export-table--decision td:nth-child(3){
      width:14%;
    }
    table.extra-export-table--decision th:nth-child(4),
    table.extra-export-table--decision td:nth-child(4){
      width:10%;
      text-align:center;
    }
    table.extra-export-table--decision th:nth-child(5),
    table.extra-export-table--decision td:nth-child(5){
      width:40%;
    }
    .body-copy{
      border-color:#dfe8e2;
      background:#fbfdfb;
      padding:14px 16px;
      line-height:1.58;
    }
    table.extra-export-table--kv td:first-child{
      width:28%;
      color:var(--muted);
      font-weight:650;
    }

    table.extra-export-table--physical-security-tool-notes th:nth-child(1),
    table.extra-export-table--physical-security-tool-notes td:nth-child(1){
      width:18%;
    }
    table.extra-export-table--physical-security-tool-notes th:nth-child(2),
    table.extra-export-table--physical-security-tool-notes td:nth-child(2){
      width:18%;
    }
    table.extra-export-table--physical-security-tool-notes th:nth-child(3),
    table.extra-export-table--physical-security-tool-notes td:nth-child(3){
      width:64%;
      max-width:0;
      overflow-wrap:anywhere;
      word-break:break-word;
    }
    .grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:18px;
    }
    .grid.grid--stacked{
      grid-template-columns:1fr;
    }
    table{
      width:100%;
      border-collapse:collapse;
      border:1px solid var(--line);
      border-radius:14px;
      overflow:hidden;
      font-size:.95rem;
    }
    th,td{
      padding:11px 12px;
      border-bottom:1px solid var(--line);
      vertical-align:top;
    }
    th{
      text-align:left;
      background:#f7faf8;
      font-size:.82rem;
      text-transform:uppercase;
      letter-spacing:.06em;
    }
    tr:last-child td{border-bottom:none}
    td:first-child{
      width:42%;
      color:var(--muted);
    }
    td:last-child{
      font-weight:700;
      text-align:left;
    }
    .assumptions{
      margin:0;
      padding-left:18px;
      line-height:1.7;
    }
    .chart-wrap{
      border:1px solid var(--line);
      border-radius:14px;
      background:#fff;
      padding:18px;
      text-align:center;
    }
    .chart-wrap img{
      max-width:100%;
      height:auto;
      display:inline-block;
    }
    .extra-svg-wrap{
      border:1px solid var(--line);
      border-radius:14px;
      background:#07110b;
      padding:18px;
      text-align:center;
      margin:12px 0 14px;
      overflow:hidden;
    }
    .extra-svg-wrap svg{
      max-width:100%;
      height:auto;
      display:block;
      margin:0 auto;
    }
    .foot{
      margin-top:28px;
      color:var(--muted);
      font-size:.85rem;
      border-top:1px solid var(--line);
      padding-top:12px;
    }
    @media(max-width:760px){
      .grid{grid-template-columns:1fr}
      .report-head{flex-direction:column}
      .report{padding:22px 18px}
    }
    @media print{
      body{background:#fff}
      .page{max-width:none;border:none;box-shadow:none}
      .toolbar{display:none !important}
      .report{padding:.18in .28in .24in}

      .extra-svg-wrap,
      .extra-svg-wrap.print-low-ink-sentinel{
        background:#fff !important;
        border:1px solid var(--line) !important;
        padding:10px !important;
        box-shadow:none !important;
      }
      .extra-svg-wrap svg{
        filter:invert(1) hue-rotate(180deg) saturate(.75) contrast(1.15) !important;
      }
}

    /* data-scopedlabs-wide-compact-svg-contract */
    .section--compact-svg,
    .section:has(.extra-svg-wrap--compact){
      width:100% !important;
      max-width:100% !important;
      margin:10px 0 14px !important;
      padding:8px 10px !important;
      box-sizing:border-box !important;
    }

    .section--compact-svg h2,
    .section:has(.extra-svg-wrap--compact) h2{
      margin-top:0 !important;
    }

    .extra-svg-wrap--compact{
      width:100% !important;
      max-width:none !important;
      margin:0 auto !important;
      padding:0 !important;
      box-sizing:border-box !important;
      break-inside:avoid;
      page-break-inside:avoid;
    }

    .extra-svg-wrap--compact svg{
      width:100% !important;
      max-width:100% !important;
      height:auto !important;
      max-height:6.35in !important;
      display:block !important;
      margin:0 auto !important;
      object-fit:contain;
    }

    @media print{
      .section--compact-svg,
      .section:has(.extra-svg-wrap--compact){
        width:100% !important;
        max-width:none !important;
        margin:0 0 10px !important;
        padding:4px 8px !important;
        break-inside:avoid;
        page-break-inside:avoid;
      }

      .extra-svg-wrap--compact svg{
        width:100% !important;
        max-width:100% !important;
        max-height:6.25in !important;
      }
    }
</style>
</head>
<body>
  <div class="page">
    <div class="toolbar">
      <button type="button" onclick="window.print()">Print / Save PDF</button>
      <button type="button" onclick="window.close()">Close</button>
    </div>

    <div class="report">
      <div class="brand-row">
        <img src="${escapeHtml(state.options.logoUrl)}" alt="">
        <div class="brand-name">${escapeHtml(state.options.siteName)}</div>
      </div>
      <div class="tagline">${escapeHtml(state.options.siteTagline)}</div>

      <div class="report-head">
        <div>
          <h1 class="report-title">${escapeHtml(payload.meta?.reportTitle || payload.tool || "ScopedLabs Report")}</h1>
          <div class="report-meta">
            <div><strong>Category:</strong> ${escapeHtml(payload.category || "")}</div>
            <div><strong>Tool:</strong> ${escapeHtml(payload.tool || "")}</div>
            <div><strong>Generated:</strong> ${escapeHtml(formatDateTime(payload.generatedAt || ""))}</div>
            <div><strong>Report ID:</strong> ${escapeHtml(payload.reportId || "")}</div>
          </div>
        </div>
        ${headerStatusPillBlock}
      </div>

      ${suppressedProjectDetailsBlock}
      ${standardSummaryBlock}
      ${standardInputsOutputsBlock}
      ${extraSectionsBlock}
      ${interpretationBlock}
      ${additionalAnalysisBlock}
      ${chartBlock}
      ${notesBlock}

      <section class="section">
        <h2>Assumptions</h2>
        <div class="body-copy"><ul class="assumptions">${assumptions}</ul></div>
      </section>

      <section class="section">
        <h2>Disclaimer</h2>
        <div class="body-copy">${escapeHtml(state.options.disclaimer)}</div>
      </section>

      <div class="foot">
        ${escapeHtml(state.options.siteName)} Pro export for internal and client-facing documentation workflows.
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  function openReportWindow(payload) {
    try {
      const html = buildReportHTML(payload);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");

      if (!win) return false;

      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    } catch (err) {
      console.error("ScopedLabs export report open failed:", err);
      return false;
    }
  }

  function refresh(message) {
    const unlocked = hasExportAccess();
    const ready = hasUsableResults();

    setButtonsEnabled(unlocked && ready);

    if (message !== undefined) {
      setStatus(message);
      return;
    }

    if (!unlocked) {
      setStatus(`${state.options.categoryLabel} export is available with category unlock.`);
      return;
    }

    if (!ready) {
      setStatus("Run the calculator to enable export.");
      return;
    }

    setStatus(state.options.readyStatusMessage || "Calculation ready. Open Export Report or Save Snapshot.");
  }

  function invalidate(message = "Inputs changed. Run the calculator again to refresh export.") {
    setButtonsEnabled(false);
    setStatus(message);
  }

  function bindEvents() {
    const exportBtn = $(state.options.exportButtonSelector);
    const snapshotBtn = $(state.options.snapshotButtonSelector);
    const resultEl = $(state.options.resultSelector);
    const inputContainer = $(state.options.inputContainerSelector);

    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        if (!hasExportAccess()) {
          refresh(`${state.options.categoryLabel} export is available with category unlock.`);
          return;
        }

        const payload = buildPayload();

        if (!payload) {
          refresh("Run the calculator before exporting a report.");
          return;
        }

        const ok = openReportWindow(payload);
        refresh(ok ? "Export report opened in a new tab." : "Popup blocked or export failed.");
      });
    }

        if (snapshotBtn) {
      snapshotBtn.addEventListener("click", async () => {
        if (!hasExportAccess()) {
          refresh(`${state.options.categoryLabel} export is available with category unlock.`);
          return;
        }

        const payload = buildPayload();

        if (!payload) {
          refresh("Run the calculator before saving a snapshot.");
          return;
        }

        setButtonsEnabled(false);
        setStatus("Saving snapshot...");

        try {
          const result = await withTimeout(saveSnapshot(payload), 12000, {
            ok: false,
            mode: "timeout",
            reason: "save_timeout",
            localCount: 0
          });

          if (result.ok && result.mode === "account") {
            refresh("Snapshot saved to your account.");
            return;
          }

          if (result.reason === "not_signed_in") {
            refresh(`Saved locally. Sign in to save snapshots to your account. ${result.localCount} local snapshot${result.localCount === 1 ? "" : "s"} stored for this tool.`);
            return;
          }

          if (result.reason === "save_timeout") {
            refresh("Snapshot save timed out. Refresh the page after signing in and try again.");
            return;
          }

          refresh(`Account save failed; saved locally as fallback. ${result.localCount} local snapshot${result.localCount === 1 ? "" : "s"} stored for this tool.`);
        } catch (err) {
          console.warn("ScopedLabs snapshot save failed:", err);
          refresh("Snapshot save failed. Refresh the page and try again.");
        }
      });
    }

    if (inputContainer && state.options.invalidateOnInput !== false) {
      inputContainer.addEventListener("input", () => invalidate());
      inputContainer.addEventListener("change", () => invalidate());
    }

    [
      state.options.reportTitleSelector,
      state.options.projectNameSelector,
      state.options.clientNameSelector,
      state.options.preparedBySelector,
      state.options.customNotesSelector
    ].forEach((selector) => {
      const field = $(selector);
      if (!field) return;

      field.addEventListener("input", () => {
        if (!hasUsableResults()) return;
        refresh("Export details updated.");
      });
    });

    if (resultEl && typeof MutationObserver !== "undefined") {
      state.observer = new MutationObserver(() => {
        refresh();
      });

      state.observer.observe(resultEl, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }

  function init(options = {}) {
    if (state.initialized) return;

    state.options = mergeOptions({
      ...(window.ScopedLabsExportConfig || {}),
      ...options
    });

    const exportBtn = $(state.options.exportButtonSelector);
    const snapshotBtn = $(state.options.snapshotButtonSelector);

    if (!exportBtn && !snapshotBtn) return;

    state.initialized = true;
    bindEvents();
    refresh();
  }

  window.ScopedLabsExport = {
    init,
    refresh,
    invalidate,
    buildPayload,
    openReportWindow,
    saveSnapshot,
    saveSnapshotLocal,
    getResultRows,
    getInputRows,
    getExtraExportSections
  };

  window.addEventListener("DOMContentLoaded", () => {
    init();
  });
})();