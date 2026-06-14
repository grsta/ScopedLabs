(function () {
  "use strict";

  const VERSION = "scopedlabs-report-metadata-008-access-control-category-scope-key";
  const SHARED_STORAGE_KEY = "scopedlabs:report-metadata:shared:v1";
  const PAGE_STORAGE_PREFIX = "scopedlabs:report-metadata:page:";
  const SHARED_FIELDS = ["reportTitle", "projectName", "clientName", "preparedBy"];
  const PAGE_FIELDS = ["reportTitle", "projectName", "clientName", "preparedBy", "customNotes"];
  const PAGE_ONLY_FIELDS = ["customNotes"];
  const DEFAULT_FIELDS = PAGE_FIELDS.slice();

  const FIELD_DEFS = {
    reportTitle: {
      id: "reportTitle",
      label: "Report Title",
      type: "text",
      placeholder: "Access Control Scope Assessment"
    },
    projectName: {
      id: "projectName",
      label: "Project Name",
      type: "text",
      placeholder: "Project Name"
    },
    clientName: {
      id: "clientName",
      label: "Client Name",
      type: "text",
      placeholder: "Client / Site Name"
    },
    preparedBy: {
      id: "preparedBy",
      label: "Prepared By",
      type: "text",
      placeholder: "Name or Team"
    },
    customNotes: {
      id: "customNotes",
      label: "Custom Notes",
      type: "textarea",
      placeholder: "Optional notes, assumptions, workload details, or design caveats to include in the report.",
      full: true
    }
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function storageStores() {
    const stores = [];

    try {
      if (window.sessionStorage) stores.push(window.sessionStorage);
    } catch {}

    try {
      if (window.localStorage) stores.push(window.localStorage);
    } catch {}

    return stores;
  }

  function storageAvailable() {
    try {
      const testKey = "scopedlabs:report-metadata:test";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  function safeParse(value) {
    if (!value) return {};

    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function normalizedPagePath() {
    return String(window.location && window.location.pathname || "").replace(/\/+$/, "/") || "/";
  }

  function readBrowserStore(key) {
    for (const storage of storageStores()) {
      try {
        const parsed = safeParse(storage.getItem(key));
        if (parsed && Object.keys(parsed).length) return parsed;
      } catch {}
    }

    return {};
  }

  function readBrowserText(key) {
    for (const storage of storageStores()) {
      try {
        const value = storage.getItem(key);
        if (value) return value;
      } catch {}
    }

    return "";
  }

  function loadStored(key) {
    if (!storageAvailable()) return {};

    try {
      return safeParse(window.localStorage.getItem(key));
    } catch {
      return {};
    }
  }

  function saveStored(key, value) {
    if (!storageAvailable()) return;

    try {
      window.localStorage.setItem(key, JSON.stringify({
        ...value,
        updatedAt: new Date().toISOString()
      }));
    } catch {}
  }

  function physicalSecurityToolSlug(pagePath = normalizedPagePath()) {
    const match = String(pagePath || "").match(/\/tools\/physical-security\/([^/]+)\//i);
    return match ? match[1] : "";
  }

  function shouldScopeNotesToActiveArea(pagePath = normalizedPagePath()) {
    const slug = physicalSecurityToolSlug(pagePath);
    return !!slug && slug !== "summary" && slug !== "area-planner";
  }

  function normalizeAreaContext(area) {
    if (!area || typeof area !== "object") return null;

    const areaId = String(area.id || area.areaId || "").trim();
    const areaName = String(area.name || area.areaName || "").trim();
    const areaType = String(area.areaType || area.type || "").trim();

    if (!areaId && !areaName) return null;

    const scopeLabel = areaName
      ? areaName + (areaType ? " (" + areaType + ")" : "")
      : areaId;

    return {
      areaId,
      areaName: areaName || areaId || "Area / Zone",
      areaType: areaType || "Area / Zone",
      scopeLabel,
      areaScoped: true
    };
  }

  function currentAreaContext() {
    if (!shouldScopeNotesToActiveArea()) return null;

    try {
      const api = window.ScopedLabsPhysicalSecurityAreaState;
      if (api && typeof api.getActiveArea === "function") {
        const active = normalizeAreaContext(api.getActiveArea());
        if (active) return active;
      }
    } catch {}

    const ledger = readBrowserStore("scopedlabs:pipeline:physical-security:areas");
    const areas = Array.isArray(ledger.areas) ? ledger.areas : [];
    const activeId = String(ledger.activeAreaId || "").trim() ||
      String(readBrowserText("scopedlabs:pipeline:physical-security:active-area") || "").trim();

    const active = areas.find((area) => String(area && area.id) === activeId) || areas[0] || null;

    return normalizeAreaContext(active);
  }

  function isAccessControlMetadataPage(pagePath = normalizedPagePath()) {
    return /\/tools\/access-control\//i.test(String(pagePath || "")) ||
      String(document.body && document.body.dataset && document.body.dataset.category || "").toLowerCase() === "access-control";
  }

  function readAccessControlScopeLedger() {
    try {
      const api = window.ScopedLabsAccessControlScopeState;
      if (api && typeof api.readLedger === "function") {
        const ledger = api.readLedger();
        if (ledger && Array.isArray(ledger.scopes)) return ledger;
      }
    } catch {}

    const parsed = readBrowserStore("scopedlabs:pipeline:access-control:scopes");

    return parsed && Array.isArray(parsed.scopes)
      ? parsed
      : { activeScopeId: null, scopes: [] };
  }

  function accessControlSelectedScopeId(ledger) {
    const scopes = Array.isArray(ledger && ledger.scopes) ? ledger.scopes : [];
    const ids = new Set(scopes.map((scope) => String(scope && scope.id || "").trim()).filter(Boolean));

    const keys = [
      "scopedlabs:access-control:summary:report-scope-mode",
      "scopedlabs:access-control:summary:selected-scope-id",
      "scopedlabs:pipeline:access-control:active-scope"
    ];

    for (const key of keys) {
      const value = String(readBrowserText(key) || "").trim();
      if (value && value !== "__all__" && ids.has(value)) return value;
    }

    const activeScopeId = String((ledger && ledger.activeScopeId) || "").trim();

    if (activeScopeId && ids.has(activeScopeId)) return activeScopeId;

    return scopes[0] ? String(scopes[0].id || "").trim() : "";
  }

  function normalizeAccessControlScopeContext(scope) {
    if (!scope || typeof scope !== "object") return null;

    const accessControlScopeId = String(scope.id || scope.scopeId || "").trim();
    const scopeName = String(scope.name || scope.scopeName || scope.label || scope.title || "").trim();
    const scopeType = String(scope.scopeType || scope.type || "").trim();

    if (!accessControlScopeId && !scopeName) return null;

    const scopeLabel = scopeName
      ? scopeName + (scopeType ? " (" + scopeType + ")" : "")
      : accessControlScopeId;

    return {
      accessControlScopeId,
      scopeId: accessControlScopeId,
      scopeName: scopeName || accessControlScopeId || "Access Scope",
      scopeType: scopeType || "Access Scope",
      scopeLabel,
      accessControlScoped: true
    };
  }

  function currentAccessControlScopeContext() {
    if (!isAccessControlMetadataPage()) return null;

    const ledger = readAccessControlScopeLedger();
    const scopes = Array.isArray(ledger && ledger.scopes) ? ledger.scopes : [];
    const selectedId = accessControlSelectedScopeId(ledger);

    const selected = scopes.find((scope) => String(scope && scope.id || "").trim() === selectedId) || null;

    return normalizeAccessControlScopeContext(selected);
  }

  function currentMetadataContext() {
    return currentAccessControlScopeContext() || currentAreaContext();
  }

  function isAccessControlMetadataBlocked() {
    return isAccessControlMetadataPage() && !currentAccessControlScopeContext();
  }


  function accessControlCategoryMetadataKey() {
    return PAGE_STORAGE_PREFIX + "/tools/access-control/";
  }


  function legacyPageStorageKey() {
    return PAGE_STORAGE_PREFIX + normalizedPagePath();
  }

  function pageStorageKey() {
    const legacyKey = legacyPageStorageKey();

    if (isAccessControlMetadataPage()) {
      const scope = currentAccessControlScopeContext();
      const categoryKey = accessControlCategoryMetadataKey();

      if (!scope || !scope.accessControlScopeId) {
        return categoryKey + "#access-scope:none";
      }

      return categoryKey + "#access-scope:" + encodeURIComponent(scope.accessControlScopeId);
    }

    const area = currentAreaContext();

    if (!area || !area.areaId) return legacyKey;

    return legacyKey + "#area:" + encodeURIComponent(area.areaId);
  }

  function getControl(root, field) {
    const def = FIELD_DEFS[field];
    return def && def.id ? root.querySelector("#" + def.id) : null;
  }

  function currentValues(root = document) {
    const values = {};

    PAGE_FIELDS.forEach((field) => {
      values[field] = String(getControl(root, field)?.value || "").trim();
    });

    return values;
  }

  function saveCurrent(root = document) {
    const values = currentValues(root);
    const scope = currentMetadataContext();
    const accessControlPage = isAccessControlMetadataPage();

    if (accessControlPage && !scope) {
      document.dispatchEvent(new CustomEvent("scopedlabs:report-metadata-saved", {
        detail: {
          version: VERSION,
          values: {},
          scope: null,
          accessControlBlocked: true,
          sharedFields: SHARED_FIELDS.slice(),
          pageOnlyFields: PAGE_ONLY_FIELDS.slice()
        }
      }));
      return;
    }

    const key = pageStorageKey();
    const pageData = {
      ...loadStored(key),
      sourcePath: normalizedPagePath(),
      areaScoped: !!(scope && scope.areaScoped),
      accessControlScoped: !!(scope && scope.accessControlScoped)
    };

    if (scope && scope.areaScoped) {
      pageData.areaId = scope.areaId || "";
      pageData.areaName = scope.areaName || "";
      pageData.areaType = scope.areaType || "";
      pageData.scopeLabel = scope.scopeLabel || "";
    }

    if (scope && scope.accessControlScoped) {
      pageData.accessControlScopeId = scope.accessControlScopeId || "";
      pageData.scopeId = scope.scopeId || scope.accessControlScopeId || "";
      pageData.scopeName = scope.scopeName || "";
      pageData.scopeType = scope.scopeType || "";
      pageData.scopeLabel = scope.scopeLabel || "";
    }

    PAGE_FIELDS.forEach((field) => {
      pageData[field] = values[field] || "";
    });

    saveStored(key, pageData);

    if (!accessControlPage) {
      const sharedData = {
        ...loadStored(SHARED_STORAGE_KEY),
        sourcePath: normalizedPagePath()
      };

      SHARED_FIELDS.forEach((field) => {
        sharedData[field] = values[field] || "";
      });

      saveStored(SHARED_STORAGE_KEY, sharedData);
    }

    document.dispatchEvent(new CustomEvent("scopedlabs:report-metadata-saved", {
      detail: {
        version: VERSION,
        values,
        scope,
        accessControlScoped: !!(scope && scope.accessControlScoped),
        sharedFields: SHARED_FIELDS.slice(),
        pageOnlyFields: PAGE_ONLY_FIELDS.slice()
      }
    }));
  }

  function loadPageData() {
    const scopedKey = pageStorageKey();
    const legacyKey = legacyPageStorageKey();

    if (isAccessControlMetadataPage()) {
      if (isAccessControlMetadataBlocked()) {
        return {
          scopedKey,
          legacyKey,
          scoped: {},
          legacy: {},
          shared: {},
          accessControlScoped: true,
          accessControlBlocked: true
        };
      }

      return {
        scopedKey,
        legacyKey,
        scoped: loadStored(scopedKey),
        legacy: {},
        shared: {},
        accessControlScoped: true,
        accessControlBlocked: false
      };
    }

    return {
      scopedKey,
      legacyKey,
      scoped: loadStored(scopedKey),
      legacy: scopedKey === legacyKey ? {} : loadStored(legacyKey),
      shared: loadStored(SHARED_STORAGE_KEY),
      accessControlScoped: false,
      accessControlBlocked: false
    };
  }

  function hydrateControls(root = document) {
    const pageData = loadPageData();
    const accessControlPage = isAccessControlMetadataPage();
    const sharedData = accessControlPage ? {} : loadStored(SHARED_STORAGE_KEY);
    let hydrated = false;

    PAGE_FIELDS.forEach((field) => {
      const control = getControl(root, field);
      if (!control) return;

      if (accessControlPage) {
        const value = pageData.accessControlBlocked ? "" : (pageData.scoped[field] || "");

        if (String(control.value || "") !== String(value || "")) {
          control.value = value || "";
          hydrated = true;
        }

        return;
      }

      if (String(control.value || "").trim()) return;

      const scopedValue = pageData.scoped[field] || "";
      const legacyValue = pageData.legacy[field] || "";
      const sharedValue = SHARED_FIELDS.includes(field) ? sharedData[field] || "" : "";
      const value = scopedValue || legacyValue || sharedValue || "";

      if (!value) return;

      control.value = value;
      hydrated = true;
    });

    if (hydrated) {
      document.dispatchEvent(new CustomEvent("scopedlabs:report-metadata-hydrated", {
        detail: {
          version: VERSION,
          scope: currentMetadataContext(),
          accessControlBlocked: !!pageData.accessControlBlocked,
          sharedFields: SHARED_FIELDS.slice(),
          pageOnlyFields: PAGE_ONLY_FIELDS.slice()
        }
      }));
    }
  }

  function bindPersistence(root = document) {
    PAGE_FIELDS.forEach((field) => {
      const control = getControl(root, field);
      if (!control || control.dataset.scopedlabsReportMetadataPersistBound === "true") return;

      control.dataset.scopedlabsReportMetadataPersistBound = "true";

      control.addEventListener("input", () => saveCurrent(root));
      control.addEventListener("change", () => saveCurrent(root));
    });
  }

  function injectStyles() {
    if (document.getElementById("scopedlabs-report-metadata-styles")) return;

    const style = document.createElement("style");
    style.id = "scopedlabs-report-metadata-styles";
    style.textContent = [
      ".sl-report-meta{margin-top:14px;border:1px solid rgba(226,232,240,.12);border-radius:14px;background:rgba(255,255,255,.035);overflow:hidden;}",
      ".sl-report-meta summary{cursor:pointer;list-style:none;padding:13px 15px;display:flex;align-items:center;justify-content:space-between;gap:12px;color:rgba(246,255,248,.94);font-weight:850;}",
      ".sl-report-meta summary::-webkit-details-marker{display:none;}",
      ".sl-report-meta summary::after{content:'+';width:24px;height:24px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;background:rgba(125,255,152,.11);color:rgba(125,255,152,.92);font-weight:950;}",
      ".sl-report-meta[open] summary::after{content:'-';}",
      ".sl-report-meta-copy{margin:-4px 15px 12px;color:rgba(226,232,240,.62);font-size:.92rem;line-height:1.45;}",
      ".sl-report-meta-grid{display:grid;gap:14px;grid-template-columns:repeat(2,minmax(0,1fr));padding:0 15px 15px;}",
      ".sl-report-meta-grid .field.full{grid-column:1 / -1;}",
      "@media (max-width:860px){.sl-report-meta-grid{grid-template-columns:1fr;}}"
    ].join("\n");

    document.head.appendChild(style);
  }

  function parseFields(value) {
    const fields = String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return fields.length ? fields : DEFAULT_FIELDS.slice();
  }

  function fieldHtml(key, overrides = {}) {
    const def = {
      ...(FIELD_DEFS[key] || {}),
      ...(overrides[key] || {})
    };

    if (!def.id || !def.label) return "";

    const fullClass = def.full || def.type === "textarea" ? " full" : "";
    const placeholder = escapeHtml(def.placeholder || "");

    if (def.type === "textarea") {
      return "" +
        "<label class=\"field" + fullClass + "\">" +
          "<span>" + escapeHtml(def.label) + "</span>" +
          "<textarea id=\"" + escapeHtml(def.id) + "\" placeholder=\"" + placeholder + "\"></textarea>" +
        "</label>";
    }

    return "" +
      "<label class=\"field" + fullClass + "\">" +
        "<span>" + escapeHtml(def.label) + "</span>" +
        "<input id=\"" + escapeHtml(def.id) + "\" type=\"" + escapeHtml(def.type || "text") + "\" placeholder=\"" + placeholder + "\">" +
      "</label>";
  }

  // scopedlabs-report-metadata-007-active-scope-label
  function currentMetadataScopeLabel() {
    const scope = currentMetadataContext();

    if (!scope) return "";

    if (scope.accessControlScoped) {
      return String(scope.scopeName || scope.scopeLabel || scope.accessControlScopeId || "").trim();
    }

    if (scope.areaScoped) {
      return String(scope.areaName || scope.scopeLabel || scope.areaId || "").trim();
    }

    return String(scope.scopeLabel || "").trim();
  }

  function refreshMetadataScopeLabels(root = document) {
    const label = currentMetadataScopeLabel();

    Array.from(root.querySelectorAll("[data-report-metadata-scope-label]")).forEach((node) => {
      node.textContent = label || "No active scope selected";
      node.dataset.metadataScopeStatus = label ? "active" : "missing";
    });

    Array.from(root.querySelectorAll("[data-report-metadata-scope-card]")).forEach((node) => {
      node.dataset.metadataScopeStatus = label ? "active" : "missing";
    });
  }

function renderMount(mount, options = {}) {
    if (!mount) return null;

    injectStyles();

    const fields = options.fields || parseFields(mount.dataset.reportFields);
    const title = options.title || mount.dataset.reportTitle || "Report details";
    const copy = options.copy || mount.dataset.reportCopy || "Optional metadata can be included in the generated report. Leave blank to use the default report naming.";
    const collapsed = String(options.collapsed ?? mount.dataset.collapsed ?? "true").toLowerCase() !== "false";
    const overrides = options.fieldOverrides || {};

    const details = document.createElement("details");
    details.className = "sl-report-meta";
    details.dataset.reportMetadataRendered = "true";

    if (!collapsed) details.open = true;

    details.innerHTML = "" +
      "<summary>" + escapeHtml(title) + "</summary>" +
      "<p class=\"sl-report-meta-copy\">" + escapeHtml(copy) + "</p>" +
      "<div class=\"sl-report-meta-grid\">" +
        fields.map((field) => fieldHtml(field, overrides)).join("") +
      "</div>";

    mount.innerHTML = "";
    mount.appendChild(details);
    mount.dataset.reportMetadataReady = "true";

    hydrateControls(document);
    bindPersistence(document);

    document.dispatchEvent(new CustomEvent("scopedlabs:report-metadata-ready", {
      detail: {
        version: VERSION,
        mount,
        fields,
        scope: currentMetadataContext(),
        sharedFields: SHARED_FIELDS.slice(),
        pageOnlyFields: PAGE_ONLY_FIELDS.slice()
      }
    }));

    return details;
  }

  function init(root = document) {
    const mounts = Array.from(root.querySelectorAll("[data-report-metadata]"));

    mounts.forEach((mount) => {
      if (mount.dataset.reportMetadataReady === "true") return;
      renderMount(mount);
    });

    refreshMetadataScopeLabels(root);
    hydrateControls(root);
    bindPersistence(root);
  }

  function read(root = document) {
    return currentValues(root);
  }

  function rehydrateOnMetadataContextChange() {
    refreshMetadataScopeLabels(document);
    hydrateControls(document);
  }

  window.addEventListener("scopedlabs:access-control-scope-updated", rehydrateOnMetadataContextChange);
  window.addEventListener("scopedlabs:access-control-scope-view-changed", rehydrateOnMetadataContextChange);
  window.addEventListener("scopedlabs:access-control-report-scope-changed", rehydrateOnMetadataContextChange);

  window.ScopedLabsReportMetadata = {
    version: VERSION,
    fields: FIELD_DEFS,
    sharedFields: SHARED_FIELDS.slice(),
    pageOnlyFields: PAGE_ONLY_FIELDS.slice(),
    sharedStorageKey: SHARED_STORAGE_KEY,
    pageStoragePrefix: PAGE_STORAGE_PREFIX,
    currentAreaContext,
    currentAccessControlScopeContext,
    currentMetadataContext,
    currentMetadataScopeLabel,
    refreshMetadataScopeLabels,
    pageStorageKey,
    legacyPageStorageKey,
    init,
    render: renderMount,
    read,
    hydrate: hydrateControls,
    save: saveCurrent
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }
})();

/* data-scopedlabs-report-metadata-title-defaults-v003
   Keeps compact report metadata defaults scoped to the current tool.
*/
(function () {
  function currentToolAssessmentTitle() {
    var cfg = window.ScopedLabsExportConfig || {};
    var label = String(cfg.toolLabel || "").trim();

    if (!label) {
      var h1 = document.querySelector("h1");
      label = h1 ? String(h1.textContent || "").trim() : "";
    }

    if (!label) label = "ScopedLabs Report";

    return /assessment$/i.test(label) ? label : label + " Assessment";
  }

  function applyReportTitleDefault() {
    var input = document.getElementById("reportTitle");
    if (!input) return;

    var title = currentToolAssessmentTitle();
    var wrongDefault = /Camera\s+Spacing\s+Planner\s+Assessment/i;

    if (!input.placeholder || wrongDefault.test(input.placeholder)) {
      input.placeholder = title;
    }

    if (wrongDefault.test(String(input.value || ""))) {
      input.value = title;
    }

    if (wrongDefault.test(String(input.defaultValue || ""))) {
      input.defaultValue = title;
    }
  }

  function run() {
    applyReportTitleDefault();

    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(applyReportTitleDefault);
    }

    window.setTimeout(applyReportTitleDefault, 80);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
