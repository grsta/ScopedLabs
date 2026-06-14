(function () {
  "use strict";

  const VERSION = "access-control-user-tool-notes-002-export-card-placement";
  const CATEGORY = "access-control";
  const STORAGE_PREFIX = "scopedlabs:access-control:user-tool-notes:";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeParse(value) {
    if (!value) return null;

    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function storageStores() {
    const stores = [];

    try {
      if (window.localStorage) stores.push(window.localStorage);
    } catch (_) {}

    try {
      if (window.sessionStorage) stores.push(window.sessionStorage);
    } catch (_) {}

    return stores;
  }

  function storageKeys(storage) {
    const keys = [];

    if (!storage) return keys;

    try {
      for (let i = 0; i < storage.length; i += 1) keys.push(storage.key(i));
    } catch (_) {}

    return keys.filter(Boolean);
  }

  function readScopeLedger() {
    try {
      const api = window.ScopedLabsAccessControlScopeState;

      if (api && typeof api.readLedger === "function") {
        const ledger = api.readLedger();

        if (ledger && Array.isArray(ledger.scopes)) return ledger;
      }
    } catch (_) {}

    for (const store of storageStores()) {
      try {
        const parsed = safeParse(store.getItem("scopedlabs:pipeline:access-control:scopes"));

        if (parsed && Array.isArray(parsed.scopes)) return parsed;
      } catch (_) {}
    }

    return { activeScopeId: "", scopes: [] };
  }

  function currentScope() {
    const ledger = readScopeLedger();
    const scopes = Array.isArray(ledger.scopes) ? ledger.scopes : [];
    let activeScopeId = String(ledger.activeScopeId || "").trim();

    if (!activeScopeId) {
      try {
        activeScopeId = String(window.sessionStorage.getItem("scopedlabs:pipeline:access-control:active-scope") || "").trim();
      } catch (_) {}
    }

    const active = scopes.find((scope) => String(scope && scope.id || "").trim() === activeScopeId) || scopes[0] || null;

    if (!active || !active.id) return null;

    return {
      scopeId: String(active.id || "").trim(),
      scopeName: String(active.name || active.title || active.label || active.id || "").trim()
    };
  }

  function toolSlugFromPage() {
    const bodySlug = String(document.body && document.body.dataset && (document.body.dataset.tool || document.body.dataset.toolSlug) || "").trim();

    if (bodySlug && bodySlug !== CATEGORY) return bodySlug;

    const match = String(window.location && window.location.pathname || "").match(/\/tools\/access-control\/([^/]+)\//i);

    return match ? match[1] : "";
  }

  function storageKey(scopeId, toolSlug) {
    return STORAGE_PREFIX + encodeURIComponent(String(scopeId || "").trim()) + ":" + encodeURIComponent(String(toolSlug || "").trim());
  }

  function readRecord(scopeId, toolSlug) {
    const key = storageKey(scopeId, toolSlug);

    for (const store of storageStores()) {
      try {
        const parsed = safeParse(store.getItem(key));

        if (parsed && typeof parsed === "object") return parsed;
      } catch (_) {}
    }

    return null;
  }

  function saveRecord(record) {
    if (!record || !record.scopeId || !record.toolSlug) return null;

    const normalized = {
      category: CATEGORY,
      slug: String(record.toolSlug || "").trim(),
      toolSlug: String(record.toolSlug || "").trim(),
      tool: String(record.toolSlug || "").trim(),
      toolId: String(record.toolSlug || "").trim(),
      toolLabel: String(record.toolLabel || record.toolSlug || "").trim(),
      scopeId: String(record.scopeId || "").trim(),
      accessScopeId: String(record.scopeId || "").trim(),
      activeScopeId: String(record.scopeId || "").trim(),
      scopeName: String(record.scopeName || record.scopeId || "").trim(),
      userNotes: String(record.userNotes || record.notes || "").trim(),
      notes: String(record.userNotes || record.notes || "").trim(),
      reportNotes: String(record.userNotes || record.notes || "").trim(),
      customNotes: String(record.userNotes || record.notes || "").trim(),
      source: "access-control-user-tool-notes",
      updatedAt: new Date().toISOString()
    };

    const key = storageKey(normalized.scopeId, normalized.toolSlug);
    const text = JSON.stringify(normalized);

    for (const store of storageStores()) {
      try {
        store.setItem(key, text);
      } catch (_) {}
    }

    document.dispatchEvent(new CustomEvent("scopedlabs:access-control-user-tool-notes-saved", {
      detail: normalized
    }));

    return normalized;
  }

  function listRecords() {
    const byKey = new Map();

    for (const store of storageStores()) {
      for (const key of storageKeys(store)) {
        if (!String(key || "").startsWith(STORAGE_PREFIX)) continue;

        try {
          const parsed = safeParse(store.getItem(key));

          if (!parsed || !parsed.scopeId || !parsed.toolSlug) continue;

          const dedupeKey = String(parsed.toolSlug || "") + "::" + String(parsed.scopeId || "");
          const existing = byKey.get(dedupeKey);
          const existingTime = existing && existing.updatedAt ? Date.parse(existing.updatedAt) : 0;
          const parsedTime = parsed.updatedAt ? Date.parse(parsed.updatedAt) : 0;

          if (!existing || parsedTime >= existingTime) byKey.set(dedupeKey, parsed);
        } catch (_) {}
      }
    }

    return Array.from(byKey.values());
  }

  function injectStyles() {
    if (document.getElementById("access-control-user-tool-notes-styles")) return;

    const style = document.createElement("style");
    style.id = "access-control-user-tool-notes-styles";
    style.textContent = [
      ".access-control-user-tool-notes-inline{margin-top:1rem;border:1px solid rgba(140,255,170,.18);border-radius:.75rem;padding:.75rem 1rem;background:rgba(0,0,0,.14);}",
      ".access-control-user-tool-notes-inline summary{cursor:pointer;font-weight:700;color:var(--text,#f4fff7);}",
      ".access-control-user-tool-notes-inline textarea{min-height:92px;resize:vertical;}",
      ".access-control-user-tool-notes-scope{margin:.35rem 0 .75rem;color:var(--muted,#c9d6cf);font-size:.92rem;}",
      ".access-control-user-tool-notes-status{margin-top:.5rem;color:var(--muted,#c9d6cf);font-size:.86rem;}"
    ].join("\n");

    document.head.appendChild(style);
  }

  function renderMount(mount) {
    if (!mount || mount.dataset.accessControlUserToolNotesReady === "true") return;

    injectStyles();

    const scope = currentScope();
    const toolSlug = String(mount.dataset.toolSlug || toolSlugFromPage() || "").trim();
    const toolLabel = String(mount.dataset.toolLabel || document.querySelector("h1")?.textContent || toolSlug || "This tool").trim();

    mount.dataset.accessControlUserToolNotesReady = "true";

    if (!scope || !scope.scopeId || !toolSlug) {
      mount.innerHTML = "<p class='muted'>Select or create an Access Control scope before saving tool report notes.</p>";
      return;
    }

    const record = readRecord(scope.scopeId, toolSlug);
    const note = record ? String(record.userNotes || record.notes || "").trim() : "";

    mount.innerHTML =
      "<div class='access-control-user-tool-notes-scope'>Active scope: <strong>" + escapeHtml(scope.scopeName || scope.scopeId) + "</strong></div>" +
      "<label class='field full'>" +
        "<span>User Tool Notes / Report Notes</span>" +
        "<textarea data-access-control-user-tool-notes-input placeholder='Add user-entered report notes for " + escapeHtml(toolLabel) + " in this scope.'>" + escapeHtml(note) + "</textarea>" +
      "</label>" +
      "<div class='access-control-user-tool-notes-status' data-access-control-user-tool-notes-status>" + (note ? "Saved user note loaded for this scope." : "No user note saved for this scope yet.") + "</div>";

    const input = mount.querySelector("[data-access-control-user-tool-notes-input]");
    const status = mount.querySelector("[data-access-control-user-tool-notes-status]");

    function persist() {
      const saved = saveRecord({
        scopeId: scope.scopeId,
        scopeName: scope.scopeName,
        toolSlug,
        toolLabel,
        userNotes: input.value
      });

      if (status) status.textContent = saved && saved.userNotes ? "Saved user note for this scope." : "User note cleared for this scope.";
    }

    if (input) {
      input.addEventListener("input", persist);
      input.addEventListener("change", persist);
    }
  }

  function init(root = document) {
    Array.from(root.querySelectorAll("[data-access-control-user-tool-notes]")).forEach(renderMount);
  }

  window.ScopedLabsAccessControlUserToolNotes = Object.freeze({
    version: VERSION,
    storagePrefix: STORAGE_PREFIX,
    storageKey,
    readRecord,
    saveRecord,
    listRecords,
    currentScope,
    init
  });

  window.addEventListener("scopedlabs:access-control-scope-updated", function () {
    Array.from(document.querySelectorAll("[data-access-control-user-tool-notes]")).forEach((mount) => {
      mount.dataset.accessControlUserToolNotesReady = "false";
      renderMount(mount);
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); }, { once: true });
  } else {
    init();
  }
})();