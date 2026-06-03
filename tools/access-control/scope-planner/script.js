(() => {
  "use strict";

  const NEXT_TOOL = "/tools/access-control/fail-safe-fail-secure/";
  const state = window.ScopedLabsAccessControlScopeState;

  const $ = (id) => document.getElementById(id);
  const fields = [
    "scopeId", "scopeName", "scopeType", "locationType", "openingType", "doorFunction", "egressRole", "freeEgress",
    "fireRated", "fireRelease", "powerLossIntent", "securityLevel", "threatLevel", "trafficLevel", "readerNeed", "lockIntent",
    "controllerGroup", "restrictions", "scopeNotes"
  ];

  const els = Object.fromEntries(fields.map((id) => [id, $(id)]));
  els.activeScopeSummary = $("activeScopeSummary");
  els.scopeLedger = $("scopeLedger");
  els.scopeStatus = $("scopeStatus");
  els.saveScope = $("saveScope");
  els.newScope = $("newScope");
  els.startFailSafe = $("startFailSafe");
  els.startFailSafeTop = $("startFailSafeTop");
  els.useActiveScope = $("useActiveScope");
  els.copyScopeSummary = $("copyScopeSummary");

  function setStatus(message) {
    if (!els.scopeStatus) return;
    els.scopeStatus.textContent = message || "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function label(value) {
    return String(value || "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function calculateReviewFlags(data) {
    const flags = [];
    const egressSensitive = ["egress", "exit-door", "stairwell", "corridor"].includes(data.egressRole) ||
      ["stairwell-door", "corridor-door"].includes(data.openingType) ||
      data.doorFunction === "stairwell-egress";

    if (data.egressRole === "unknown") flags.push("Required egress role unknown; code/AHJ review needed.");
    if (data.freeEgress === "unknown") flags.push("Free mechanical egress not confirmed.");
    if (data.freeEgress === "no") flags.push("Special locking or restricted egress condition may apply.");
    if (egressSensitive && data.fireRelease === "unknown") flags.push("Fire alarm release behavior unknown for an egress-sensitive opening.");
    if (data.fireRated === "unknown") flags.push("Fire-rated opening status unknown.");
    if (data.lockIntent === "maglock" && data.freeEgress !== "yes") flags.push("Maglock intent without confirmed free egress requires review.");
    if (data.securityLevel === "critical" && data.egressRole === "unknown") flags.push("Critical scope with unknown egress role.");
    if (data.powerLossIntent === "unknown") flags.push("Power loss behavior should be resolved in Fail-Safe / Fail-Secure.");

    return flags;
  }

  function statusFromFlags(flags) {
    if (flags.some((flag) => /special|egress|fire|maglock|critical/i.test(flag))) return "RISK";
    return flags.length ? "WATCH" : "PLANNING";
  }

  function collectScope() {
    const data = {
      id: els.scopeId.value || undefined,
      name: els.scopeName.value.trim() || "Access Scope",
      scopeType: els.scopeType.value,
      locationType: els.locationType.value,
      openingType: els.openingType.value,
      doorFunction: els.doorFunction.value,
      egressRole: els.egressRole.value,
      freeEgress: els.freeEgress.value,
      fireRated: els.fireRated.value,
      fireRelease: els.fireRelease.value,
      powerLossIntent: els.powerLossIntent.value,
      securityLevel: els.securityLevel.value,
      threatLevel: els.threatLevel.value,
      trafficLevel: els.trafficLevel.value,
      readerNeed: els.readerNeed.value,
      lockIntent: els.lockIntent.value,
      controllerGroup: els.controllerGroup.value.trim() || "unassigned",
      restrictions: els.restrictions.value.trim(),
      notes: els.scopeNotes.value.trim()
    };
    data.reviewFlags = calculateReviewFlags(data);
    data.status = statusFromFlags(data.reviewFlags);
    return data;
  }

  function hydrate(scope) {
    if (!scope) return;
    els.scopeId.value = scope.id || "";
    els.scopeName.value = scope.name || "Access Scope";
    els.scopeType.value = scope.scopeType || "single-door";
    els.locationType.value = scope.locationType || "interior";
    els.openingType.value = scope.openingType || "single-door";
    els.doorFunction.value = scope.doorFunction || "staff-entry";
    els.egressRole.value = scope.egressRole || "unknown";
    els.freeEgress.value = scope.freeEgress || "unknown";
    els.fireRated.value = scope.fireRated || "unknown";
    els.fireRelease.value = scope.fireRelease || "unknown";
    els.powerLossIntent.value = scope.powerLossIntent || "unknown";
    els.securityLevel.value = scope.securityLevel || "standard";
    els.threatLevel.value = scope.threatLevel || "medium";
    els.trafficLevel.value = scope.trafficLevel || "normal";
    els.readerNeed.value = scope.readerNeed || "card-or-fob";
    els.lockIntent.value = scope.lockIntent || "unknown";
    els.controllerGroup.value = scope.controllerGroup || "unassigned";
    els.restrictions.value = scope.restrictions || "";
    els.scopeNotes.value = Array.isArray(scope.notes) ? scope.notes.join("\n") : "";
  }

  function newScope() {
    els.scopeId.value = "";
    els.scopeName.value = "Access Scope " + (state.readLedger().scopes.length + 1);
    els.scopeType.value = "single-door";
    els.locationType.value = "interior";
    els.openingType.value = "single-door";
    els.doorFunction.value = "staff-entry";
    els.egressRole.value = "unknown";
    els.freeEgress.value = "unknown";
    els.fireRated.value = "unknown";
    els.fireRelease.value = "unknown";
    els.powerLossIntent.value = "unknown";
    els.securityLevel.value = "standard";
    els.threatLevel.value = "medium";
    els.trafficLevel.value = "normal";
    els.readerNeed.value = "card-or-fob";
    els.lockIntent.value = "unknown";
    els.controllerGroup.value = "unassigned";
    els.restrictions.value = "";
    els.scopeNotes.value = "";
    setStatus("New scope draft ready.");
  }

  function saveScope() {
    const scope = collectScope();
    const ledger = state.upsertScope(scope);
    const active = ledger.scopes.find((item) => item.id === ledger.activeScopeId);
    if (active) hydrate(active);
    render();
    setStatus("Scope saved and set active.");
    return active || scope;
  }

  function goFailSafe() {
    const active = saveScope();
    state.saveRouteIntent({ from: "scope-planner", to: "fail-safe-fail-secure", activeScopeId: active.id });
    window.location.href = NEXT_TOOL;
  }

  function renderActive() {
    const active = state.getActiveScope();
    if (!active) {
      els.activeScopeSummary.textContent = "No active scope yet. Create one below.";
      return;
    }

    const flags = active.reviewFlags || [];
    els.activeScopeSummary.innerHTML = '' +
      '<div class="access-scope-summary-grid">' +
        '<div><strong>Name</strong><span>' + escapeHtml(active.name) + '</span></div>' +
        '<div><strong>Type</strong><span>' + escapeHtml(label(active.scopeType)) + '</span></div>' +
        '<div><strong>Egress</strong><span>' + escapeHtml(label(active.egressRole)) + '</span></div>' +
        '<div><strong>Status</strong><span>' + escapeHtml(active.status) + '</span></div>' +
      '</div>' +
      (flags.length ? '<ul class="access-scope-flags">' + flags.map((flag) => '<li>' + escapeHtml(flag) + '</li>').join('') + '</ul>' : '<p class="muted">No review flags recorded for this scope.</p>');
  }

  function renderLedger() {
    const ledger = state.readLedger();
    if (!ledger.scopes.length) {
      els.scopeLedger.innerHTML = '<p class="muted">No scopes saved yet.</p>';
      return;
    }

    els.scopeLedger.innerHTML = ledger.scopes.map((scope) => {
      const active = scope.id === ledger.activeScopeId;
      return '<article class="access-scope-card' + (active ? ' is-active' : '') + '">' +
        '<div class="access-scope-card-head"><h3>' + escapeHtml(scope.name) + '</h3><span>' + escapeHtml(scope.status) + '</span></div>' +
        '<p class="muted">' + escapeHtml(label(scope.scopeType)) + ' ? ' + escapeHtml(label(scope.doorFunction)) + '</p>' +
        '<div class="access-scope-card-meta"><div><strong>Egress</strong><span>' + escapeHtml(label(scope.egressRole)) + '</span></div><div><strong>Fire release</strong><span>' + escapeHtml(label(scope.fireRelease)) + '</span></div><div><strong>Security</strong><span>' + escapeHtml(label(scope.securityLevel)) + '</span></div><div><strong>Reader</strong><span>' + escapeHtml(label(scope.readerNeed)) + '</span></div></div>' +
        '<div class="actions"><button class="btn btn-primary" type="button" data-use-scope="' + escapeHtml(scope.id) + '">Use Scope</button><button class="btn btn-ghost" type="button" data-edit-scope="' + escapeHtml(scope.id) + '">Edit</button><button class="btn btn-ghost" type="button" data-delete-scope="' + escapeHtml(scope.id) + '">Delete</button></div>' +
      '</article>';
    }).join('');
  }

  function render() {
    renderActive();
    renderLedger();
  }

  async function copySummary() {
    const active = state.getActiveScope();
    if (!active) {
      setStatus("Create a scope before copying a summary.");
      return;
    }

    const text = state.summarizeScope(active);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied scope summary.");
    } catch {
      setStatus("Copy failed. Browser clipboard permission may be blocked.");
    }
  }

  function bindLedgerClicks(event) {
    const use = event.target.closest("[data-use-scope]");
    const edit = event.target.closest("[data-edit-scope]");
    const del = event.target.closest("[data-delete-scope]");
    const ledger = state.readLedger();

    if (use) {
      state.setActiveScope(use.getAttribute("data-use-scope"));
      render();
      setStatus("Active scope updated.");
      return;
    }

    if (edit) {
      const scope = ledger.scopes.find((item) => item.id === edit.getAttribute("data-edit-scope"));
      if (scope) {
        state.setActiveScope(scope.id);
        hydrate(scope);
        render();
        document.getElementById("scopeFormTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
        setStatus("Scope loaded for editing.");
      }
      return;
    }

    if (del) {
      state.removeScope(del.getAttribute("data-delete-scope"));
      render();
      setStatus("Scope deleted.");
    }
  }

  function init() {
    if (!state) throw new Error("Access Control scope state is not loaded.");

    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    const active = state.getActiveScope();
    if (active) hydrate(active);
    render();

    els.saveScope?.addEventListener("click", saveScope);
    els.newScope?.addEventListener("click", newScope);
    els.startFailSafe?.addEventListener("click", goFailSafe);
    els.startFailSafeTop?.addEventListener("click", goFailSafe);
    els.useActiveScope?.addEventListener("click", () => {
      saveScope();
      setStatus("Active scope is ready for downstream tools.");
    });
    els.copyScopeSummary?.addEventListener("click", copySummary);
    els.scopeLedger?.addEventListener("click", bindLedgerClicks);
  }

  init();
})();
