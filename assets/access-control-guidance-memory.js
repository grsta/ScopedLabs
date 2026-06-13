(function () {
  "use strict";
  const VERSION = "access-control-summary-cleanup-0613";
  function safeParse(value) { try { return JSON.parse(value); } catch (_) { return null; } }
  function storageKeys(storage) { const out = []; if (!storage) return out; for (let i = 0; i < storage.length; i += 1) out.push(storage.key(i)); return out; }
  function listRecords() {
    const records = [];
    [window.sessionStorage, window.localStorage].forEach(function (storage) {
      storageKeys(storage).forEach(function (key) {
        if (!/access-control|ScopedLabsAccessControl|report-metadata/i.test(key || "")) return;
        const parsed = safeParse(storage.getItem(key));
        if (Array.isArray(parsed)) records.push.apply(records, parsed);
        else if (parsed && typeof parsed === "object") records.push(parsed);
      });
    });
    return records;
  }
  window.ScopedLabsAccessControlGuidanceMemory = window.ScopedLabsAccessControlGuidanceMemory || Object.freeze({ version: VERSION, listRecords: listRecords, readRecords: listRecords });
})();
