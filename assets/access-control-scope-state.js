/* ScopedLabs Access Control Scope State
   Version: access-control-scope-state-001-foundation
   Purpose: Access Control scope/door/zone ledger inspired by the proven Physical Security Area Planner pattern.
   Notes:
   - Category-specific adapter for Access Control.
   - No auto-routing.
   - No runtime fetch.
*/
(function () {
  "use strict";

  const API_VERSION = "access-control-scope-state-001-foundation";
  const STORAGE_KEY = "scopedlabs:pipeline:access-control:scopes";
  const ACTIVE_KEY = "scopedlabs:pipeline:access-control:active-scope";
  const FLOW_KEY = "scopedlabs:pipeline:access-control:scope-planner";

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

  function safeText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function normalizeNotes(value) {
    if (Array.isArray(value)) return value.map((item) => safeText(item)).filter(Boolean);
    const text = safeText(value);
    return text ? text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) : [];
  }

  function normalizeScope(scope, index = 0) {
    const source = scope && typeof scope === "object" ? scope : {};
    const name = safeText(source.name, "Access Scope " + (index + 1));
    const id = safeText(source.id, slugify(name) + "-" + Date.now());

    return {
      ...source,
      id,
      name,
      scopeType: safeText(source.scopeType, "single-door"),
      locationType: safeText(source.locationType, "interior"),
      openingType: safeText(source.openingType, "single-door"),
      doorFunction: safeText(source.doorFunction, "staff-entry"),
      egressRole: safeText(source.egressRole, "unknown"),
      freeEgress: safeText(source.freeEgress, "unknown"),
      fireRated: safeText(source.fireRated, "unknown"),
      fireRelease: safeText(source.fireRelease, "unknown"),
      powerLossIntent: safeText(source.powerLossIntent, "unknown"),
      securityLevel: safeText(source.securityLevel, "standard"),
      threatLevel: safeText(source.threatLevel, "medium"),
      trafficLevel: safeText(source.trafficLevel, "normal"),
      readerNeed: safeText(source.readerNeed, "card-or-fob"),
      lockIntent: safeText(source.lockIntent, "unknown"),
      controllerGroup: safeText(source.controllerGroup, "unassigned"),
      restrictions: safeText(source.restrictions, ""),
      status: safeText(source.status, "PLANNING"),
      reviewFlags: Array.isArray(source.reviewFlags) ? source.reviewFlags.map(safeText).filter(Boolean) : [],
      notes: normalizeNotes(source.notes),
      completedTools: source.completedTools && typeof source.completedTools === "object" ? source.completedTools : {},
      updatedAt: source.updatedAt || new Date().toISOString()
    };
  }

  function defaultLedger() {
    return {
      schema: "scopedlabs.access-control.scope-ledger.v1",
      projectMode: "multi-scope",
      activeScopeId: null,
      scopes: [],
      updatedAt: new Date().toISOString()
    };
  }

  function readLedger() {
    const parsed = safeJsonParse(sessionStorage.getItem(STORAGE_KEY), null) ||
      safeJsonParse(localStorage.getItem(STORAGE_KEY), null);

    if (!parsed || !Array.isArray(parsed.scopes)) return defaultLedger();

    const scopes = parsed.scopes.map(normalizeScope).filter((scope) => scope && scope.id);
    if (!scopes.length) return defaultLedger();

    const activeScopeId = parsed.activeScopeId && scopes.some((scope) => scope.id === parsed.activeScopeId)
      ? parsed.activeScopeId
      : scopes[0].id;

    return {
      schema: "scopedlabs.access-control.scope-ledger.v1",
      projectMode: "multi-scope",
      activeScopeId,
      scopes,
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

    const normalized = {
      schema: "scopedlabs.access-control.scope-ledger.v1",
      projectMode: "multi-scope",
      activeScopeId,
      scopes,
      updatedAt: new Date().toISOString()
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

    const active = scopes.find((scope) => scope.id === activeScopeId) || null;
    if (active) {
      sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
    } else {
      sessionStorage.removeItem(ACTIVE_KEY);
      localStorage.removeItem(ACTIVE_KEY);
    }

    window.dispatchEvent(new CustomEvent("scopedlabs:access-control-scope-updated", { detail: normalized }));
    return normalized;
  }

  function getActiveScope() {
    const ledger = readLedger();
    return ledger.scopes.find((scope) => scope.id === ledger.activeScopeId) || null;
  }

  function upsertScope(scope) {
    const ledger = readLedger();
    const normalized = normalizeScope(scope, ledger.scopes.length);
    const existingIndex = ledger.scopes.findIndex((item) => item.id === normalized.id);

    if (existingIndex >= 0) {
      ledger.scopes[existingIndex] = {
        ...ledger.scopes[existingIndex],
        ...normalized,
        updatedAt: new Date().toISOString()
      };
    } else {
      ledger.scopes.push({ ...normalized, updatedAt: new Date().toISOString() });
    }

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
    const ledger = readLedger();
    ledger.scopes = ledger.scopes.filter((scope) => scope.id !== scopeId);
    if (ledger.activeScopeId === scopeId) ledger.activeScopeId = ledger.scopes[0]?.id || null;
    return writeLedger(ledger);
  }

  function saveRouteIntent(intent = {}) {
    const normalized = {
      ...intent,
      schema: "scopedlabs.access-control.route-intent.v1",
      updatedAt: new Date().toISOString()
    };
    sessionStorage.setItem(FLOW_KEY, JSON.stringify(normalized));
    localStorage.setItem(FLOW_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function readRouteIntent() {
    return safeJsonParse(sessionStorage.getItem(FLOW_KEY), null) ||
      safeJsonParse(localStorage.getItem(FLOW_KEY), null);
  }

  function summarizeScope(scope) {
    const item = normalizeScope(scope || {});
    const flags = Array.isArray(item.reviewFlags) ? item.reviewFlags : [];
    return [
      item.name + " (" + item.scopeType + ")",
      "Function: " + item.doorFunction,
      "Egress: " + item.egressRole + ", free egress: " + item.freeEgress,
      "Fire: rated " + item.fireRated + ", release " + item.fireRelease,
      "Security: " + item.securityLevel + ", threat " + item.threatLevel,
      flags.length ? "Review flags: " + flags.join("; ") : "Review flags: none recorded"
    ].join("\n");
  }

  window.ScopedLabsAccessControlScopeState = Object.freeze({
    version: API_VERSION,
    keys: Object.freeze({ STORAGE_KEY, ACTIVE_KEY, FLOW_KEY }),
    normalizeScope,
    readLedger,
    writeLedger,
    getActiveScope,
    upsertScope,
    setActiveScope,
    removeScope,
    saveRouteIntent,
    readRouteIntent,
    summarizeScope
  });
})();
