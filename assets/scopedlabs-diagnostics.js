/*!
 * ScopedLabs Diagnostics Engine
 * Local diagnostic buffer for factory engines.
 * Version: scopedlabs-diagnostics-001
 *
 * Rule: diagnostics stay local by default. No external sending.
 */
(function () {
  "use strict";

  const VERSION = "scopedlabs-diagnostics-001";
  const KEY = "scopedlabs:diagnostics:recent";
  const MAX = 80;
  const buffer = [];

  function nowIso() {
    return new Date().toISOString();
  }

  function safeString(value, fallback = "") {
    if (value === undefined || value === null) return fallback;
    return String(value);
  }

  function makeId() {
    return "SLD-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  function canUseStorage() {
    try {
      return !!window.sessionStorage;
    } catch {
      return false;
    }
  }

  function loadStored() {
    if (!canUseStorage()) return;

    try {
      const raw = window.sessionStorage.getItem(KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parsed.slice(-MAX).forEach((item) => buffer.push(item));
    } catch {}
  }

  function persist() {
    if (!canUseStorage()) return;

    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(buffer.slice(-MAX)));
    } catch {}
  }

  function normalize(input) {
    return {
      id: makeId(),
      time: nowIso(),
      code: safeString(input && input.code, "SL-DIAG-UNKNOWN"),
      severity: safeString(input && input.severity, "warn"),
      engine: safeString(input && input.engine, "unknown"),
      renderer: safeString(input && input.renderer, ""),
      tool: safeString(input && input.tool, ""),
      message: safeString(input && input.message, "No diagnostic message provided."),
      cause: safeString(input && input.cause, ""),
      fallback: safeString(input && input.fallback, ""),
      details: input && input.details && typeof input.details === "object" ? input.details : {}
    };
  }

  function report(input) {
    const record = normalize(input || {});

    buffer.push(record);
    while (buffer.length > MAX) buffer.shift();

    persist();

    const line = "[" + record.code + "] " + record.message;

    try {
      if (record.severity === "error" && console && typeof console.error === "function") {
        console.error(line, record);
      } else if (console && typeof console.warn === "function") {
        console.warn(line, record);
      }
    } catch {}

    return record;
  }

  function getRecent(limit) {
    const count = Number.isFinite(Number(limit)) ? Math.max(1, Number(limit)) : buffer.length;
    return buffer.slice(-count);
  }

  function getLast() {
    return buffer[buffer.length - 1] || null;
  }

  function clear() {
    buffer.length = 0;
    persist();
  }

  function copyLastCode() {
    const last = getLast();
    const code = last ? last.code : "";

    try {
      if (
        code &&
        window.navigator &&
        window.navigator.clipboard &&
        typeof window.navigator.clipboard.writeText === "function"
      ) {
        window.navigator.clipboard.writeText(code);
      }
    } catch {}

    return code;
  }

  loadStored();

  window.ScopedLabsDiagnostics = {
    version: VERSION,
    report,
    getRecent,
    getLast,
    clear,
    copyLastCode
  };
})();