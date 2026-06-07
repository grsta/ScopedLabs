(() => {
  "use strict";

  const CATEGORY = "access-control";
  const NEXT_URL = "/tools/access-control/fail-safe-fail-secure/";

  const $ = (id) => document.getElementById(id);

  const els = {
        scopeName: $("scopeName"),
    scopeType: $("scopeType"),
    planningPath: $("planningPath"),
    elevatorReaderSeedCard: $("elevatorReaderSeedCard"),
    elevatorTopology: $("elevatorTopology"),
    elevatorCars: $("elevatorCars"),
    elevatorBanks: $("elevatorBanks"),
    elevatorSecuredFloors: $("elevatorSecuredFloors"),
    elevatorDestinationControl: $("elevatorDestinationControl"),
    elevatorReaderPlacement: $("elevatorReaderPlacement"),
    elevatorTenantSeparation: $("elevatorTenantSeparation"),
    elevatorEmergencyOverride: $("elevatorEmergencyOverride"),
    elevatorHighSecurityConnection: $("elevatorHighSecurityConnection"),
    specialLockingSeedCard: $("specialLockingSeedCard"),
    specialLockingOpeningCount: $("specialLockingOpeningCount"),
    specialLockingLockingType: $("specialLockingLockingType"),
    specialLockingEgressImpact: $("specialLockingEgressImpact"),
    specialLockingReleaseLogic: $("specialLockingReleaseLogic"),
    specialLockingAuthorityReview: $("specialLockingAuthorityReview"),
    specialLockingOverridePlan: $("specialLockingOverridePlan"),
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



  const SPECIAL_LOCKING_SEED_KEY = "scopedlabs:pipeline:access-control:special-locking-seed";
  const SPECIAL_LOCKING_SEED_CONTRACT = "scopedlabs.access-control.branch-seed.special-locking.v1";

  function isSpecialLockingPlanningPath(value) {
    return ["special-locking-scope", "high-security-door", "egress-review"].includes(String(value || ""));
  }

  function scopeFromBasicFormOnly() {
    return {
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
      trafficLevel: els.trafficLevel?.value || "normal"
    };
  }

  function defaultSpecialLockingSeedFromScope(scope = {}) {
    const security = scope.securityLevel || "standard";
    const lockIntent = scope.lockIntent || "unknown";
    const freeEgress = scope.freeEgress || "unknown";
    const egressRole = scope.egressRole || "unknown";
    const fireRelease = scope.fireRelease || "unknown";
    const scopeType = scope.scopeType || "single-door";

    const lockingType = lockIntent === "maglock"
      ? "maglock"
      : (scopeType === "high-security-room" || security === "high" || security === "critical" ? "high-security-room" : "controlled-egress");

    const egressImpact = freeEgress === "no" || ["required-egress", "exit-door", "stairwell-egress", "corridor-egress"].includes(egressRole)
      ? "yes"
      : (freeEgress === "unknown" || egressRole === "unknown" ? "unknown" : "no");

    const releaseLogic = fireRelease === "yes"
      ? "needed"
      : (fireRelease === "unknown" ? "needed" : "not-applicable");

    const authorityReview = scope.requiresAuthorityReview || egressImpact !== "no" || releaseLogic === "needed"
      ? "likely"
      : "not-flagged";

    return {
      contract: SPECIAL_LOCKING_SEED_CONTRACT,
      sourceMode: "scope-planner",
      topology: normalizeElevatorTopology(scope.elevatorTopology || (Number(scope.elevatorBanks || scope.banks || 1) > 1 ? "multiple-banks" : "single-bank")),
      openingCount: Math.max(1, Number(scope.specialLockingOpeningCount || scope.openingCount || scope.doorCount || 1) || 1),
      lockingType,
      egressImpact,
      releaseLogic,
      authorityReview,
      overridePlan: "documented"
    };
  }

  function collectSpecialLockingSeed() {
    const seed = defaultSpecialLockingSeedFromScope(scopeFromBasicFormOnly());

    return {
      ...seed,
      topology: normalizeElevatorTopology(els.elevatorTopology?.value || seed.topology),
      openingCount: Math.max(0, Math.round(Number(els.specialLockingOpeningCount?.value || seed.openingCount || 1) || 0)),
      lockingType: els.specialLockingLockingType?.value || seed.lockingType,
      egressImpact: els.specialLockingEgressImpact?.value || seed.egressImpact,
      releaseLogic: els.specialLockingReleaseLogic?.value || seed.releaseLogic,
      authorityReview: els.specialLockingAuthorityReview?.value || seed.authorityReview,
      overridePlan: els.specialLockingOverridePlan?.value || seed.overridePlan,
      updatedAt: new Date().toISOString()
    };
  }

  function hydrateSpecialLockingSeed(scope = {}) {
    const seed = scope.branchSeeds?.specialLocking || scope.specialLockingSeed || defaultSpecialLockingSeedFromScope(scope);

    if (els.specialLockingOpeningCount) els.specialLockingOpeningCount.value = String(seed.openingCount || 1);
    if (els.specialLockingLockingType) els.specialLockingLockingType.value = seed.lockingType || "high-security-room";
    if (els.specialLockingEgressImpact) els.specialLockingEgressImpact.value = seed.egressImpact || "no";
    if (els.specialLockingReleaseLogic) els.specialLockingReleaseLogic.value = seed.releaseLogic || "not-applicable";
    if (els.specialLockingAuthorityReview) els.specialLockingAuthorityReview.value = seed.authorityReview || "not-flagged";
    if (els.specialLockingOverridePlan) els.specialLockingOverridePlan.value = seed.overridePlan || "documented";
  }

  function updateSpecialLockingSeedCard() {
    if (!els.specialLockingSeedCard) return;
    const show = isSpecialLockingPlanningPath(els.planningPath?.value) || els.scopeType?.value === "high-security-room" || els.freeEgress?.value === "no" || els.lockIntent?.value === "maglock";
    els.specialLockingSeedCard.hidden = !show;
    els.specialLockingSeedCard.dataset.seedActive = show ? "true" : "false";
    if (show) hydrateSpecialLockingSeed(scopeFromBasicFormOnly());
  }

  function decorateScopeWithSpecialLockingSeed(scope) {
    if (!scope || !isSpecialLockingPlanningPath(scope.planningPath)) return scope;
    const seed = collectSpecialLockingSeed();

    return {
      ...scope,
      branchSeedContract: SPECIAL_LOCKING_SEED_CONTRACT,
      branchSeeds: {
        ...(scope.branchSeeds || {}),
        specialLocking: seed
      },
      specialLockingSeed: seed,
      openingCount: seed.openingCount
    };
  }

  function writeSpecialLockingBranchSeed(scope) {
    if (!scope || !isSpecialLockingPlanningPath(scope.planningPath)) return false;

    const seed = scope.branchSeeds?.specialLocking || scope.specialLockingSeed || collectSpecialLockingSeed();
    const payload = {
      contract: SPECIAL_LOCKING_SEED_CONTRACT,
      category: "access-control",
      branchTool: "special-locking-scope",
      sourceTool: "scope-planner",
      scopeId: scope.id,
      scopeName: scope.name,
      scopeType: scope.scopeType,
      planningPath: scope.planningPath,
      seed,
      updatedAt: new Date().toISOString()
    };

    try {
      sessionStorage.setItem(SPECIAL_LOCKING_SEED_KEY, JSON.stringify(payload));
      localStorage.setItem(SPECIAL_LOCKING_SEED_KEY, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }


  const ELEVATOR_READER_SEED_KEY = "scopedlabs:pipeline:access-control:elevator-reader-seed";
  const ELEVATOR_READER_SEED_CONTRACT = "scopedlabs.access-control.branch-seed.elevator-reader.v1";

  function isElevatorPlanningPath(value) {
    return String(value || "") === "elevator-bank";
  }


  function normalizeElevatorTopology(value) {
    const key = String(value || "").trim();
    return ["single-bank", "multiple-banks", "separate-elevators", "mixed-custom"].includes(key) ? key : "single-bank";
  }

  function elevatorTopologyLabel(value) {
    const key = normalizeElevatorTopology(value);
    if (key === "multiple-banks") return "Multiple elevator banks";
    if (key === "separate-elevators") return "Separate individual elevators / locations";
    if (key === "mixed-custom") return "Mixed / custom elevator scope";
    return "Single elevator bank";
  }

  function defaultElevatorReaderSeedFromScope(scope = {}) {
    const highSecurity = scope.securityLevel === "high" || scope.securityLevel === "critical";
    const traffic = scope.trafficLevel || "normal";

    return {
      contract: ELEVATOR_READER_SEED_CONTRACT,
      sourceMode: "scope-planner",
      cars: Math.max(1, Number(scope.elevatorCars || scope.cars || 4) || 4),
      banks: Math.max(1, Number(scope.elevatorBanks || scope.banks || 1) || 1),
      floors: Math.max(0, Number(scope.elevatorSecuredFloors || scope.floors || (highSecurity ? 2 : 6)) || 0),
      dest: scope.elevatorDestinationControl || (traffic === "high" || traffic === "very-high" ? "yes" : "no"),
      placement: scope.elevatorReaderPlacement || (highSecurity ? "both" : "car"),
      tenantSeparation: scope.elevatorTenantSeparation || (scope.scopeType === "elevator-bank" ? "review" : "none"),
      emergencyOverride: scope.elevatorEmergencyOverride || "review",
      highSecurityConnection: scope.elevatorHighSecurityConnection || (highSecurity ? "yes" : "no")
    };
  }

  function collectElevatorReaderSeed() {
    const seed = defaultElevatorReaderSeedFromScope(scopeFromBasicFormOnly());

    return {
      ...seed,
      cars: Math.max(0, Math.round(Number(els.elevatorCars?.value || seed.cars || 0) || 0)),
      banks: Math.max(1, Math.round(Number(els.elevatorBanks?.value || seed.banks || 1) || 1)),
      floors: Math.max(0, Math.round(Number(els.elevatorSecuredFloors?.value || seed.floors || 0) || 0)),
      dest: els.elevatorDestinationControl?.value || seed.dest,
      placement: els.elevatorReaderPlacement?.value || seed.placement,
      tenantSeparation: els.elevatorTenantSeparation?.value || seed.tenantSeparation,
      emergencyOverride: els.elevatorEmergencyOverride?.value || seed.emergencyOverride,
      highSecurityConnection: els.elevatorHighSecurityConnection?.value || seed.highSecurityConnection,
      updatedAt: new Date().toISOString()
    };
  }

  function hydrateElevatorReaderSeed(scope = {}) {
    const seed = scope.branchSeeds?.elevatorReader || scope.elevatorReaderSeed || defaultElevatorReaderSeedFromScope(scope);

    if (els.elevatorTopology) els.elevatorTopology.value = normalizeElevatorTopology(seed.topology);
    if (els.elevatorCars) els.elevatorCars.value = String(seed.cars || 4);
    if (els.elevatorBanks) els.elevatorBanks.value = String(seed.banks || 1);
    if (els.elevatorSecuredFloors) els.elevatorSecuredFloors.value = String(seed.floors || 0);
    if (els.elevatorDestinationControl) els.elevatorDestinationControl.value = seed.dest || "no";
    if (els.elevatorReaderPlacement) els.elevatorReaderPlacement.value = seed.placement || "car";
    if (els.elevatorTenantSeparation) els.elevatorTenantSeparation.value = seed.tenantSeparation || "none";
    if (els.elevatorEmergencyOverride) els.elevatorEmergencyOverride.value = seed.emergencyOverride || "review";
    if (els.elevatorHighSecurityConnection) els.elevatorHighSecurityConnection.value = seed.highSecurityConnection || "no";
  }

  function updateElevatorReaderSeedCard() {
    if (!els.elevatorReaderSeedCard) return;
    const show = isElevatorPlanningPath(els.planningPath?.value) || els.scopeType?.value === "elevator-bank";
    els.elevatorReaderSeedCard.hidden = !show;
    els.elevatorReaderSeedCard.dataset.seedActive = show ? "true" : "false";
    if (show) hydrateElevatorReaderSeed(scopeFromBasicFormOnly());
  }

  function decorateScopeWithElevatorReaderSeed(scope) {
    if (!scope || !isElevatorPlanningPath(scope.planningPath)) return scope;
    const seed = collectElevatorReaderSeed();

    return {
      ...scope,
      branchSeedContract: ELEVATOR_READER_SEED_CONTRACT,
      branchSeeds: {
        ...(scope.branchSeeds || {}),
        elevatorReader: seed
      },
      elevatorReaderSeed: seed,
      elevatorTopology: seed.topology,
      elevatorCars: seed.cars,
      elevatorBanks: seed.banks,
      elevatorSecuredFloors: seed.floors
    };
  }

  function writeElevatorReaderBranchSeed(scope) {
    if (!scope || !isElevatorPlanningPath(scope.planningPath)) return false;

    const seed = scope.branchSeeds?.elevatorReader || scope.elevatorReaderSeed || collectElevatorReaderSeed();
    const payload = {
      contract: ELEVATOR_READER_SEED_CONTRACT,
      category: "access-control",
      branchTool: "elevator-reader-count",
      sourceTool: "scope-planner",
      scopeId: scope.id,
      scopeName: scope.name,
      scopeType: scope.scopeType,
      planningPath: scope.planningPath,
      seed,
      updatedAt: new Date().toISOString()
    };

    try {
      sessionStorage.setItem(ELEVATOR_READER_SEED_KEY, JSON.stringify(payload));
      localStorage.setItem(ELEVATOR_READER_SEED_KEY, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  function updateBranchSeedCards() {
    updateSpecialLockingSeedCard();
    updateElevatorReaderSeedCard();
  }

  function writeActiveBranchSeeds(scope) {
    writeSpecialLockingBranchSeed(scope);
    writeElevatorReaderBranchSeed(scope);
  }

  function branchKey(scope) {
    if (!scope) return "core";
    if (scope.scopeType === "elevator-bank" || scope.planningPath === "elevator-bank") return "elevator";
    if (scope.scopeType === "anti-passback-zone" || scope.planningPath === "anti-passback-zone") return "antiPassback";
    if (
      scope.scopeType === "high-security-room" ||
      scope.planningPath === "special-locking-scope" ||
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

  function accessStatusClass(value) {
    const status = String(value || "").toUpperCase();
    if (status === "AUTHORITY REVIEW") return "access-status-authority";
    if (status === "RISK") return "access-status-risk";
    if (status === "WATCH") return "access-status-watch";
    if (status === "COMPLETE") return "access-status-complete";
    if (status === "PENDING") return "access-status-pending";
    return "access-status-planning";
  }

  function branchNextAction(scope) {
    if (!scope) return "Save a scope before continuing.";
    if (branchKey(scope) === "elevator") return "Run Elevator Reader Count when this specialty lane is ready.";
    if (branchKey(scope) === "antiPassback") return "Run Anti-Passback Zones when this specialty lane is ready.";
    if (branchKey(scope) === "special") return scope.planningPath === "special-locking-scope" ? "Open Special Locking with this scope seed." : "Resolve authority-review assumptions before final design approval.";
    return "Continue to Fail-Safe / Fail-Secure.";
  }

  function completedCheckCount(scope) {
    const completed = scope && scope.completedTools && typeof scope.completedTools === "object" ? scope.completedTools : {};
    return Object.keys(completed).filter((key) => completed[key]).length;
  }


  function scopePathContinueLabel(value) {
    if (value === "elevator-bank") return "Elevator Reader Count";
    if (value === "anti-passback-zone") return "Anti-Passback Zones";
    if (value === "special-locking-scope") return "Special Locking / High-Security Scope";
    return "Fail-Safe / Fail-Secure";
  }

  function scopePathUrl(value) {
    if (value === "elevator-bank") return "/tools/access-control/elevator-reader-count/";
    if (value === "anti-passback-zone") return "/tools/access-control/anti-passback-zones/";
    if (value === "special-locking-scope") return "/tools/access-control/special-locking-scope/";
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
    const scope = {
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

    return decorateScopeWithElevatorReaderSeed(decorateScopeWithSpecialLockingSeed(scope));
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
    hydrateSpecialLockingSeed(scope);
    hydrateElevatorReaderSeed(scope);
    updateBranchSeedCards();
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
    hydrateSpecialLockingSeed(scopeFromBasicFormOnly());
    hydrateElevatorReaderSeed(scopeFromBasicFormOnly());
    updateBranchSeedCards();
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
    const savedActive = getActiveScopeFromLedger(ledger) || normalized;
    writeActiveBranchSeeds(savedActive);
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


  function renderStatusLegend() {
    return [
      '<section class="access-status-legend" aria-label="Access Control status legend">',
      '<h3 class="access-status-legend-title">Status Legend</h3>',
      '<div class="access-status-legend-grid">',
      '<div class="access-status-legend-item"><strong class="access-status-planning">PLANNING</strong>Scope is defined but not fully validated yet.</div>',
      '<div class="access-status-legend-item"><strong class="access-status-pending">PENDING</strong>Required core checks are not complete.</div>',
      '<div class="access-status-legend-item"><strong class="access-status-watch">WATCH</strong>Assumptions need review, but the scope can continue.</div>',
      '<div class="access-status-legend-item"><strong class="access-status-risk">RISK</strong>A tool assistant found a likely design conflict.</div>',
      '<div class="access-status-legend-item"><strong class="access-status-authority">AUTHORITY REVIEW</strong>AHJ/code/fire/life-safety review may be required.</div>',
      '<div class="access-status-legend-item"><strong class="access-status-complete">COMPLETE</strong>Enough validated data exists for summary rollup.</div>',
      '</div>',
      '</section>'
    ].join("");
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
          '<td><span class="' + (selected === "Active Scope" ? "access-status-active-text" : "access-status-muted-text") + '">' + escapeHtml(selected) + '</span></td>',
          '<td><span class="' + accessStatusClass(scope.status || "PLANNING") + '">' + escapeHtml(scope.status || "PLANNING") + '</span></td>',
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
      renderStatusLegend(),
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
    writeActiveBranchSeeds(nextActive);
    window.location.href = scopePathUrl(nextActive && nextActive.planningPath);
  }


  function buildAccessScopeSummaryReportHtml() {
    const ledger = state()?.readLedger();
    const scopes = Array.isArray(ledger?.scopes) ? ledger.scopes : [];
    const generated = new Date().toLocaleString();
    const reportId = "SL-AC-SCOPE-" + new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
    const summaryHtml = els.scopeSummary ? els.scopeSummary.innerHTML : "";

    const statusText = scopes.some((scope) => scope.status === "RISK")
      ? "RISK"
      : (scopes.some((scope) => scope.status === "AUTHORITY REVIEW") ? "AUTHORITY REVIEW" : "PENDING");

    const statusClass = statusText === "RISK"
      ? "risk"
      : (statusText === "AUTHORITY REVIEW" ? "authority" : "pending");

    return '<!doctype html>' +
'<html lang="en">' +
'<head>' +
'  <meta charset="utf-8" />' +
'  <meta name="viewport" content="width=device-width,initial-scale=1" />' +
'  <title>Access Control Scope Summary</title>' +
'  <style>' +
'    :root{' +
'      --ink:#132018;' +
'      --muted:#58645d;' +
'      --line:#d9e3dc;' +
'      --soft:#f7faf8;' +
'      --accent:#1f7a3d;' +
'      --accent-soft:#eaf7ef;' +
'      --watch:#946200;' +
'      --watch-soft:#fff7df;' +
'      --risk:#a3362b;' +
'      --risk-soft:#fff0ee;' +
'      --authority:#946200;' +
'      --authority-soft:#fff7df;' +
'    }' +
'    *{box-sizing:border-box}' +
'    body{margin:0;padding:32px;background:#eef3ef;color:var(--ink);font-family:Inter,Segoe UI,Roboto,Arial,sans-serif}' +
'    .page{max-width:1080px;margin:0 auto;background:#fff;border:1px solid var(--line);box-shadow:0 18px 48px rgba(22,33,26,.12)}' +
'    .toolbar{display:flex;justify-content:flex-end;gap:10px;padding:16px 20px;border-bottom:1px solid var(--line);background:#fff;position:sticky;top:0;z-index:2}' +
'    .toolbar button{border:1px solid var(--line);background:#fff;color:#132018;border-radius:999px;padding:9px 14px;font-weight:800;cursor:pointer}' +
'    .report{padding:32px}' +
'    .brand-row{display:flex;align-items:center;gap:10px;margin-bottom:4px}' +
'    .brand-mark{width:24px;height:24px;border-radius:6px;display:inline-grid;place-items:center;background:#0b150f;color:#7dff9e;font-weight:950}' +
'    .brand-name{font-size:1.15rem;font-weight:900;letter-spacing:.02em}' +
'    .tagline{color:var(--muted);font-size:.95rem;margin-bottom:18px}' +
'    .report-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:18px 0;margin-bottom:22px}' +
'    .report-title{font-size:1.7rem;line-height:1.15;margin:0 0 6px}' +
'    .report-meta{color:var(--muted);font-size:.95rem;line-height:1.6}' +
'    .status-pill{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;border:1px solid transparent;white-space:nowrap;padding:8px 12px;font-size:.82rem}' +
'    .pending{color:#4b5563;background:#f3f4f6;border-color:#d1d5db}' +
'    .authority{color:var(--authority);background:var(--authority-soft);border-color:#f2dfad}' +
'    .risk{color:var(--risk);background:var(--risk-soft);border-color:#f3c6c1}' +
'    .access-scope-summary-rollup{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:18px}' +
'    .access-scope-summary-metric{border:1px solid var(--line);background:#fafcfb;border-radius:14px;padding:12px;max-width:100%}' +
'    .access-scope-summary-label{display:block;color:var(--muted);font-size:.72rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-bottom:7px}' +
'    .access-scope-summary-value{display:block;color:#111;font-size:1.25rem;font-weight:950}' +
'    .access-scope-summary-note,.muted{color:var(--muted);font-size:.86rem;line-height:1.45}' +
'    .access-status-legend{border-top:1px solid var(--line);padding-top:14px;margin-top:16px;margin-bottom:18px}' +
'    .access-status-legend-title{font-size:.9rem;letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px}' +
'    .access-status-legend-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 18px}' +
'    .access-status-legend-item{font-size:.84rem;color:var(--muted);line-height:1.35}' +
'    .access-status-legend-item strong{display:inline-block;margin-right:6px}' +
'    .access-status-active-text,.access-status-complete{color:var(--accent);font-weight:950}' +
'    .access-status-watch,.access-status-authority{color:var(--watch);font-weight:950}' +
'    .access-status-risk{color:var(--risk);font-weight:950}' +
'    .access-status-planning,.access-status-pending,.access-status-muted-text{color:#4b5563;font-weight:850}' +
'    .access-scope-warn,.access-authority-caution{border:1px solid #eadb9a;background:#fffdf2;border-radius:12px;padding:12px 14px;margin:12px 0;line-height:1.5}' +
'    .access-scope-summary-branch{margin-top:24px;break-inside:avoid;page-break-inside:avoid}' +
'    .access-scope-summary-branch-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:7px}' +
'    .access-scope-summary-branch-head h3{font-size:1.1rem;margin:0}' +
'    .access-scope-summary-branch-count{color:var(--accent);font-size:.8rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}' +
'    .access-scope-branch-description{color:var(--muted);font-size:.88rem;margin:0 0 10px;line-height:1.45}' +
'    table.access-scope-summary-table{width:100%;border-collapse:collapse;border:1px solid var(--line);font-size:.84rem}' +
'    .access-scope-summary-table th,.access-scope-summary-table td{padding:8px 8px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}' +
'    .access-scope-summary-table th{background:#f7faf8;font-size:.66rem;text-transform:uppercase;letter-spacing:.06em}' +
'    .access-scope-summary-table tr:last-child td{border-bottom:none}' +
'    .access-scope-summary-actions{display:none !important}' +
'    .foot{margin-top:26px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:.9rem;line-height:1.7}' +
'    @media (max-width:900px){body{padding:14px}.report{padding:20px}.report-head{flex-direction:column}.access-scope-summary-rollup{grid-template-columns:1fr 1fr}}' +
'    @media print{@page{margin:.55in}body{background:#fff;padding:0}.page{max-width:none;border:none;box-shadow:none}.toolbar{display:none !important}.report{padding:0}.access-scope-summary-rollup{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.access-scope-summary-branch{break-inside:avoid;page-break-inside:avoid}}' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="page">' +
'    <div class="toolbar">' +
'      <button type="button" onclick="window.print()">Print / Save PDF</button>' +
'      <button type="button" onclick="window.close()">Close</button>' +
'    </div>' +
'    <div class="report">' +
'      <div class="brand-row"><div class="brand-mark">S</div><div class="brand-name">ScopedLabs</div></div>' +
'      <div class="tagline">Engineering - Analysis - Tools</div>' +
'      <div class="report-head">' +
'        <div>' +
'          <h1 class="report-title">Access Control Scope Summary</h1>' +
'          <div class="report-meta">' +
'            <div><strong>Category:</strong> Access Control</div>' +
'            <div><strong>Tool:</strong> Access Scope Planner</div>' +
'            <div><strong>Generated:</strong> ' + escapeHtml(generated) + '</div>' +
'            <div><strong>Report ID:</strong> ' + escapeHtml(reportId) + '</div>' +
'          </div>' +
'        </div>' +
'        <div class="status-pill ' + statusClass + '">' + escapeHtml(statusText) + '</div>' +
'      </div>' +
'      <section class="section">' +
'        <h2>Scope and Branch Summary</h2>' +
         summaryHtml +
'      </section>' +
'      <section class="section">' +
'        <h2>Disclaimer</h2>' +
'        <div class="access-scope-warn">ScopedLabs tools are planning aids only and do not replace formal engineering review, code compliance review, AHJ/fire marshal review, manufacturer documentation, or project-specific professional judgment.</div>' +
'      </section>' +
'      <div class="foot">ScopedLabs Pro export for internal and client-facing documentation workflows.</div>' +
'    </div>' +
'  </div>' +
'</body>' +
'</html>';
  }

  function openAccessScopeSummaryReportWindow() {
    try {
      const reportHtml = buildAccessScopeSummaryReportHtml();
      const blob = new Blob([reportHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");

      if (!win) return false;

      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    } catch (err) {
      console.error("ScopedLabs access scope summary report open failed:", err);
      return false;
    }
  }


  function printSummary() {
    const ledger = state()?.readLedger();
    if (!ledger || !Array.isArray(ledger.scopes) || !ledger.scopes.length) {
      status("Save at least one scope before opening the summary report.");
      return;
    }

    render();

    const opened = openAccessScopeSummaryReportWindow();
    status(opened ? "Access scope summary report opened in a new tab." : "Popup blocked or access scope summary report could not open.");
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
    els.planningPath?.addEventListener("change", updateBranchSeedCards);
    els.scopeType?.addEventListener("change", updateBranchSeedCards);
    els.egressRole?.addEventListener("change", updateBranchSeedCards);
    els.freeEgress?.addEventListener("change", updateBranchSeedCards);
    els.fireRelease?.addEventListener("change", updateBranchSeedCards);
    els.lockIntent?.addEventListener("change", updateBranchSeedCards);
    els.securityLevel?.addEventListener("change", updateBranchSeedCards);

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

  if (els.elevatorTopology) {
    els.elevatorTopology.addEventListener("change", () => {
      if (els.elevatorTopology.value === "separate-elevators" && els.elevatorCars && Number(els.elevatorCars.value || 0) > 1) {
        els.elevatorCars.value = "1";
      }
    });
  }

  window.ScopedLabsAccessControlScopePlannerBranchSeeds = Object.freeze({
    key: SPECIAL_LOCKING_SEED_KEY,
    contract: SPECIAL_LOCKING_SEED_CONTRACT,
    specialLocking: { collect: collectSpecialLockingSeed, write: writeSpecialLockingBranchSeed },
    elevatorReader: { key: ELEVATOR_READER_SEED_KEY, contract: ELEVATOR_READER_SEED_CONTRACT, collect: collectElevatorReaderSeed, write: writeElevatorReaderBranchSeed },
    collectSpecialLockingSeed,
    writeSpecialLockingBranchSeed
  });

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
