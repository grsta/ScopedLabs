(() => {
  "use strict";

  const CATEGORY = "access-control";
  const NEXT_URL = "/tools/access-control/fail-safe-fail-secure/";

  const $ = (id) => document.getElementById(id);

  const els = {
        scopeName: $("scopeName"),
    scopeType: $("scopeType"),
    planningPath: $("planningPath"),
    openingType: $("openingType"),
    locationType: $("locationType"),
    doorFunction: $("doorFunction"),
    egressRole: $("egressRole"),
    freeEgress: $("freeEgress"),
    fireRated: $("fireRated"),
    fireRelease: $("fireRelease"),
    powerLossIntent: $("powerLossIntent"),
    lockIntent: $("lockIntent"),
    readerIntent: $("readerIntent"),
    securityLevel: $("securityLevel"),
    threatLevel: $("threatLevel"),
    trafficLevel: $("trafficLevel"),
    controllerGroup: $("controllerGroup"),
    restrictions: $("restrictions"),
    scopeNotes: $("scopeNotes"),

    saveScope: $("saveScope"),
    newScope: $("newScope"),
    resetScopes: $("resetScopes"),
    scopeList: $("scopeList"),
    scopeStatus: $("scopeStatus"),
    scopeCountLabel: $("scopeCountLabel"),
    scopeSummary: $("scopeSummary"),
    printSummary: $("printScopeSummary"),
    copySummary: $("copyScopeSummary"),
    continueBtn: $("continue"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  let editingScopeId = null;

  function hasStoredAuth() {
    try {
      const key = Object.keys(localStorage).find((item) => item.startsWith("sb-"));
      if (!key) return false;
      const raw = JSON.parse(localStorage.getItem(key));
      return !!(
        raw?.access_token ||
        raw?.currentSession?.access_token ||
        (Array.isArray(raw) ? raw[0]?.access_token : null)
      );
    } catch {
      return false;
    }
  }

  function getUnlockedCategories() {
    try {
      const raw = localStorage.getItem("sl_unlocked_categories");
      if (!raw) return [];
      return raw.split(",").map((item) => String(item).trim().toLowerCase()).filter(Boolean);
    } catch {
      return [];
    }
  }

  function unlockCategoryPage() {
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(CATEGORY);

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }


  function state() {
    return window.ScopedLabsAccessControlScopeState;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function titleCase(value) {
    return String(value || "n/a")
      .replace(/-/g, " | ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function status(message) {
    if (els.scopeStatus) els.scopeStatus.textContent = message || "";
  }

  function scrollScopePlannerTarget(target, options = {}) {
    const el = typeof target === "string" ? document.getElementById(target) : target;
    if (!el || typeof el.scrollIntoView !== "function") return;

    const focusTarget = options.focusId ? document.getElementById(options.focusId) : null;
    const block = options.block || "center";

    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block, inline: "nearest" });

      if (focusTarget && typeof focusTarget.focus === "function") {
        window.setTimeout(() => {
          try { focusTarget.focus({ preventScroll: true }); } catch { focusTarget.focus(); }
        }, 180);
      }
    });
  }


  function branchKey(scope) {
    if (!scope) return "core";
    if (scope.scopeType === "elevator-bank" || scope.planningPath === "elevator-bank") return "elevator";
    if (scope.scopeType === "anti-passback-zone" || scope.planningPath === "anti-passback-zone") return "antiPassback";
    if (
      scope.scopeType === "high-security-room" ||
      scope.planningPath === "high-security-door" ||
      scope.planningPath === "egress-review" ||
      scope.scopeType === "egress-path" ||
      scope.freeEgress === "no" ||
      scope.lockIntent === "maglock"
    ) return "special";
    return "core";
  }

  function branchLabel(key) {
    const labels = {
      core: "Core Door Scope",
      elevator: "Elevator Bank Scope",
      antiPassback: "Anti-Passback Zone",
      special: "Special Locking / High-Security Scope"
    };
    return labels[key] || labels.core;
  }

  function branchPluralLabel(key) {
    const labels = {
      core: "Core Door Scopes",
      elevator: "Elevator Bank Scopes",
      antiPassback: "Anti-Passback Zones",
      special: "Special Locking / High-Security Scopes"
    };
    return labels[key] || labels.core;
  }

  function branchDescription(key) {
    const descriptions = {
      core: "Direct Access Control pipeline scopes. These continue through fail-state behavior, reader selection, lock power, panel capacity, access levels, and final summary.",
      elevator: "Optional specialty branch scopes for elevator reader or floor-access planning. These still roll into the final Access Control summary.",
      antiPassback: "Optional specialty branch scopes for anti-passback logic, controlled zones, or directional access rules. These still roll into the final Access Control summary.",
      special: "Optional review scopes for high-security, maglock, egress-sensitive, fire-release, or special-locking conditions. These carry authority-review flags into the final Access Control summary."
    };
    return descriptions[key] || descriptions.core;
  }

  function branchNextAction(scope) {
    if (!scope) return "Save a scope before continuing.";
    if (branchKey(scope) === "elevator") return "Run Elevator Reader Count when this specialty lane is ready.";
    if (branchKey(scope) === "antiPassback") return "Run Anti-Passback Zones when this specialty lane is ready.";
    if (branchKey(scope) === "special") return "Resolve authority-review assumptions before final design approval.";
    return "Continue to Fail-Safe / Fail-Secure.";
  }

  function completedCheckCount(scope) {
    const completed = scope && scope.completedTools && typeof scope.completedTools === "object" ? scope.completedTools : {};
    return Object.keys(completed).filter((key) => completed[key]).length;
  }


  function scopePathContinueLabel(value) {
    if (value === "elevator-bank") return "Elevator Reader Count";
    if (value === "anti-passback-zone") return "Anti-Passback Zones";
    return "Fail-Safe / Fail-Secure";
  }

  function scopePathUrl(value) {
    if (value === "elevator-bank") return "/tools/access-control/elevator-reader-count/";
    if (value === "anti-passback-zone") return "/tools/access-control/anti-passback-zones/";
    return NEXT_URL;
  }

  function updateContinueButton(ledger) {
    if (!els.continueBtn) return;
    const active = getActiveScopeFromLedger(ledger);
    els.continueBtn.innerHTML = "Continue &rarr; " + escapeHtml(scopePathContinueLabel(active && active.planningPath));
  }

  function getActiveScopeFromLedger(ledger) {
    if (!ledger || !Array.isArray(ledger.scopes) || !ledger.activeScopeId) return null;
    return ledger.scopes.find((scope) => scope && scope.id === ledger.activeScopeId) || null;
  }

  function collectMetadata() {
    return {
      reportName: els.reportName?.value || "Access Control Scope Summary",
      clientName: els.clientName?.value || "",
      projectName: els.projectName?.value || "",
      projectLocation: els.projectLocation?.value || "",
      preparedBy: els.preparedBy?.value || "",
      reportNotes: els.reportNotes?.value || ""
    };
  }

  function hydrateMetadata(metadata) {
    const data = state()?.normalizeMetadata?.(metadata || {}) || {};
    if (els.reportName) els.reportName.value = data.reportName || "Access Control Scope Summary";
    if (els.clientName) els.clientName.value = data.clientName || "";
    if (els.projectName) els.projectName.value = data.projectName || "";
    if (els.projectLocation) els.projectLocation.value = data.projectLocation || "";
    if (els.preparedBy) els.preparedBy.value = data.preparedBy || "";
    if (els.reportNotes) els.reportNotes.value = data.reportNotes || "";
  }

  function scopeFromForm() {
    return {
      id: editingScopeId || undefined,
      name: els.scopeName?.value || "Access Scope",
      scopeType: els.scopeType?.value || "single-door",
      planningPath: els.planningPath?.value || "core-door",
      openingType: els.openingType?.value || "single-door",
      locationType: els.locationType?.value || "interior",
      doorFunction: els.doorFunction?.value || "staff-entry",
      egressRole: els.egressRole?.value || "unknown",
      freeEgress: els.freeEgress?.value || "unknown",
      fireRated: els.fireRated?.value || "unknown",
      fireRelease: els.fireRelease?.value || "unknown",
      powerLossIntent: els.powerLossIntent?.value || "unknown",
      lockIntent: els.lockIntent?.value || "unknown",
      readerIntent: els.readerIntent?.value || "card-or-fob",
      securityLevel: els.securityLevel?.value || "standard",
      threatLevel: els.threatLevel?.value || "medium",
      trafficLevel: els.trafficLevel?.value || "normal",
      controllerGroup: els.controllerGroup?.value || "unassigned",
      restrictions: els.restrictions?.value || "",
      notes: els.scopeNotes?.value || "",
      sourceMode: "scope-planner"
    };
  }

  function hydrateScopeForm(scope) {
    if (!scope) return;
    editingScopeId = scope.id;
    if (els.scopeName) els.scopeName.value = scope.name || "";
    if (els.scopeType) els.scopeType.value = scope.scopeType || "single-door";
    if (els.planningPath) els.planningPath.value = scope.planningPath || "core-door";
    if (els.openingType) els.openingType.value = scope.openingType || "single-door";
    if (els.locationType) els.locationType.value = scope.locationType || "interior";
    if (els.doorFunction) els.doorFunction.value = scope.doorFunction || "staff-entry";
    if (els.egressRole) els.egressRole.value = scope.egressRole || "unknown";
    if (els.freeEgress) els.freeEgress.value = scope.freeEgress || "unknown";
    if (els.fireRated) els.fireRated.value = scope.fireRated || "unknown";
    if (els.fireRelease) els.fireRelease.value = scope.fireRelease || "unknown";
    if (els.powerLossIntent) els.powerLossIntent.value = scope.powerLossIntent || "unknown";
    if (els.lockIntent) els.lockIntent.value = scope.lockIntent || "unknown";
    if (els.readerIntent) els.readerIntent.value = scope.readerIntent || "card-or-fob";
    if (els.securityLevel) els.securityLevel.value = scope.securityLevel || "standard";
    if (els.threatLevel) els.threatLevel.value = scope.threatLevel || "medium";
    if (els.trafficLevel) els.trafficLevel.value = scope.trafficLevel || "normal";
    if (els.controllerGroup) els.controllerGroup.value = scope.controllerGroup || "unassigned";
    if (els.restrictions) els.restrictions.value = scope.restrictions || "";
    if (els.scopeNotes) els.scopeNotes.value = Array.isArray(scope.notes) ? scope.notes.join("\n") : "";
  }

  function clearScopeForm(name = "Main Entry Door") {
    editingScopeId = null;
    if (els.scopeName) els.scopeName.value = name;
    if (els.scopeType) els.scopeType.value = "single-door";
    if (els.planningPath) els.planningPath.value = "core-door";
    if (els.openingType) els.openingType.value = "single-door";
    if (els.locationType) els.locationType.value = "interior";
    if (els.doorFunction) els.doorFunction.value = "staff-entry";
    if (els.egressRole) els.egressRole.value = "unknown";
    if (els.freeEgress) els.freeEgress.value = "unknown";
    if (els.fireRated) els.fireRated.value = "unknown";
    if (els.fireRelease) els.fireRelease.value = "unknown";
    if (els.powerLossIntent) els.powerLossIntent.value = "unknown";
    if (els.lockIntent) els.lockIntent.value = "unknown";
    if (els.readerIntent) els.readerIntent.value = "card-or-fob";
    if (els.securityLevel) els.securityLevel.value = "standard";
    if (els.threatLevel) els.threatLevel.value = "medium";
    if (els.trafficLevel) els.trafficLevel.value = "normal";
    if (els.controllerGroup) els.controllerGroup.value = "unassigned";
    if (els.restrictions) els.restrictions.value = "";
    if (els.scopeNotes) els.scopeNotes.value = "";
  }

  function validateScopeForm() {
    const name = String(els.scopeName?.value || "").trim();
    if (!name) {
      status("Enter a scope name before saving.");
      els.scopeName?.focus?.();
      return false;
    }
    return true;
  }

  function saveScope() {
    const api = state();
    if (!api) return false;
    if (!validateScopeForm()) return false;

    const scope = scopeFromForm();
    const ledgerBefore = api.readLedger();
    const normalized = api.normalizeScope(scope, ledgerBefore.scopes.length);
    const ledger = api.upsertScope(normalized);
    api.writeLedger(ledger);

    editingScopeId = normalized.id;
    status(normalized.name + " saved as the active access scope.");
    render();
    return true;
  }

  function newScope() {
    const ledger = state()?.readLedger();
    const next = (ledger?.scopes?.length || 0) + 1;
    clearScopeForm("Access Scope " + next);
    status("Enter assumptions for the new access scope, then save it.");
    scrollScopePlannerTarget("toolCard", { block: "start", focusId: "scopeName" });
  }

  function confirmResetScopePlan() {
    if (typeof window === "undefined" || typeof window.confirm !== "function") return true;

    return window.confirm([
      "Reset Access Scope Plan?",
      "This will delete all saved Access Control scopes and clear the current Access Control scope planner memory, including report metadata.",
      "This does not delete saved account snapshots.",
      "Continue?"
    ].join(String.fromCharCode(10, 10)));
  }

  function resetScopes() {
    if (!confirmResetScopePlan()) {
      status("Scope plan reset canceled.");
      return;
    }

    state()?.clearAll?.();
    editingScopeId = null;
    hydrateMetadata({});
    clearScopeForm("Main Entry Door");
    status("Scope plan reset. Enter the first door or zone above, then save it.");
    render();
  }

  function renderScopeList(ledger) {
    if (!els.scopeList) return;

    const scopes = Array.isArray(ledger?.scopes) ? ledger.scopes : [];
    if (els.scopeCountLabel) els.scopeCountLabel.textContent = scopes.length + (scopes.length === 1 ? " scope" : " scopes");

    if (!scopes.length) {
      els.scopeList.innerHTML = '<p class="muted">No access scopes saved yet.</p>';
      return;
    }

    els.scopeList.innerHTML = scopes.map((scope) => {
      const active = scope.id === ledger.activeScopeId;
      const key = branchKey(scope);
      const checks = completedCheckCount(scope);

      return [
        '<article class="access-scope-card' + (active ? ' is-active' : '') + '">',
        '<div class="access-scope-mini-flow">',
        '<span>' + escapeHtml(active ? "Active Scope" : "Saved Scope") + '</span>',
        '<span class="arrow">&rarr;</span>',
        '<span>' + escapeHtml(branchLabel(key)) + '</span>',
        '<span class="arrow">&rarr;</span>',
        '<span>' + escapeHtml(scope.status === "AUTHORITY REVIEW" ? "Planning" : titleCase(scope.status || "Planning")) + '</span>',
        '</div>',
        '<h3>' + escapeHtml(scope.name) + '</h3>',
        '<p class="muted">' + escapeHtml(titleCase(scope.scopeType)) + ' | ' + escapeHtml(titleCase(scope.doorFunction)) + '</p>',
        '<div class="access-scope-meta">',
        '<div><strong>Path</strong>' + escapeHtml(scopePathContinueLabel(scope.planningPath)) + '</div>',
        '<div><strong>Egress</strong>' + escapeHtml(titleCase(scope.egressRole)) + '</div>',
        '<div><strong>Lock Intent</strong>' + escapeHtml(titleCase(scope.lockIntent)) + '</div>',
        '<div><strong>Pipeline Progress</strong>' + checks + ' checks</div>',
        '<div><strong>Next Result</strong>' + escapeHtml(branchNextAction(scope)) + '</div>',
        '</div>',
        '<div class="btn-row" style="margin-top: 12px;">',
        '<button class="btn btn-primary" type="button" data-scope-use="' + escapeHtml(scope.id) + '">Use Scope</button>',
        '<button class="btn" type="button" data-scope-edit="' + escapeHtml(scope.id) + '">Edit</button>',
        '<button class="btn" type="button" data-scope-delete="' + escapeHtml(scope.id) + '">Delete</button>',
        '</div>',
        '</article>'
      ].join("");
    }).join("");
  }


  function renderScopeSummary(ledger) {
    if (!els.scopeSummary) return;

    const scopes = Array.isArray(ledger?.scopes) ? ledger.scopes : [];
    const active = getActiveScopeFromLedger(ledger);

    if (!scopes.length) {
      els.scopeSummary.innerHTML = '<p class="muted">Save at least one access scope to build the summary.</p>';
      return;
    }

    const groups = {
      core: scopes.filter((scope) => branchKey(scope) === "core"),
      elevator: scopes.filter((scope) => branchKey(scope) === "elevator"),
      antiPassback: scopes.filter((scope) => branchKey(scope) === "antiPassback"),
      special: scopes.filter((scope) => branchKey(scope) === "special")
    };

    const authorityCount = scopes.filter((scope) => scope.requiresAuthorityReview).length;
    const plannedReaders = scopes.filter((scope) => scope.readerIntent && scope.readerIntent !== "unknown").length;
    const plannedLocks = scopes.filter((scope) => scope.lockIntent && scope.lockIntent !== "unknown").length;
    const completedChecks = scopes.reduce((sum, scope) => sum + completedCheckCount(scope), 0);

    function branchTable(key, items) {
      const countLabel = items.length + (items.length === 1 ? " ITEM" : " ITEMS");
      const emptyLabel = {
        core: "No core door scopes have been defined yet.",
        elevator: "No elevator bank scopes have been defined yet.",
        antiPassback: "No anti-passback zones have been defined yet.",
        special: "No special locking or high-security scopes have been defined yet."
      }[key] || "No scopes have been defined yet.";

      const rows = items.length ? items.map((scope) => {
        const selected = scope.id === ledger.activeScopeId ? "Active Scope" : "Saved Scope";
        const checks = completedCheckCount(scope);
        const savedResult = [
          "Egress: " + titleCase(scope.egressRole),
          "Lock: " + titleCase(scope.lockIntent),
          "Reader: " + titleCase(scope.readerIntent)
        ].join("; ");

        return [
          '<tr>',
          '<td><strong>' + escapeHtml(scope.name) + '</strong><br><span class="muted">' + escapeHtml(titleCase(scope.scopeType)) + ' | ' + escapeHtml(titleCase(scope.doorFunction)) + '</span></td>',
          '<td>' + escapeHtml(selected) + '</td>',
          '<td>' + escapeHtml(scope.status || "PLANNING") + '</td>',
          '<td>' + checks + '</td>',
          '<td>' + escapeHtml(savedResult) + '</td>',
          '<td>' + escapeHtml(branchNextAction(scope)) + '</td>',
          '</tr>'
        ].join("");
      }).join("") : '<tr><td colspan="6">' + escapeHtml(emptyLabel) + '</td></tr>';

      return [
        '<section class="access-scope-summary-branch">',
        '<div class="access-scope-summary-branch-head">',
        '<h3>' + escapeHtml(branchPluralLabel(key)) + '</h3>',
        '<span class="access-scope-summary-branch-count">' + escapeHtml(countLabel) + '</span>',
        '</div>',
        '<p class="access-scope-branch-description">' + escapeHtml(branchDescription(key)) + '</p>',
        '<table class="access-scope-summary-table">',
        '<thead><tr>',
        '<th>Scope / Door</th>',
        '<th>Selected</th>',
        '<th>Status</th>',
        '<th>Checks</th>',
        '<th>Key Saved Result</th>',
        '<th>Next Action</th>',
        '</tr></thead>',
        '<tbody>' + rows + '</tbody>',
        '</table>',
        '</section>'
      ].join("");
    }

    els.scopeSummary.innerHTML = [
      '<div class="access-scope-summary-rollup">',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Scopes</span><span class="access-scope-summary-value">' + scopes.length + '</span><div class="access-scope-summary-note">Defined access doors and specialty zones.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Core Door Scopes</span><span class="access-scope-summary-value">' + groups.core.length + '</span><div class="access-scope-summary-note">Direct Access Control pipeline scopes.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Specialty Branches</span><span class="access-scope-summary-value">' + (groups.elevator.length + groups.antiPassback.length + groups.special.length) + '</span><div class="access-scope-summary-note">Elevator, anti-passback, and special review lanes.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Needs Review</span><span class="access-scope-summary-value">' + authorityCount + '</span><div class="access-scope-summary-note">Authority/AHJ/code review flags.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Planned Readers</span><span class="access-scope-summary-value">' + plannedReaders + '</span><div class="access-scope-summary-note">Scopes with reader intent selected.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Planned Locks</span><span class="access-scope-summary-value">' + plannedLocks + '</span><div class="access-scope-summary-note">Scopes with lock intent selected.</div></div>',
      '</div>',
      active ? '<div class="access-scope-warn"><strong>Active scope:</strong> ' + escapeHtml(active.name) + ' continues to ' + escapeHtml(scopePathContinueLabel(active.planningPath)) + '.</div>' : '',
      authorityCount ? '<div class="access-authority-caution"><strong>Authority review caution:</strong> One or more scopes may involve egress, fire-rated openings, fire alarm release, maglocks, special locking, elevator lobby locking, panic hardware, or AHJ/code interpretation. Treat this as planning guidance only. Final approval must come from applicable code review, the authority having jurisdiction, fire marshal/AHJ, qualified professional review, and manufacturer-listed hardware documentation.</div>' : '',
      branchTable("core", groups.core),
      branchTable("elevator", groups.elevator),
      branchTable("antiPassback", groups.antiPassback),
      branchTable("special", groups.special)
    ].join("");
  }


  function render() {
    const api = state();
    if (!api) return;

    const ledger = api.readLedger();
    hydrateMetadata(ledger.metadata);
    renderScopeList(ledger);
    renderScopeSummary(ledger);
    updateContinueButton(ledger);
  }

  function editScope(scopeId) {
    const ledger = state()?.readLedger();
    const scope = ledger?.scopes?.find((item) => item.id === scopeId);
    if (!scope) return;

    state()?.setActiveScope(scope.id);
    hydrateScopeForm(scope);
    render();
    status(scope.name + " loaded for editing.");
    scrollScopePlannerTarget("toolCard", { block: "start", focusId: "scopeName" });
  }

  function useScope(scopeId) {
    const ledger = state()?.setActiveScope(scopeId);
    const scope = getActiveScopeFromLedger(ledger);
    if (scope) {
      hydrateScopeForm(scope);
      status(scope.name + " set as the active access scope.");
    }
    render();
    scrollScopePlannerTarget("accessScopeFlowActions", { block: "center" });
  }

  function deleteScope(scopeId) {
    const ledger = state()?.removeScope(scopeId);
    const active = getActiveScopeFromLedger(ledger);
    if (active) hydrateScopeForm(active);
    else clearScopeForm("Main Entry Door");
    status("Scope deleted.");
    render();
  }

  function continueFlow() {
    const api = state();
    if (!api) return;

    const ledger = api.readLedger();
    const active = getActiveScopeFromLedger(ledger);

    if (!active) {
      if (!saveScope()) return;
    } else {
      api.writeLedger({ ...ledger, metadata: collectMetadata() });
    }

    const nextLedger = api.readLedger();
    const nextActive = getActiveScopeFromLedger(nextLedger);
    window.location.href = scopePathUrl(nextActive && nextActive.planningPath);
  }

  function printSummary() {
    const ledger = state()?.readLedger();
    if (!ledger || !Array.isArray(ledger.scopes) || !ledger.scopes.length) {
      status("Save at least one scope before printing the summary.");
      return;
    }

    document.body.classList.add("print-access-scope-summary");
    window.print();
    window.setTimeout(() => document.body.classList.remove("print-access-scope-summary"), 500);
  }

  function buildClientSummary() {
    const ledger = state()?.readLedger();
    const scopes = Array.isArray(ledger?.scopes) ? ledger.scopes : [];
    const metadata = ledger?.metadata || {};
    const lines = [];

    lines.push(metadata.reportName || "Access Control Scope Summary");
    if (metadata.clientName) lines.push("Client: " + metadata.clientName);
    if (metadata.projectName) lines.push("Project: " + metadata.projectName);
    if (metadata.projectLocation) lines.push("Location: " + metadata.projectLocation);
    if (metadata.preparedBy) lines.push("Prepared by: " + metadata.preparedBy);
    if (metadata.reportNotes) lines.push("Report notes: " + metadata.reportNotes);
    lines.push("");
    lines.push("Saved scopes: " + scopes.length);

    scopes.forEach((scope, index) => {
      lines.push("");
      lines.push((index + 1) + ". " + scope.name);
      lines.push("Type: " + titleCase(scope.scopeType));
      lines.push("Path: " + scopePathContinueLabel(scope.planningPath));
      lines.push("Egress: " + titleCase(scope.egressRole) + "; free egress: " + titleCase(scope.freeEgress));
      lines.push("Fire: rated " + titleCase(scope.fireRated) + "; release " + titleCase(scope.fireRelease));
      lines.push("Lock / reader: " + titleCase(scope.lockIntent) + " / " + titleCase(scope.readerIntent));
      lines.push("Security: " + titleCase(scope.securityLevel) + "; threat: " + titleCase(scope.threatLevel) + "; traffic: " + titleCase(scope.trafficLevel));
      if (scope.restrictions) lines.push("Restrictions: " + scope.restrictions);
      if (Array.isArray(scope.authorityReviewReasons) && scope.authorityReviewReasons.length) {
        lines.push("Authority review flags: " + scope.authorityReviewReasons.join("; "));
      }
    });

    if (scopes.some((scope) => scope.requiresAuthorityReview)) {
      lines.push("");
      lines.push("Authority review caution: Some scopes may involve egress, fire-rated openings, fire alarm release, maglocks, special locking, elevator lobby locking, panic hardware, or AHJ/code interpretation. This is planning guidance only. Final approval must come from applicable code review, the authority having jurisdiction, fire marshal/AHJ, qualified professional review, and manufacturer-listed hardware documentation.");
    }

    return lines.join("\n");
  }

  async function copySummary() {
    const text = buildClientSummary();

    try {
      await navigator.clipboard.writeText(text);
      status("Client-ready access scope summary copied.");
    } catch {
      status("Copy failed. Browser clipboard permission may be blocked.");
    }
  }

  function bindEvents() {
    els.saveScope?.addEventListener("click", saveScope);
    els.newScope?.addEventListener("click", newScope);
    els.resetScopes?.addEventListener("click", resetScopes);
    els.continueBtn?.addEventListener("click", continueFlow);
    els.printSummary?.addEventListener("click", printSummary);
    els.copySummary?.addEventListener("click", copySummary);

    els.scopeList?.addEventListener("click", (event) => {
      const useBtn = event.target.closest("[data-scope-use]");
      const editBtn = event.target.closest("[data-scope-edit]");
      const deleteBtn = event.target.closest("[data-scope-delete]");

      if (useBtn) useScope(useBtn.getAttribute("data-scope-use"));
      if (editBtn) editScope(editBtn.getAttribute("data-scope-edit"));
      if (deleteBtn) deleteScope(deleteBtn.getAttribute("data-scope-delete"));
    });
  }

  function init() {
    const api = state();
    if (!api) {
      status("Access Control scope state failed to load.");
      return;
    }

    const ledger = api.readLedger();
    const active = getActiveScopeFromLedger(ledger);
    if (active) hydrateScopeForm(active);
    else clearScopeForm("Main Entry Door");

    bindEvents();
    render();
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    let unlocked = unlockCategoryPage();
    if (unlocked) init();

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked && els.toolCard && !els.toolCard.dataset.initialized) {
        els.toolCard.dataset.initialized = "true";
        init();
      }
    }, 400);
  });
})();
