(function () {
  "use strict";

  const VERSION = "access-control-summary-master-assistant-001";
  const TOOL_DEFINITIONS = [
  [
    "scope-planner",
    "Scope Planner",
    "Start the Access Control scope and establish the planning path."
  ],
  [
    "door-count-planner",
    "Door Count Planner",
    "Plan door counts and opening groups before sizing hardware and panels."
  ],
  [
    "reader-type-selector",
    "Reader Type Selector",
    "Select reader types based on the opening, credential, and environment."
  ],
  [
    "credential-format",
    "Credential Format",
    "Compare credential formats and identify the right access credential direction."
  ],
  [
    "access-level-sizing",
    "Access Level Sizing",
    "Estimate access levels and organize who should reach each secured area."
  ],
  [
    "panel-capacity",
    "Panel Capacity",
    "Check controller and panel capacity before committing to hardware counts."
  ],
  [
    "lock-power-budget",
    "Lock Power Budget",
    "Estimate lock power draw and confirm the power budget for secured openings."
  ],
  [
    "door-cable-length",
    "Door Cable Length",
    "Estimate access control cable length from controller to opening hardware."
  ],
  [
    "elevator-reader-count",
    "Elevator Reader Count",
    "Estimate elevator reader counts by cab, floor, and control method."
  ],
  [
    "fail-safe-fail-secure",
    "Fail Safe / Fail Secure",
    "Review fail safe versus fail secure behavior for access-controlled doors."
  ],
  [
    "special-locking-scope",
    "Special Locking Scope",
    "Scope special locking conditions before coordinating code and AHJ review."
  ],
  [
    "anti-passback-zones",
    "Anti-Passback Zones",
    "Plan anti-passback zones and validate the access flow between controlled areas."
  ]
];

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
    if (text.includes("healthy") || text.includes("safe") || text.includes("ok") || text.includes("pass") || text.includes("complete")) return "healthy";

    return "unknown";
  }

  function statusLabel(value) {
    const status = normalizeStatus(value);

    if (status === "risk") return "Risk";
    if (status === "watch") return "Watch";
    if (status === "healthy") return "Healthy";

    return "Pending";
  }

  function safeJsonParse(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function storageKeys(storage) {
    const keys = [];

    if (!storage) return keys;

    try {
      for (let i = 0; i < storage.length; i += 1) {
        keys.push(storage.key(i));
      }
    } catch {}

    return keys.filter(Boolean);
  }

  function flattenRecords(value, output) {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach((item) => flattenRecords(item, output));
      return;
    }

    if (typeof value !== "object") return;

    if (value.slug || value.toolSlug || value.tool || value.sourceTool) {
      output.push(value);
    }

    const arrays = ["records", "guidance", "tools", "toolGuidance", "items", "notes", "entries"];

    arrays.forEach((key) => {
      if (Array.isArray(value[key])) flattenRecords(value[key], output);
    });
  }

  function readFromStorage() {
    const records = [];
    const stores = [window.sessionStorage, window.localStorage];

    stores.forEach((storage) => {
      storageKeys(storage).forEach((key) => {
        if (!/access-control|ScopedLabsAccessControl|report-metadata/i.test(key)) return;

        let parsed = null;

        try {
          parsed = safeJsonParse(storage.getItem(key));
        } catch {}

        flattenRecords(parsed, records);
      });
    });

    return records;
  }

 
  // access-control-summary-scope-root-filter-0613
  // Scope Planner owns the current category-summary session root.
  // If no scopes are saved, orphaned historical guidance records are ignored.
  function readSummaryScopeLedger() {
    const api = window.ScopedLabsAccessControlScopeState;

    if (api && typeof api.readLedger === "function") {
      try {
        return api.readLedger();
      } catch {}
    }

    const keys = [
      "scopedlabs:pipeline:access-control:scopes"
    ];

    const stores = [window.sessionStorage, window.localStorage];

    for (const storage of stores) {
      for (const key of keys) {
        try {
          const parsed = safeJsonParse(storage.getItem(key));
          if (parsed && Array.isArray(parsed.scopes)) return parsed;
        } catch {}
      }
    }

    return { scopes: [], activeScopeId: null };
  }

  function scopeIdsFromLedger(ledger) {
    const scopes = Array.isArray(ledger && ledger.scopes) ? ledger.scopes : [];

    return new Set(scopes
      .map((scope) => String(scope && scope.id || "").trim())
      .filter(Boolean));
  }

  function recordScopeId(record) {
    return String(
      record && (
        record.scopeId ||
        record.accessScopeId ||
        record.activeScopeId ||
        record.scopeID ||
        record.scope ||
        ""
      ) || ""
    ).trim();
  }

  // access-control-summary-strict-scope-root-0613
  // Scope Planner owns the active category summary context.
  // Unscoped downstream/orphan records are ignored and do not count as current guidance.
  function recordToolSlug(record) {
    return String(
      record && (
        record.slug ||
        record.toolSlug ||
        record.tool ||
        record.toolId ||
        record.id ||
        ""
      ) || ""
    ).trim();
  }

  // access-control-summary-multi-scope-kpi-0613
  function plannedScopeSummary(ledger) {
    const scopes = Array.isArray(ledger && ledger.scopes) ? ledger.scopes : [];

    const names = scopes
      .map((scope, index) => String((scope && (scope.name || scope.label || scope.title)) || ("Access Scope " + (index + 1))).trim())
      .filter(Boolean);

    if (!scopes.length) {
      return {
        count: 0,
        label: "0",
        detail: "No access scopes have been saved for the current category rollup.",
        reportText: "No access scopes have been saved yet."
      };
    }

    if (scopes.length === 1) {
      return {
        count: 1,
        label: "1",
        detail: "One access scope is planned in the current category rollup.",
        reportText: "1 scope planned: " + (names[0] || "Access Scope 1")
      };
    }

    return {
      count: scopes.length,
      label: String(scopes.length),
      detail: String(scopes.length) + " access scopes are planned in the current category rollup.",
      reportText: String(scopes.length) + " scopes planned: " + names.join(", ")
    };
  }

  function scopePlannerRecordFromLedger(ledger, scopeIds) {
    const scopes = Array.isArray(ledger && ledger.scopes) ? ledger.scopes : [];
    const activeScopeId = String((ledger && ledger.activeScopeId) || "").trim();
    const fallbackScope = scopes.find((scope) => scope && scope.id);
    const activeScope = scopes.find((scope) => String(scope && scope.id || "").trim() === activeScopeId) || fallbackScope;
    const scopeId = String((activeScope && activeScope.id) || activeScopeId || "").trim();
    const planned = plannedScopeSummary(ledger);

    if (!scopeId || !scopeIds.has(scopeId)) return null;

    return {
      slug: "scope-planner",
      toolSlug: "scope-planner",
      scopeId,
      status: "saved",
      summary: planned.reportText,
      notes: planned.reportText
    };
  }

  function filterGuidanceRecordsToActiveScopes(records) {
    const ledger = readSummaryScopeLedger();
    const scopeIds = scopeIdsFromLedger(ledger);

    if (!scopeIds.size) return [];

    const filtered = (Array.isArray(records) ? records : []).filter((record) => {
      const slug = recordToolSlug(record);
      const scopeId = recordScopeId(record);

      if (slug === "scope-planner") {
        return !scopeId || scopeIds.has(scopeId);
      }

      if (!scopeId) return false;

      return scopeIds.has(scopeId);
    });

    const hasScopePlanner = filtered.some((record) => recordToolSlug(record) === "scope-planner");
    const syntheticScopePlanner = scopePlannerRecordFromLedger(ledger, scopeIds);

    if (!hasScopePlanner && syntheticScopePlanner) {
      filtered.unshift(syntheticScopePlanner);
    }

    return filtered;
  }

 
  // access-control-summary-tool-notes-dedupe-0613
  function guidanceRecordUpdatedTime(record) {
    const raw = String(
      record && (
        record.updatedAt ||
        record.generatedAt ||
        record.savedAt ||
        record.createdAt ||
        record.timestamp ||
        ""
      ) || ""
    ).trim();

    const parsed = raw ? Date.parse(raw) : NaN;

    return Number.isFinite(parsed) ? parsed : 0;
  }

  function dedupeGuidanceRecordsByToolAndScope(records) {
    const map = new Map();

    (Array.isArray(records) ? records : []).forEach((record) => {
      const slug = recordToolSlug(record);
      const scopeId = recordScopeId(record);

      if (!slug || !scopeId) return;

      const key = slug + "::" + scopeId;
      const existing = map.get(key);

      if (!existing || guidanceRecordUpdatedTime(record) >= guidanceRecordUpdatedTime(existing)) {
        map.set(key, record);
      }
    });

    return Array.from(map.values());
  }


function readGuidanceRecordsRaw() {
    const candidates = [
      ["ScopedLabsAccessControlGuidanceMemory", "listToolGuidance"],
      ["ScopedLabsAccessControlGuidanceMemory", "list"],
      ["ScopedLabsAccessControlGuidanceMemory", "readAll"],
      ["ScopedLabsAccessControlMemory", "listToolGuidance"],
      ["ScopedLabsAccessControlMemory", "list"],
      ["ScopedLabsAccessControlState", "readLedger"],
      ["ScopedLabsAccessControlState", "getLedger"],
    ];

    const records = [];

    candidates.forEach(([apiName, method]) => {
      const api = window[apiName];

      if (!api || typeof api[method] !== "function") return;

      try {
        flattenRecords(api[method](), records);
      } catch {}
    });

    flattenRecords(readFromStorage(), records); return filterGuidanceRecordsToActiveScopes(records);
  }

  function readGuidanceRecords() {
    return dedupeGuidanceRecordsByToolAndScope(readGuidanceRecordsRaw());
  }

  function slugFromRecord(record) {
    const value = record && (record.slug || record.toolSlug || record.tool || record.sourceTool || record.id || "");

    return String(value || "")
      .replace(/^access-control[:/]/i, "")
      .replace(/^tools\/access-control\//i, "")
      .replace(/\/index\.html$/i, "")
      .replace(/^\/+|\/+$/g, "")
      .trim();
  }

  function recordBySlug(records) {
    return records.reduce((map, record) => {
      const slug = slugFromRecord(record);

      if (slug && !map[slug]) map[slug] = record;

      return map;
    }, {});
  }

  function detailFromRecord(record, fallback) {
    if (!record) return fallback;

    return (
      record.reportSummary ||
      record.summary ||
      record.action ||
      record.reason ||
      record.nextStep ||
      record.detail ||
      record.notes ||
      fallback
    );
  }

  function toolRows(recordsBySlug) {
    return TOOL_DEFINITIONS.map(([slug, label, fallback]) => {
      const record = recordsBySlug[slug] || null;
      const generated = !!record;
      const status = generated ? normalizeStatus(record.status || record.overallStatus || record.state || "complete") : "unknown";

      return {
        slug,
        label,
        generated,
        status,
        detail: detailFromRecord(record, fallback),
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
    }, {
      generated: 0,
      healthy: 0,
      watch: 0,
      risk: 0,
      pending: 0,
    });
  }

  function overallStatus(count) {
    if (count.risk > 0) return "risk";
    if (count.watch > 0) return "watch";
    if (count.generated > 0 && count.pending === 0) return "healthy";
    if (count.generated > 0) return "watch";

    return "unknown";
  }

  function kpi(title, value, detail) {
    return '<article class="tool-card access-summary-kpi">' +
      '<h3>' + escapeHtml(title) + '</h3>' +
      '<strong>' + escapeHtml(value) + '</strong>' +
      '<p>' + escapeHtml(detail) + '</p>' +
      '</article>';
  }

  function statusChip(status) {
    return '<span class="access-summary-status access-summary-status--' + escapeHtml(normalizeStatus(status)) + '">' + escapeHtml(statusLabel(status)) + '</span>';
  }

  function renderToolRows(rows) {
    return rows.map((row) => {
      return '<article class="tool-card access-summary-tool-row">' +
        '<h3><a href="/tools/access-control/' + escapeHtml(row.slug) + '/">' + escapeHtml(row.label) + '</a></h3>' +
        '<p>' + escapeHtml(row.detail) + '</p>' +
        statusChip(row.status) +
        '</article>';
    }).join("");
  }

  function findHeading(text) {
    const headings = Array.from(document.querySelectorAll("h2, h3"));

    return headings.find((heading) => {
      return String(heading.textContent || "").toLowerCase().includes(String(text || "").toLowerCase());
    }) || null;
  }

  const SUMMARY_SECTION_EXPORT_TITLES = {
    accessControlSummaryKpis: "Access Control Rollup",
    accessControlMasterAssistant: "Access Control Master Assistant",
    accessControlToolRollup: "Access Control Tool Status",
    accessControlToolNotes: "Access Control Assistant Tool Notes",
  };

  const SUMMARY_SECTION_INSERT_AFTER = {
    accessControlMasterAssistant: "accessControlSummaryKpis",
    accessControlToolRollup: "accessControlMasterAssistant",
    accessControlToolNotes: "accessControlToolRollup",
  };

  function closestCard(element) {
    return element && element.closest ? element.closest("section.card") : null;
  }

  function findSummaryInsertAfterSection(id) {
    const afterId = SUMMARY_SECTION_INSERT_AFTER[id];
    if (!afterId) return null;

    const mount = byId(afterId);
    return closestCard(mount);
  }

  function ensureSection(id, title, headingHint) {
    const existing = byId(id);

    if (existing) return existing;

    const section = document.createElement("section");
    section.className = "card access-control-summary-generated-card";
    section.setAttribute("data-access-control-summary-section", id);

    if (SUMMARY_SECTION_EXPORT_TITLES[id]) {
      section.setAttribute("data-export-section", "");
      section.setAttribute("data-export-title", SUMMARY_SECTION_EXPORT_TITLES[id]);
    }

    const heading = document.createElement("h2");
    heading.textContent = title;

    const mount = document.createElement("div");
    mount.id = id;
    mount.className = "tool-grid";

    section.appendChild(heading);
    section.appendChild(mount);

    const afterSection = findSummaryInsertAfterSection(id);
    const targetHeading = findHeading(headingHint || title);
    const main = document.querySelector("main") || document.body;

    if (afterSection && afterSection.parentElement) {
      afterSection.insertAdjacentElement("afterend", section);
    } else if (targetHeading && targetHeading.parentElement) {
      targetHeading.parentElement.insertAdjacentElement("afterend", section);
    } else {
      main.appendChild(section);
    }

    return mount;
  }

  function renderNotes(records) {
    const noteRecords = records.filter((record) => {
      return record && (record.notes || record.customNotes || record.reportNotes || record.note);
    });

    if (!noteRecords.length) {
      return '<p>No tool-specific notes have been saved for this Access Control planning session yet.</p>';
    }

    return noteRecords.map((record) => {
      const slug = slugFromRecord(record);
      const label = TOOL_DEFINITIONS.find((item) => item[0] === slug)?.[1] || slug || "Access Control Tool";
      const note = record.notes || record.customNotes || record.reportNotes || record.note;

      return '<article class="tool-card access-summary-note">' +
        '<h3>' + escapeHtml(label) + '</h3>' +
        '<p>' + escapeHtml(note) + '</p>' +
        '</article>';
    }).join("");
  }


  // access-control-summary-scope-view-mode-0613
  function summaryScopeList(ledger) {
    return (Array.isArray(ledger && ledger.scopes) ? ledger.scopes : [])
      .filter((scope) => scope && scope.id)
      .map((scope, index) => {
        const id = String(scope.id || "").trim();
        const name = String(scope.name || scope.label || scope.title || ("Access Scope " + (index + 1))).trim();

        return {
          id,
          name: name || ("Access Scope " + (index + 1)),
          path: String(scope.path || scope.accessPath || scope.doorPath || "").trim(),
          egress: String(scope.egress || scope.egressMode || scope.egressStatus || "").trim(),
          lockIntent: String(scope.lockIntent || scope.lockMode || "").trim()
        };
      });
  }

  function summarySelectedScopeStorageKey() {
    return "scopedlabs:access-control:summary:selected-scope-id";
  }

  function selectedSummaryScopeId(ledger) {
    const scopes = summaryScopeList(ledger);
    const ids = new Set(scopes.map((scope) => scope.id));
    let saved = "";

    try {
      saved = String(window.sessionStorage.getItem(summarySelectedScopeStorageKey()) || "").trim();
    } catch {}

    if (saved === "__all__") return saved;
    if (saved && ids.has(saved)) return saved;

    const activeScopeId = String((ledger && ledger.activeScopeId) || "").trim();

    if (activeScopeId && ids.has(activeScopeId)) return activeScopeId;

    return scopes[0] ? scopes[0].id : "";
  }

  function summaryScopeById(ledger, scopeId) {
    return summaryScopeList(ledger).find((scope) => scope.id === scopeId) || null;
  }

  function summaryRecordToolSlug(record) {
    return String(
      record && (
        record.slug ||
        record.toolSlug ||
        record.tool ||
        record.toolId ||
        record.id ||
        ""
      ) || ""
    ).trim();
  }

  function summaryRecordScopeId(record) {
    return String(
      record && (
        record.scopeId ||
        record.accessScopeId ||
        record.activeScopeId ||
        record.scopeID ||
        record.scope ||
        ""
      ) || ""
    ).trim();
  }

  function summaryScopeGuidance(scope) {
    if (!scope) return "No active scope selected.";

    const details = [];

    if (scope.path) details.push("Path: " + scope.path);
    if (scope.egress) details.push("Egress: " + scope.egress);
    if (scope.lockIntent) details.push("Lock intent: " + scope.lockIntent);

    if (!details.length) details.push("Scope started and available for the current category rollup.");

    return details.join(" · ");
  }

  function summaryScopeRecordFor(scope) {
    if (!scope || !scope.id) return null;

    return {
      slug: "scope-planner",
      toolSlug: "scope-planner",
      scopeId: scope.id,
      status: "saved",
      summary: summaryScopeGuidance(scope),
      notes: summaryScopeGuidance(scope)
    };
  }

  function recordsForAllSummaryScopes(records, ledger) {
    const scopes = summaryScopeList(ledger);
    const scopeIds = new Set(scopes.map((scope) => scope.id));
    const filtered = (Array.isArray(records) ? records : []).filter((record) => {
      const slug = summaryRecordToolSlug(record);
      const scopeId = summaryRecordScopeId(record);

      if (slug === "scope-planner") return scopeId && scopeIds.has(scopeId);
      if (!scopeId) return false;

      return scopeIds.has(scopeId);
    });

    scopes.forEach((scope) => {
      const hasScopePlanner = filtered.some((record) =>
        summaryRecordToolSlug(record) === "scope-planner" &&
        summaryRecordScopeId(record) === scope.id
      );

      const syntheticScopePlanner = summaryScopeRecordFor(scope);

      if (!hasScopePlanner && syntheticScopePlanner) filtered.unshift(syntheticScopePlanner);
    });

    return filtered;
  }

  function recordsForSelectedSummaryScope(records, ledger, selectedScopeId) {
    if (selectedScopeId === "__all__") {
      return recordsForAllSummaryScopes(records, ledger);
    }

    const selectedScope = summaryScopeById(ledger, selectedScopeId);

    if (!selectedScope) return [];

    const filtered = (Array.isArray(records) ? records : []).filter((record) => {
      const slug = summaryRecordToolSlug(record);
      const scopeId = summaryRecordScopeId(record);

      if (slug === "scope-planner") {
        return scopeId === selectedScopeId;
      }

      if (!scopeId) return false;

      return scopeId === selectedScopeId;
    });

    const hasScopePlanner = filtered.some((record) => summaryRecordToolSlug(record) === "scope-planner");
    const syntheticScopePlanner = summaryScopeRecordFor(selectedScope);

    if (!hasScopePlanner && syntheticScopePlanner) filtered.unshift(syntheticScopePlanner);

    return filtered;
  }

  function plannedScopeSummary(ledger) {
    const scopes = summaryScopeList(ledger);

    if (!scopes.length) {
      return {
        count: 0,
        label: "0",
        detail: "No access scopes have been saved for the current category rollup."
      };
    }

    if (scopes.length === 1) {
      return {
        count: 1,
        label: "1",
        detail: "One access scope is planned in the current category rollup."
      };
    }

    return {
      count: scopes.length,
      label: String(scopes.length),
      detail: String(scopes.length) + " access scopes are planned in the current category rollup."
    };
  }

  function renderSummaryScopeSelector(ledger, selectedScopeId) {
    const scopes = summaryScopeList(ledger);

    if (!scopes.length) {
      return "<div class='access-summary-scope-selector' data-summary-scope-selector='empty'>" +
        "<span>Active scope view</span><strong>No saved scopes yet</strong>" +
      "</div>";
    }

    const options = scopes.map((scope) => {
      const selected = scope.id === selectedScopeId ? " selected" : "";

      return "<option value='" + escapeHtml(scope.id) + "'" + selected + ">" + escapeHtml(scope.name) + "</option>";
    }).join("") +
      "<option value='__all__'" + (selectedScopeId === "__all__" ? " selected" : "") + ">All scopes / category rollup</option>";

    return "<label class='access-summary-scope-selector' for='accessControlSummaryScopeSelect' data-summary-scope-selector='active'>" +
      "<span>Scope view</span>" +
      "<select id='accessControlSummaryScopeSelect' aria-label='Select Access Control scope'>" + options + "</select>" +
    "</label>";
  }

  function bindSummaryScopeSelector() {
    const select = byId("accessControlSummaryScopeSelect");

    if (!select || select.dataset.bound === "true") return;

    select.dataset.bound = "true";

    select.addEventListener("change", () => {
      try {
        window.sessionStorage.setItem(summarySelectedScopeStorageKey(), select.value || "");
      } catch {}

      render();

      try {
        window.dispatchEvent(new CustomEvent("scopedlabs:access-control-scope-view-changed", {
          detail: { scopeId: select.value || "" }
        }));
      } catch {}
    });
  }


  function render() {
    const ledger = readSummaryScopeLedger();
    const plannedScopes = plannedScopeSummary(ledger);
    const selectedScopeId = selectedSummaryScopeId(ledger);
    const selectedScope = summaryScopeById(ledger, selectedScopeId);
    const isAllScopes = selectedScopeId === "__all__";
    const records = recordsForSelectedSummaryScope(readGuidanceRecords(), ledger, selectedScopeId);
    const rows = toolRows(recordBySlug(records));
    const count = counts(rows);
    const status = overallStatus(count);

    const kpiMount = ensureSection("accessControlSummaryKpis", "Access Control Rollup", "Rollup");

    kpiMount.innerHTML =
      renderSummaryScopeSelector(ledger, selectedScopeId) +
      kpi("Scopes planned", plannedScopes.label, plannedScopes.detail) +
      kpi("Guidance saved", String(count.generated) + " / " + String(TOOL_DEFINITIONS.length), isAllScopes ? "Saved guidance across all scoped Access Control records." : "Saved guidance for the selected Access Control scope.") +
      kpi("Overall status", statusLabel(status), isAllScopes ? "Rollup status based on all scoped guidance records." : "Rollup status based on the selected scope guidance records.");

    bindSummaryScopeSelector();

    const assistantMount = ensureSection("accessControlMasterAssistant", "Access Control Master Assistant", "Master Assistant");

    assistantMount.innerHTML =
      "<p>This master assistant keeps each Access Control scope separate. The screen view stays focused on the selected scope; export/print can output one scope or all saved scopes as separated report sections.</p>" +
      "<p><strong>Next action:</strong> " +
      escapeHtml(count.generated > 1 ? "Review any Watch/Risk items, add report metadata, then open the report section." : "Continue the guided flow for the selected scope, then return here for the category rollup.") +
      "</p>";

    const toolMount = ensureSection("accessControlToolRollup", "Access Control Tool Status", "Tool Guidance");
    toolMount.innerHTML = renderToolRows(rows);

    const notesMount = ensureSection("accessControlToolNotes", "Assistant Tool Notes", "Assistant Tool Notes");
    notesMount.innerHTML = renderNotes(records);

    document.documentElement.setAttribute("data-access-control-summary-version", VERSION);

    try {
      window.dispatchEvent(new CustomEvent("scopedlabs:access-control-guidance-updated"));
    } catch {}
  }

  window.ScopedLabsAccessControlSummary = {
    version: VERSION,
    render,
    readGuidanceRecords,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  // access-control-summary-user-tool-notes-0614
  function selectedUserToolNotesScopeId() {
    try {
      return String(window.sessionStorage.getItem("scopedlabs:access-control:summary:selected-scope-id") || "").trim();
    } catch (_) {
      return "";
    }
  }

  function userToolNoteRecords() {
    let records = [];

    if (window.ScopedLabsAccessControlUserToolNotes && typeof window.ScopedLabsAccessControlUserToolNotes.listRecords === "function") {
      try {
        records = window.ScopedLabsAccessControlUserToolNotes.listRecords();
      } catch (_) {
        records = [];
      }
    }

    if (!records.length) {
      const stores = [window.sessionStorage, window.localStorage];

      stores.forEach((storage) => {
        storageKeys(storage).forEach((key) => {
          if (!String(key || "").startsWith("scopedlabs:access-control:user-tool-notes:")) return;

          let parsed = null;

          try {
            parsed = JSON.parse(storage.getItem(key));
          } catch (_) {}

          if (parsed && parsed.scopeId && parsed.toolSlug) records.push(parsed);
        });
      });
    }

    records = dedupeGuidanceRecordsByToolAndScope(records);

    const selectedScopeId = selectedUserToolNotesScopeId();

    if (selectedScopeId && selectedScopeId !== "__all__") {
      records = records.filter((record) => String(record.scopeId || record.accessScopeId || record.activeScopeId || "").trim() === selectedScopeId);
    }

    return records;
  }

  function ensureUserToolNotesSection() {
    let card = document.getElementById("accessControlUserToolNotes");

    if (card) return card;

    const anchorMount = document.getElementById("accessControlToolNotes");
    const anchorCard = anchorMount && anchorMount.closest ? anchorMount.closest("section.card") : null;

    card = document.createElement("section");
    card.className = "card access-control-summary-generated-card";
    card.id = "accessControlUserToolNotes";
    card.setAttribute("data-export-section", "");
    card.setAttribute("data-export-title", "Access Control User Tool Notes");
    card.setAttribute("data-access-control-summary-section", "accessControlUserToolNotes");

    if (anchorCard && anchorCard.parentNode) {
      anchorCard.parentNode.insertBefore(card, anchorCard.nextSibling);
    } else {
      const heading = findHeading("Assistant Tool Notes");
      const headingCard = heading && heading.closest ? heading.closest("section.card") : null;
      const main = document.querySelector("main") || document.body;

      if (headingCard && headingCard.parentNode) {
        headingCard.parentNode.insertBefore(card, headingCard.nextSibling);
      } else {
        main.appendChild(card);
      }
    }

    return card;
  }

  function renderUserToolNotes() {
    const records = userToolNoteRecords().filter((record) => String(record.userNotes || record.notes || "").trim());
    const card = ensureUserToolNotesSection();
    const selectedScopeId = selectedUserToolNotesScopeId();
    const scopePhrase = selectedScopeId && selectedScopeId !== "__all__" ? " for the selected scope" : " by scope";

    if (!records.length) {
      card.innerHTML =
        "<h2>User Tool Notes</h2>" +
        "<p class='muted'>User-entered report notes saved from individual Access Control tools will appear here" + scopePhrase + ".</p>" +
        "<p class='muted'>No user tool notes have been saved yet.</p>";
      return;
    }

    const rows = records.map((record) => {
      const scope = escapeHtml(record.scopeName || record.scopeId || "Access Scope");
      const tool = escapeHtml(record.toolLabel || record.toolSlug || "Tool");
      const note = escapeHtml(record.userNotes || record.notes || "");
      return "<tr><td>" + scope + "</td><td>" + tool + "</td><td>" + note + "</td></tr>";
    }).join("");

    card.innerHTML =
      "<h2>User Tool Notes</h2>" +
      "<p class='muted'>User-entered report notes saved from individual Access Control tools, separated from assistant-generated guidance.</p>" +
      "<table class='summary-tool-notes-table' data-export-table-class='extra-export-table--access-control-user-tool-notes' data-export-col-widths='24,24,52' data-export-table-title='User Tool Notes'>" +
        "<colgroup><col style='width:24%'><col style='width:24%'><col style='width:52%'></colgroup>" +
        "<thead><tr><th>Scope</th><th>Tool</th><th>User note</th></tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table>";
  }

  function scheduleRenderUserToolNotes() {
    try {
      renderUserToolNotes();
    } catch (_) {}
  }

  document.addEventListener("scopedlabs:access-control-user-tool-notes-saved", scheduleRenderUserToolNotes);
  window.addEventListener("storage", scheduleRenderUserToolNotes);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleRenderUserToolNotes, { once: true });
  } else {
    scheduleRenderUserToolNotes();
  }

  setTimeout(scheduleRenderUserToolNotes, 250);
  setTimeout(scheduleRenderUserToolNotes, 900);

})();