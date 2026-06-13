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

  function filterGuidanceRecordsToActiveScopes(records) {
    const ledger = readSummaryScopeLedger();
    const scopeIds = scopeIdsFromLedger(ledger);

    if (!scopeIds.size) return [];

    return (Array.isArray(records) ? records : []).filter((record) => {
      const scopeId = recordScopeId(record);

      if (!scopeId) return true;

      return scopeIds.has(scopeId);
    });
  }

 function readGuidanceRecords() {
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
    accessControlToolNotes: "Access Control Tool Notes",
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

  function render() {
    const records = readGuidanceRecords();
    const rows = toolRows(recordBySlug(records));
    const count = counts(rows);
    const status = overallStatus(count);

    const kpiMount = ensureSection("accessControlSummaryKpis", "Access Control Rollup", "Rollup");
    kpiMount.innerHTML =
      kpi("Tools discovered", String(TOOL_DEFINITIONS.length), "Access Control planning tools included in this category rollup.") +
      kpi("Guidance saved", String(count.generated) + " / " + String(TOOL_DEFINITIONS.length), "Saved tool guidance found in current browser/session memory.") +
      kpi("Overall status", statusLabel(status), "Rollup status based on saved tool guidance records.");

    const assistantMount = ensureSection("accessControlMasterAssistant", "Access Control Master Assistant", "Master Assistant");
    assistantMount.innerHTML =
      '<p>This master assistant keeps each Access Control tool separate, then rolls the saved guidance into a final category view. Use it after running the individual tools or before opening the final report.</p>' +
      '<p><strong>Next action:</strong> ' +
      escapeHtml(count.generated > 0 ? "Review any Watch/Risk items, add report metadata, then open the report section." : "Run the Access Control tools in the guided flow, then return here for the category rollup.") +
      '</p>';

    const toolMount = ensureSection("accessControlToolRollup", "Access Control Tool Status", "Tool Guidance");
    toolMount.innerHTML = renderToolRows(rows);

    const notesMount = ensureSection("accessControlToolNotes", "Tool Notes", "Tool Notes");
    notesMount.innerHTML = renderNotes(records);

    document.documentElement.setAttribute("data-access-control-summary-version", VERSION); try { window.dispatchEvent(new CustomEvent("scopedlabs:access-control-guidance-updated")); } catch {}
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
})();