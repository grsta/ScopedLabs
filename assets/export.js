(() => {
  "use strict";

  const DEFAULTS = {
    siteName: "ScopedLabs",
    siteTagline: "Engineering · Analysis · Tools",
    logoUrl: "https://scopedlabs.com/assets/favicon/favicon-32x32.png?v=1",
    resultSelector: "#results",
    extraSectionSelector: "[data-export-section]",
    inputContainerSelector: "#toolCard .form-grid",
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
    enableOnProPages: true
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

  function hasUsableResults() {
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


  function readExtraTable(table) {
    if (!table) return null;

    const headerCells = Array.from(
      table.querySelectorAll("thead tr:first-child th, thead tr:first-child td")
    ).map((cell) => String(cell.textContent || "").replace(/\s+/g, " ").trim());

    let bodyRows = Array.from(table.querySelectorAll("tbody tr")).map((row) => {
      return Array.from(row.children).map((cell) => {
        return String(cell.textContent || "").replace(/\s+/g, " ").trim();
      });
    });

    if (!bodyRows.length) {
      const allRows = Array.from(table.querySelectorAll("tr")).map((row) => {
        return Array.from(row.children).map((cell) => {
          return String(cell.textContent || "").replace(/\s+/g, " ").trim();
        });
      });

      bodyRows = headerCells.length ? allRows.slice(1) : allRows;
    }

    const rows = bodyRows.filter((row) => row.some(Boolean));

    if (!rows.length) return null;

    return {
      headers: headerCells.filter(Boolean),
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

      const title =
        node.dataset?.exportTitle ||
        node.getAttribute("aria-label") ||
        node.querySelector("h2, h3, h4")?.textContent?.trim() ||
        "Additional Output";

      const tables = Array.from(node.querySelectorAll("table"))
        .map(readExtraTable)
        .filter(Boolean);

      const textNodes = Array.from(
        node.querySelectorAll("[data-export-text], .export-text")
      )
        .map((el) => String(el.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean);

      const text = textNodes.join("\n\n");

      if (!tables.length && !text) continue;

      sections.push({
        title,
        tables,
        text
      });
    }

    return sections;
  }

  function renderExtraExportSections(sections = []) {
    return sections.map((section) => {
      const textBlock = section.text
        ? `<div class="body-copy">${escapeHtml(section.text).replace(/\n/g, "<br>")}</div>`
        : "";

      const tableBlocks = (section.tables || []).map((table) => {
        const headers = (table.headers || []).length
          ? table.headers
          : ((table.rows || [])[0] || []).map((_, index) => `Column ${index + 1}`);

        const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");

        const rowHtml = (table.rows || []).map((row) => `
          <tr>
            ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
          </tr>
        `).join("");

        return `
          <table>
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${rowHtml}</tbody>
          </table>
        `;
      }).join("");

      return `
        <section class="section">
          <h2>${escapeHtml(section.title)}</h2>
          ${textBlock}
          ${tableBlocks}
        </section>
      `;
    }).join("");
  }

  function buildPayload() {
    const outputs = getResultRows();

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

      const additionalAnalysisBlock = (payload.analysisSections || [])
  .filter((section) => {
    return normalizeSlug(section.title) !== normalizeSlug("Engineering Interpretation");
  })
  .map((section) => `
    <section class="section">
      <h2>${escapeHtml(section.title)}</h2>
      <div class="body-copy">${escapeHtml(section.body)}</div>
    </section>
  `)
  .join("");

    const statusClass = String(payload.status || "").toLowerCase();

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(payload.meta?.reportTitle || payload.tool || "ScopedLabs Report")} • ${escapeHtml(state.options.siteName)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root{
      --ink:#101715;
      --muted:#52615c;
      --line:#d7e2db;
      --soft:#f5f8f6;
      --accent:#1d8f55;
      --accent-soft:#eaf7f0;
      --watch:#a66d00;
      --watch-soft:#fff6df;
      --risk:#b42318;
      --risk-soft:#fff0ee;
    }
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:#eef2ef;color:var(--ink);font-family:Inter, Arial, sans-serif}
    body{padding:28px}
    .page{
      max-width:980px;
      margin:0 auto;
      background:#fff;
      border:1px solid var(--line);
      box-shadow:0 18px 50px rgba(0,0,0,.08);
    }
    .toolbar{
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
      border-radius:999px;
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
      border-radius:999px;
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
    .grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:18px;
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
    .foot{
      margin-top:26px;
      padding-top:16px;
      border-top:1px solid var(--line);
      color:var(--muted);
      font-size:.9rem;
      line-height:1.7;
    }
    @media (max-width:760px){
      body{padding:14px}
      .report{padding:20px}
      .report-head{flex-direction:column}
      .grid{grid-template-columns:1fr}
    }
    @media print{
      body{background:#fff;padding:0}
      .page{max-width:none;border:none;box-shadow:none}
      .toolbar{display:none !important}
      .report{padding:0}
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
        <div class="status-pill ${statusClass}">${escapeHtml(payload.status || "")}</div>
      </div>

      <section class="section">
        <h2>Executive Summary</h2>
        <div class="summary">
          ${escapeHtml(payload.summary || "")}
          <div class="project-details">${projectDetails}</div>
        </div>
      </section>

      <section class="section">
        <div class="grid">
          <div>
            <h2>Inputs</h2>
            <table>
              <thead><tr><th>Input</th><th>Value</th></tr></thead>
              <tbody>${inputRows}</tbody>
            </table>
          </div>
          <div>
            <h2>Calculated Outputs</h2>
            <table>
              <thead><tr><th>Output</th><th>Value</th></tr></thead>
              <tbody>${outputRows}</tbody>
            </table>
          </div>
        </div>
      </section>

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

    setStatus("Calculation ready. Open Export Report or Save Snapshot.");
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

    if (inputContainer) {
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