/* ScopedLabs Access Control Scope State
   Version: access-control-scope-state-002-shared-display
   Purpose: Access Control door/scope ledger modeled after the proven Physical Security Area Planner state pattern.
*/
(function () {
  "use strict";

  const API_VERSION = "access-control-scope-state-003-report-metadata-cleanup";
  const STORAGE_KEY = "scopedlabs:pipeline:access-control:scopes";
  const ACTIVE_KEY = "scopedlabs:pipeline:access-control:active-scope";
  const FLOW_KEY = "scopedlabs:pipeline:access-control:scope-planner";
  const METADATA_KEY = "scopedlabs:pipeline:access-control:scope-planner:metadata";

  function safeJsonParse(value, fallback) {
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function slugify(value) {
    return String(value || "scope")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "scope";
  }

  function cleanString(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function normalizeNotes(value) {
    if (Array.isArray(value)) return value.map((item) => cleanString(item)).filter(Boolean);
    const text = cleanString(value);
    return text ? text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) : [];
  }

  function normalizeMetadata(metadata = {}) {
    const source = metadata && typeof metadata === "object" ? metadata : {};
    return {
      reportName: cleanString(source.reportName, "Access Control Scope Summary"),
      clientName: cleanString(source.clientName),
      projectName: cleanString(source.projectName),
      preparedBy: cleanString(source.preparedBy),
      projectLocation: cleanString(source.projectLocation),
      reportNotes: cleanString(source.reportNotes),
      updatedAt: source.updatedAt || new Date().toISOString()
    };
  }

  function authorityReasonsForScope(scope) {
    const source = scope && typeof scope === "object" ? scope : {};
    const reasons = [];

    const egressSensitive = ["required-egress", "exit-door", "stairwell-egress", "corridor-egress"].includes(source.egressRole) ||
      ["stairwell-door", "corridor-door", "exit-door"].includes(source.openingType) ||
      source.scopeType === "egress-path";

    if (source.egressRole === "unknown") reasons.push("Required egress role is unknown.");
    if (source.freeEgress === "unknown") reasons.push("Free mechanical egress is not confirmed.");
    if (source.freeEgress === "no") reasons.push("Restricted or special locking behavior may affect egress.");
    if (source.fireRated === "unknown") reasons.push("Fire-rated opening status is unknown.");
    if (egressSensitive && source.fireRelease === "unknown") reasons.push("Fire alarm release behavior is unknown for an egress-sensitive opening.");
    if (source.lockIntent === "maglock" && source.freeEgress !== "yes") reasons.push("Maglock intent without confirmed free egress requires authority review.");
    if (source.powerLossIntent === "fail-secure" && egressSensitive) reasons.push("Fail-secure intent on an egress-sensitive opening requires authority review.");
    if (source.powerLossIntent === "unknown") reasons.push("Power-loss behavior is unresolved.");
    if (source.securityLevel === "critical" && source.egressRole === "unknown") reasons.push("Critical scope has unknown egress role.");

    return reasons;
  }

  function normalizeScope(scope, index = 0) {
    const source = scope && typeof scope === "object" ? scope : {};
    const name = cleanString(source.name, "Access Scope " + (index + 1));
    const id = cleanString(source.id, slugify(name) + "-" + Date.now());
    const normalized = {
      ...source,
      id,
      name,
      scopeType: cleanString(source.scopeType, "single-door"),
      openingType: cleanString(source.openingType, "single-door"),
      locationType: cleanString(source.locationType, "interior"),
      planningPath: cleanString(source.planningPath, "core-door"),
      doorFunction: cleanString(source.doorFunction, "staff-entry"),
      egressRole: cleanString(source.egressRole, "unknown"),
      freeEgress: cleanString(source.freeEgress, "unknown"),
      fireRated: cleanString(source.fireRated, "unknown"),
      fireRelease: cleanString(source.fireRelease, "unknown"),
      powerLossIntent: cleanString(source.powerLossIntent, "unknown"),
      lockIntent: cleanString(source.lockIntent, "unknown"),
      readerIntent: cleanString(source.readerIntent, "card-or-fob"),
      securityLevel: cleanString(source.securityLevel, "standard"),
      threatLevel: cleanString(source.threatLevel, "medium"),
      trafficLevel: cleanString(source.trafficLevel, "normal"),
      controllerGroup: cleanString(source.controllerGroup, "unassigned"),
      restrictions: cleanString(source.restrictions),
      notes: normalizeNotes(source.notes),
      completedTools: source.completedTools && typeof source.completedTools === "object" ? source.completedTools : {},
      sourceMode: cleanString(source.sourceMode, "scope-planner"),
      updatedAt: source.updatedAt || new Date().toISOString()
    };

    normalized.authorityReviewReasons = authorityReasonsForScope(normalized);
    normalized.requiresAuthorityReview = normalized.authorityReviewReasons.length > 0;
    normalized.status = normalized.requiresAuthorityReview ? "AUTHORITY REVIEW" : cleanString(source.status, "PLANNING");

    return normalized;
  }

  function defaultLedger() {
    return {
      schema: "scopedlabs.access-control.scope-ledger.v1",
      projectMode: "multi-scope",
      activeScopeId: null,
      scopes: [],
      metadata: normalizeMetadata(),
      updatedAt: new Date().toISOString()
    };
  }

  function readMetadata() {
    return normalizeMetadata(
      safeJsonParse(sessionStorage.getItem(METADATA_KEY), null) ||
      safeJsonParse(localStorage.getItem(METADATA_KEY), null) ||
      {}
    );
  }

  function writeMetadata(metadata) {
    const normalized = normalizeMetadata({ ...metadata, updatedAt: new Date().toISOString() });
    sessionStorage.setItem(METADATA_KEY, JSON.stringify(normalized));
    localStorage.setItem(METADATA_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function readLedger() {
    const parsed = safeJsonParse(sessionStorage.getItem(STORAGE_KEY), null) ||
      safeJsonParse(localStorage.getItem(STORAGE_KEY), null);

    if (!parsed || !Array.isArray(parsed.scopes)) {
      const fresh = defaultLedger();
      fresh.metadata = readMetadata();
      return fresh;
    }

    const scopes = parsed.scopes.map(normalizeScope).filter((scope) => scope && scope.id);
    const activeScopeId = parsed.activeScopeId && scopes.some((scope) => scope.id === parsed.activeScopeId)
      ? parsed.activeScopeId
      : scopes[0]?.id || null;

    return {
      schema: "scopedlabs.access-control.scope-ledger.v1",
      projectMode: "multi-scope",
      activeScopeId,
      scopes,
      metadata: normalizeMetadata(parsed.metadata || readMetadata()),
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  }

  function writeLedger(ledger = {}) {
    const scopes = Array.isArray(ledger.scopes)
      ? ledger.scopes.map(normalizeScope).filter((scope) => scope && scope.id)
      : [];

    const activeScopeId = ledger.activeScopeId && scopes.some((scope) => scope.id === ledger.activeScopeId)
      ? ledger.activeScopeId
      : scopes[0]?.id || null;

    const metadata = writeMetadata(ledger.metadata || readMetadata());

    const normalized = {
      schema: "scopedlabs.access-control.scope-ledger.v1",
      projectMode: "multi-scope",
      activeScopeId,
      scopes,
      metadata,
      updatedAt: new Date().toISOString()
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

    const active = normalized.scopes.find((scope) => scope.id === activeScopeId) || null;

    if (active) {
      sessionStorage.setItem(ACTIVE_KEY, active.id);
      localStorage.setItem(ACTIVE_KEY, active.id);

      sessionStorage.setItem(FLOW_KEY, JSON.stringify({
        category: "access-control",
        step: "scope-planner",
        data: {
          scopeId: active.id,
          scopeName: active.name,
          scopeType: active.scopeType,
          openingType: active.openingType,
          planningPath: active.planningPath,
          doorFunction: active.doorFunction,
          egressRole: active.egressRole,
          freeEgress: active.freeEgress,
          fireRated: active.fireRated,
          fireRelease: active.fireRelease,
          powerLossIntent: active.powerLossIntent,
          lockIntent: active.lockIntent,
          readerIntent: active.readerIntent,
          securityLevel: active.securityLevel,
          threatLevel: active.threatLevel,
          trafficLevel: active.trafficLevel,
          controllerGroup: active.controllerGroup,
          requiresAuthorityReview: active.requiresAuthorityReview,
          authorityReviewReasons: active.authorityReviewReasons,
          scopeCount: normalized.scopes.length,
          scopes: normalized.scopes,
          metadata
        }
      }));
    } else {
      sessionStorage.removeItem(ACTIVE_KEY);
      localStorage.removeItem(ACTIVE_KEY);
      sessionStorage.removeItem(FLOW_KEY);
    }

    try {
      window.dispatchEvent(new CustomEvent("scopedlabs:access-control-scope-updated", { detail: normalized }));
    } catch {}

    return normalized;
  }

  function getActiveScope() {
    const ledger = readLedger();
    return ledger.scopes.find((scope) => scope.id === ledger.activeScopeId) || null;
  }

  function upsertScope(scope) {
    const ledger = readLedger();
    const normalized = normalizeScope(scope, ledger.scopes.length);
    const index = ledger.scopes.findIndex((item) => item.id === normalized.id);

    if (index >= 0) ledger.scopes[index] = { ...ledger.scopes[index], ...normalized, updatedAt: new Date().toISOString() };
    else ledger.scopes.push({ ...normalized, updatedAt: new Date().toISOString() });

    ledger.activeScopeId = normalized.id;
    return writeLedger(ledger);
  }

  function setActiveScope(scopeId) {
    const ledger = readLedger();
    if (!ledger.scopes.some((scope) => scope.id === scopeId)) return ledger;
    ledger.activeScopeId = scopeId;
    return writeLedger(ledger);
  }

  function removeScope(scopeId) {
    removeAccessControlReportMetadataForScope(scopeId);

    const ledger = readLedger();
    ledger.scopes = ledger.scopes.filter((scope) => scope.id !== scopeId);
    if (ledger.activeScopeId === scopeId) ledger.activeScopeId = ledger.scopes[0]?.id || null;
    return writeLedger(ledger);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function titleCase(value) {
    return String(value || "unknown")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase()) || "Unknown";
  }

  function ensureScopeDisplayStyles() {
    if (typeof document === "undefined" || document.getElementById("access-control-scope-display-styles")) return;

    const style = document.createElement("style");
    style.id = "access-control-scope-display-styles";
    style.textContent = `
      .access-scope-context-card {
        border-color: rgba(125,255,152,.22) !important;
        background: rgba(125,255,152,.035) !important;
      }

      .access-scope-context-line {
        color: rgba(190,255,205,.9);
        font-size: .72rem;
        font-weight: 950;
        letter-spacing: .08em;
        margin-bottom: 8px;
        text-transform: uppercase;
      }

      .access-scope-context-line .arrow {
        color: rgba(125,255,152,.78);
        padding: 0 5px;
      }

      .access-scope-context-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin-top: 10px;
      }

      .access-scope-context-grid div {
        border: 1px solid rgba(148,163,184,.12);
        border-radius: 10px;
        padding: 8px;
        background: rgba(255,255,255,.025);
      }

      .access-scope-context-grid strong {
        color: rgba(203,213,225,.66);
        display: block;
        font-size: .66rem;
        letter-spacing: .08em;
        margin-bottom: 4px;
        text-transform: uppercase;
      }

      .access-scope-context-grid span {
        color: rgba(226,232,240,.88);
        font-size: .84rem;
        font-weight: 750;
        line-height: 1.3;
      }

      @media (max-width: 760px) {
        .access-scope-context-grid {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function buildScopeDisplayContext(toolLabel = "Access Control Tool") {
    const scope = getActiveScope();
    const metadata = readMetadata();

    if (!scope) {
      return {
        hasActiveScope: false,
        title: "No active access scope selected",
        lineTarget: toolLabel,
        description: "Create or select an access scope before using this tool so the result can be tied to the right door or zone.",
        rows: [
          ["Scope Source", "No Scope Planner context detected"],
          ["Result Save", "Tool result will not be tied to a scope yet."]
        ],
        reportRows: [
          { label: "Active Scope", value: "No active access scope selected" },
          { label: "Scope Source", value: "No Scope Planner context detected" }
        ],
        projectSite: metadata.projectName || metadata.projectLocation || "Not documented",
        areaScope: "No active scope selected",
        openingDoorCount: "Not documented",
        openingType: "Not documented",
        doorFunction: "Not documented",
        securityContext: "Not documented",
        powerLossIntent: "Not documented",
        upstreamSource: "No Scope Planner context detected"
      };
    }

    const statusText = scope.requiresAuthorityReview ? "Authority Review" : titleCase(scope.status || "Planning");

    return {
      hasActiveScope: true,
      id: scope.id,
      title: scope.name || "Active Access Scope",
      lineTarget: toolLabel,
      description: titleCase(scope.scopeType) + " | " + titleCase(scope.doorFunction) + " | " + titleCase(scope.planningPath),
      rows: [
        ["Opening", titleCase(scope.openingType)],
        ["Egress", titleCase(scope.egressRole)],
        ["Fire Release", titleCase(scope.fireRelease)],
        ["Status", statusText],
        ["Power Intent", titleCase(scope.powerLossIntent)],
        ["Lock Intent", titleCase(scope.lockIntent)],
        ["Threat", titleCase(scope.threatLevel)],
        ["Reader", titleCase(scope.readerIntent)]
      ],
      reportRows: [
        { label: "Active Scope", value: scope.name || "Active Access Scope" },
        { label: "Scope Type", value: titleCase(scope.scopeType) },
        { label: "Opening Type", value: titleCase(scope.openingType) },
        { label: "Door / Zone Function", value: titleCase(scope.doorFunction) },
        { label: "Planning Path", value: titleCase(scope.planningPath) },
        { label: "Egress Role", value: titleCase(scope.egressRole) },
        { label: "Fire Release", value: titleCase(scope.fireRelease) },
        { label: "Power Loss Intent", value: titleCase(scope.powerLossIntent) },
        { label: "Lock Intent", value: titleCase(scope.lockIntent) },
        { label: "Threat Level", value: titleCase(scope.threatLevel) },
        { label: "Reader Intent", value: titleCase(scope.readerIntent) },
        { label: "Status", value: statusText }
      ],
      projectSite: metadata.projectName || metadata.projectLocation || "Not documented",
      areaScope: scope.name || "Active Access Scope",
      openingDoorCount: String(scope.openingCount || scope.doorCount || scope.openings || scope.doors || "Not documented"),
      openingType: titleCase(scope.openingType),
      doorFunction: titleCase(scope.doorFunction),
      securityContext: titleCase(scope.securityLevel || scope.threatLevel),
      powerLossIntent: titleCase(scope.powerLossIntent),
      upstreamSource: "Scope Planner active scope",
      raw: scope
    };
  }

  function renderScopeDisplay(config = {}) {
    if (typeof document === "undefined") return null;

    ensureScopeDisplayStyles();

    const card = typeof config.card === "string" ? document.getElementById(config.card) : config.card;
    const titleEl = typeof config.title === "string" ? document.getElementById(config.title) : config.title;
    const descriptionEl = typeof config.description === "string" ? document.getElementById(config.description) : config.description;
    const metaEl = typeof config.meta === "string" ? document.getElementById(config.meta) : config.meta;
    const toolLabel = config.toolLabel || "Access Control Tool";

    const context = buildScopeDisplayContext(toolLabel);

    if (card) {
      card.hidden = false;
      card.dataset.scopeStatus = context.hasActiveScope ? "active" : "missing";
    }

    if (titleEl) titleEl.textContent = context.title;
    if (descriptionEl) descriptionEl.textContent = context.description;

    if (metaEl) {
      metaEl.innerHTML = context.rows.map(([label, value]) => {
        return '<div><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(value) + '</span></div>';
      }).join("");
    }

    return context;
  }

  function clearAll() {
    removeAllAccessControlReportMetadata();
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(ACTIVE_KEY);
    sessionStorage.removeItem(FLOW_KEY);
    sessionStorage.removeItem(METADATA_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(FLOW_KEY);
    localStorage.removeItem(METADATA_KEY);
    return defaultLedger();
  }

  window.ScopedLabsAccessControlScopeState = Object.freeze({
    version: API_VERSION,
    keys: Object.freeze({ STORAGE_KEY, ACTIVE_KEY, FLOW_KEY, METADATA_KEY }),
    normalizeScope,
    normalizeMetadata,
    authorityReasonsForScope,
    readMetadata,
    writeMetadata,
    readLedger,
    writeLedger,
    getActiveScope,
    upsertScope,
    setActiveScope,
    removeScope,
    buildScopeDisplayContext,
    renderScopeDisplay,
    clearAll
  });
})();
