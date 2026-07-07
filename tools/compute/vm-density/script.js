(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "vm-density";
  const LANE = "v1";
  const PREVIOUS_STEP = "storage-throughput";
  const State = window.ScopedLabsComputePlanState;

  const FLOW_KEYS = {
    "cpu-sizing": "scopedlabs:pipeline:compute:cpu-sizing",
    "ram-sizing": "scopedlabs:pipeline:compute:ram-sizing",
    "storage-iops": "scopedlabs:pipeline:compute:storage-iops",
    "storage-throughput": "scopedlabs:pipeline:compute:storage-throughput",
    "vm-density": "scopedlabs:pipeline:compute:vm-density",
    "gpu-vram": "scopedlabs:pipeline:compute:gpu-vram",
    "power-thermal": "scopedlabs:pipeline:compute:power-thermal",
    "raid-rebuild-time": "scopedlabs:pipeline:compute:raid-rebuild-time",
    "backup-window": "scopedlabs:pipeline:compute:backup-window"
  };

  const $ = (id) => document.getElementById(id);

  let hasResult = false;
  let currentVmDensityExportResult = null;
  let upstreamContext = null;
  let storagePressurePrefilled = false;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    hostCores: $("hostCores"),
    hostRam: $("hostRam"),
    reserve: $("reserve"),
    vmCpu: $("vmCpu"),
    vmRam: $("vmRam"),
    cpuOver: $("cpuOver"),
    ramOver: $("ramOver"),
    spare: $("spare"),
    hostCount: $("hostCount"),
    haPolicy: $("haPolicy"),
    maintenanceReservePct: $("maintenanceReservePct"),
    targetVmCount: $("targetVmCount"),
    growthPct: $("growthPct"),
    workloadMix: $("workloadMix"),
    burstRisk: $("burstRisk"),
    storagePressure: $("storagePressure"),
    gpuWorkload: $("gpuWorkload"),
    backupPressure: $("backupPressure"),
    results: $("results"),
    flowNote: $("flow-note"),
    vmDensitySummaryCard: $("computeVmDensitySummaryCard"),
    vmDensitySummary: $("computeVmDensitySummary"),
    vmDensityVisualCard: $("computeVmDensityVisualCard"),
    vmDensityVisual: $("computeVmDensityVisual"),
    vmDensityReferencesCard: $("computeVmDensityReferencesCard"),
    vmDensityReferences: $("computeVmDensityReferences"),
    vmDensityRecommendedActionsCard: $("computeVmDensityRecommendedActionsCard"),
    vmDensityRecommendedActions: $("computeVmDensityRecommendedActions"),
    vmDensityDecisionScheduleCard: $("computeVmDensityDecisionScheduleCard"),
    vmDensityDecisionSchedule: $("computeVmDensityDecisionSchedule"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  function hasStoredAuth() {
    try {
      const k = Object.keys(localStorage).find((x) => x.startsWith("sb-"));
      if (!k) return false;
      const raw = JSON.parse(localStorage.getItem(k));
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
      return raw.split(",").map((x) => String(x).trim().toLowerCase()).filter(Boolean);
    } catch {
      return [];
    }
  }

  function unlockCategoryPage() {
    const body = document.body;
    const category = String(body?.dataset?.category || "").trim().toLowerCase();
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.continue) els.continue.disabled = false;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continue) els.continue.disabled = true;
  }

  function refreshVmDensityActiveWorkflow(result) {
    const workflow = window.ScopedLabsComputeVmDensityActiveWorkflow;
    if (!workflow || typeof workflow.refresh !== "function") return;
    try {
      workflow.refresh(result || null);
    } catch {
      // Active Workflow is presentational; calculation must not depend on it.
    }
  }

  function boolSelectValue(node) {
    return String(node?.value || "no").toLowerCase() === "yes";
  }

  function getHaReservedHosts(hostCount, haPolicy) {
    if (haPolicy === "n2") return Math.min(2, Math.max(0, hostCount - 1));
    if (haPolicy === "n1") return Math.min(1, Math.max(0, hostCount - 1));
    return 0;
  }

  function prefillStoragePressureFromUpstream() {
    if (!els.storagePressure || !upstreamContext) return;
    if (storagePressurePrefilled || els.storagePressure.value !== "normal") return;

    const status = String(upstreamContext.status || upstreamContext.summaryStatus || "").toLowerCase();
    if (status.includes("risk")) {
      els.storagePressure.value = "risk";
      storagePressurePrefilled = true;
    } else if (status.includes("watch") || status.includes("review")) {
      els.storagePressure.value = "watch";
      storagePressurePrefilled = true;
    }
  }

  function refreshFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstreamContext = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstreamContext = null;
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstreamContext = null;
      return;
    }

    upstreamContext = parsed.data || {};
    prefillStoragePressureFromUpstream();

    if (els.flowNote) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
    }
  }

  // vm-density-tool-upgrade-0706
  
function vmDensityEsc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function vmDensityResultRow(label, value) {
  return '<div class="result-row"><span class="k">' + vmDensityEsc(label) + '</span><span class="v">' + vmDensityEsc(value == null || value === "" ? "Not set" : value) + '</span></div>';
}

function vmDensityShowCard(card, mount, html) {
  if (!card || !mount) return false;
  mount.innerHTML = html || "";
  card.hidden = false;
  return true;
}

function ensureVmDensityOutputCards() {
    return {
      visualCard: els.vmDensityVisualCard,
      visual: els.vmDensityVisual,
      referencesCard: els.vmDensityReferencesCard,
      references: els.vmDensityReferences,
      recommendedActionsCard: els.vmDensityRecommendedActionsCard,
      recommendedActions: els.vmDensityRecommendedActions,
      decisionScheduleCard: els.vmDensityDecisionScheduleCard,
      decisionSchedule: els.vmDensityDecisionSchedule
    };
  }

  function normalizeVmDensityPlanningInputsHeading() {
    if (!els.toolCard) return;
    if (els.toolCard.getAttribute("data-vm-density-planning-inputs-0706") === "true") return;
    const heading = els.toolCard.querySelector("h2, h3");
    if (heading) heading.textContent = "Planning Inputs";
    els.toolCard.setAttribute("data-vm-density-planning-inputs-0706", "true");
  }

  
function vmDensityNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function renderVmDensitySummaryCard(result) {
  const card = document.getElementById("computeVmDensitySummaryCard");
  const mount = document.getElementById("computeVmDensitySummary");
  if (!card || !mount) return;

  const assistant = window.ScopedLabsComputeAssistant || window.ScopedLabsComputeAssistantContract || {};
  let html = "";

  try {
    if (typeof assistant.renderVmDensitySummaryCard === "function") {
      html = assistant.renderVmDensitySummaryCard(result) || "";
    }
  } catch (error) {
    html = "";
  }

  if (!html) {
    const outputs = result.outputs || {};
    const status = String(outputs.status || result.status || "REVIEW").toUpperCase();
    html = '<div class="compute-result-shell">' +
      '<h3 class="h3" style="margin-top:0;">VM Density</h3>' +
      '<p class="muted">Shared VM Density summary renderer unavailable.</p>' +
      vmDensityResultRow("Status", status) +
      vmDensityResultRow("Primary Constraint", outputs.limiting || outputs.primaryConstraint || "Balanced") +
    '</div>';
  }

  vmDensityShowCard(card, mount, html);
}



function renderVmDensityCapacityVisual(result) {
  const cards = ensureVmDensityOutputCards();
  const visuals = window.ScopedLabsComputeCapacityVisuals || {};
  let rendered = false;

  try {
    if (typeof visuals.renderVmDensityCapacityEnvelope === "function") {
      rendered = visuals.renderVmDensityCapacityEnvelope(cards.visual, result) === true;
    }
  } catch (error) {
    rendered = false;
  }

  if (!rendered) {
    vmDensityShowCard(cards.visualCard, cards.visual, '<p class="muted">Shared VM Density capacity envelope renderer unavailable.</p>');
  } else if (cards.visualCard) {
    cards.visualCard.hidden = false;
  }
}

  function clearVmDensityCapacityVisual() {
    const cards = ensureVmDensityOutputCards();
    if (cards.visual) cards.visual.innerHTML = "";
    if (cards.visualCard) cards.visualCard.hidden = true;
    if (cards.references) cards.references.innerHTML = "";
    if (cards.referencesCard) cards.referencesCard.hidden = true;
    if (cards.recommendedActions) cards.recommendedActions.innerHTML = "";
    if (cards.recommendedActionsCard) cards.recommendedActionsCard.hidden = true;
    if (cards.decisionSchedule) cards.decisionSchedule.innerHTML = "";
    if (cards.decisionScheduleCard) cards.decisionScheduleCard.hidden = true;
  }

  function renderVmDensityReferences(result) {
  const cards = ensureVmDensityOutputCards();
  const assistant = window.ScopedLabsComputeAssistant || window.ScopedLabsComputeAssistantContract || {};
  let html = "";

  try {
    if (typeof assistant.renderVmDensityRecommendationReferences === "function") {
      html = assistant.renderVmDensityRecommendationReferences(result) || "";
    }
  } catch (error) {
    html = "";
  }

  if (!html) {
    const outputs = result.outputs || {};
    const inputs = result.inputs || {};
    html = '<div class="results-grid">' +
      vmDensityResultRow("*1 Modeled density", (outputs.vms ?? "Not set") + " VMs modeled from CPU, RAM, reserve, and oversubscription policy") +
      vmDensityResultRow("*2 Demand basis", (outputs.growthAdjustedVmDemand ?? "Not set") + " growth-adjusted VMs; target " + (inputs.targetVmCount || "not set")) +
      vmDensityResultRow("*3 Validation limiter", outputs.limiting || outputs.primaryConstraint || "Balanced") +
      '</div>';
  }

  vmDensityShowCard(cards.referencesCard, cards.references, html);
}

  function renderVmDensityRecommendedActions(result) {
  const cards = ensureVmDensityOutputCards();
  const assistant = window.ScopedLabsComputeAssistant || window.ScopedLabsComputeAssistantContract || {};
  let html = "";

  try {
    if (typeof assistant.renderVmDensityRecommendedActions === "function") {
      html = assistant.renderVmDensityRecommendedActions(result) || "";
    }
  } catch (error) {
    html = "";
  }

  if (!html) {
    const outputs = result.outputs || {};
    html = '<div class="results-grid">' +
      vmDensityResultRow("Action 1", "Review the primary constraint before accepting the modeled VM density.") +
      vmDensityResultRow("Action 2", "Validate host count, HA reserve, maintenance reserve, and growth margin against the planning target.") +
      vmDensityResultRow("Action 3", "Continue to Power / Thermal after the density model is accepted.") +
      vmDensityResultRow("Current limiter", outputs.limiting || outputs.primaryConstraint || "Balanced") +
      '</div>';
  }

  vmDensityShowCard(cards.recommendedActionsCard, cards.recommendedActions, html);
}

  function renderVmDensityDecisionSchedule(result) {
  const cards = ensureVmDensityOutputCards();
  const assistant = window.ScopedLabsComputeAssistant || window.ScopedLabsComputeAssistantContract || {};
  let html = "";

  try {
    if (typeof assistant.renderVmDensityDecisionSchedule === "function") {
      html = assistant.renderVmDensityDecisionSchedule(result) || "";
    }
  } catch (error) {
    html = "";
  }

  if (!html) {
    const routing = result.plannerRouting || {};
    html = '<div class="results-grid">' +
      vmDensityResultRow("Planner decision", routing.routeIntent || "continue-to-power-thermal") +
      vmDensityResultRow("Next tool", routing.nextTool || "power-thermal") +
      vmDensityResultRow("Next route", routing.nextHref || "/tools/compute/power-thermal/") +
      '</div>';
  }

  vmDensityShowCard(cards.decisionScheduleCard, cards.decisionSchedule, html);
}

  function renderVmDensityAssistant(result) {
    const references = renderVmDensityReferences(result);
    const actions = renderVmDensityRecommendedActions(result);
    const schedule = renderVmDensityDecisionSchedule(result);
    return references || actions || schedule;
  }



function vmDensityExportCleanText(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function vmDensityExportFormatNumber(value, suffix) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Not set";
  const rounded = Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
  return String(rounded) + (suffix || "");
}

function vmDensityExportFormatVms(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "not set";
  return String(Math.round(n)) + " VMs";
}

function vmDensityExportTableFromDom(selector) {
  const table = document.querySelector(selector);
  if (!table) return null;

  const headers = Array.from(table.querySelectorAll("thead th")).map((cell) => vmDensityExportCleanText(cell.textContent));
  const rows = Array.from(table.querySelectorAll("tbody tr")).map((row) => {
    return Array.from(row.querySelectorAll("th, td")).map((cell) => vmDensityExportCleanText(cell.textContent));
  }).filter((row) => row.some(Boolean));

  if (!headers.length && !rows.length) return null;
  return { headers, rows };
}

function buildVmDensityVisualExportSection() {
  const svg = document.querySelector("#computeVmDensityVisual svg");
  if (!svg) return null;
  return {
    title: "VM Density Capacity Envelope",
    description: "Accepted VM Density capacity envelope from the calculated result.",
    compactSvg: true,
    svgs: [svg.outerHTML]
  };
}

function buildVmDensityReferenceExportSection() {
  const table = vmDensityExportTableFromDom("#computeVmDensityReferences table");
  if (!table) return null;
  return {
    title: "Recommendation References",
    description: "Reference markers used by the VM Density Capacity Envelope.",
    tableClass: "extra-export-table--planner",
    tables: [{ headers: table.headers.length ? table.headers : ["Marker", "Reference", "Reason"], rows: table.rows }]
  };
}

function buildVmDensityRecommendedActionsExportSection() {
  const rows = Array.from(document.querySelectorAll("#computeVmDensityRecommendedActions .compute-recommended-action")).map((node) => {
    const strong = node.querySelector("strong");
    const span = node.querySelector("span");
    return [
      vmDensityExportCleanText(strong ? strong.textContent : "Review VM Density plan"),
      vmDensityExportCleanText(span ? span.textContent : node.textContent)
    ];
  }).filter((row) => row.some(Boolean));

  if (!rows.length) return null;
  return {
    title: "Recommended Actions",
    description: "Assistant recommended actions for the current VM Density result.",
    tableClass: "extra-export-table--planner",
    tables: [{ headers: ["Action", "Reason"], rows }]
  };
}

function buildVmDensityDecisionScheduleExportSection() {
  const table = vmDensityExportTableFromDom("#computeVmDensityDecisionSchedule table");
  if (!table) return null;
  return {
    title: "VM Density Decision Schedule",
    description: "Decision checkpoints generated from the VM Density result.",
    tableClass: "extra-export-table--planner extra-export-table--decision",
    tables: [{ headers: table.headers.length ? table.headers : ["Group", "Metric", "Value", "Engineering Note"], rows: table.rows }]
  };
}

function buildVmDensityExportAnalysisSections(result) {
  result = result || {};
  const outputs = result.outputs || {};
  const inputs = result.inputs || {};
  const status = String(result.status || outputs.status || "REVIEW").toUpperCase();
  const modeled = Number(outputs.vms || 0);
  const demand = Number(outputs.growthAdjustedVmDemand || outputs.plannedVmDemand || modeled || 0);
  const gap = Number(outputs.capacityGapVms || 0);
  const limiting = outputs.limiting || outputs.primaryConstraint || "Balanced";
  const gapLabel = gap >= 0 ? "headroom" : "deficit";

  return [
    {
      title: "Status",
      body: status + " - " + (status === "RISK"
        ? "Modeled VM demand is at or beyond the usable consolidation envelope before Power / Thermal validation."
        : status === "WATCH"
          ? "The density plan is workable, but reserve pressure should be reviewed before downstream validation."
          : "The modeled density remains inside the current CPU and RAM planning envelope.")
    },
    {
      title: "Why it matters",
      body: "The model compares " + vmDensityExportFormatVms(demand) + " of growth-adjusted demand against " + vmDensityExportFormatVms(modeled) + " of modeled capacity, leaving " + vmDensityExportFormatVms(Math.abs(gap)) + " of " + gapLabel + "."
    },
    {
      title: "Primary constraint",
      body: limiting + " is the active limiter. CPU limit " + vmDensityExportFormatVms(outputs.cpuLimitVms) + "; RAM limit " + vmDensityExportFormatVms(outputs.ramLimitVms) + ". Density class: " + (outputs.densityClass || "Modeled density") + "."
    },
    {
      title: "Recommended correction",
      body: result.guidance || "Validate host count, HA reserve, maintenance reserve, growth margin, and per-VM CPU/RAM allocation before continuing."
    },
    {
      title: "Carry forward",
      body: "Carry " + vmDensityExportFormatVms(modeled) + ", " + vmDensityExportFormatNumber(outputs.usableHostCount || outputs.usableHosts || inputs.hostCount || 1, " usable hosts") + ", " + vmDensityExportFormatNumber(outputs.cpuPoolVcpu, " vCPU") + ", " + vmDensityExportFormatNumber(outputs.ramPoolGb, " GB RAM") + ", HA " + String(inputs.haPolicy || "none").toUpperCase() + ", maintenance " + vmDensityExportFormatNumber(inputs.maintenanceReservePct || 0, "%") + ", and growth " + vmDensityExportFormatNumber(inputs.growthPct || 0, "%") + " into Power / Thermal validation."
    }
  ];
}

function buildVmDensityInterpretationExportSection(result) {
  const text = buildVmDensityExportAnalysisSections(result).map((section) => {
    return vmDensityExportCleanText(section.title) + ": " + vmDensityExportCleanText(section.body);
  }).join("\n\n");

  if (!text) return null;
  return {
    title: "Engineering Interpretation",
    description: "Concise VM Density interpretation for report review.",
    text
  };
}

function vmDensityFilteredExportOutputs(rows) {
  return (rows || []).filter((row) => {
    const label = vmDensityExportCleanText(row && row.label);
    return label && label !== "Chart";
  });
}

function buildVmDensityExportPayload(context) {
  context = context || {};
  const getInputRows = typeof context.getInputRows === "function" ? context.getInputRows : () => [];
  const getResultRows = typeof context.getResultRows === "function" ? context.getResultRows : () => [];
  const options = context.options || {};
  const result = currentVmDensityExportResult;
  const inputs = getInputRows();
  const outputs = vmDensityFilteredExportOutputs(getResultRows());

  if (!result || !outputs.length) return null;

  const resultOutputs = result.outputs || {};
  const status = String(result.status || resultOutputs.status || "REVIEW").toUpperCase();
  const modeled = Number(resultOutputs.vms || 0);
  const limiting = resultOutputs.limiting || resultOutputs.primaryConstraint || "Balanced";
  const gap = Number(resultOutputs.capacityGapVms || 0);

  return {
    status,
    summary: "VM Density models " + vmDensityExportFormatVms(modeled) + " with " + limiting + " as the active limiter. Overall status: " + status + ". Headroom/deficit: " + vmDensityExportFormatVms(gap) + ".",
    interpretation: "",
    analysisSections: [],
    inputs,
    outputs,
    chartImage: "",
    extraSections: [
      buildVmDensityVisualExportSection(),
      buildVmDensityReferenceExportSection(),
      buildVmDensityRecommendedActionsExportSection(),
      buildVmDensityDecisionScheduleExportSection(),
      buildVmDensityInterpretationExportSection(result)
    ].filter(Boolean),
    exportSectionsContract: "vm-density-visual-references-actions-schedule-interpretation",
    assumptions: Array.isArray(options.assumptions) ? options.assumptions : [],
    printLowInkChart: false
  };
}

window.ScopedLabsComputeVmDensityExport = {
  buildPayload: buildVmDensityExportPayload
};

  function saveComputeLedgerResult(payload) {
    if (!State || typeof State.recordToolResult !== "function") return null;

    try {
      return State.recordToolResult(STEP, payload);
    } catch {
      return null;
    }
  }
  function invalidate() {
    
    clearVmDensityCapacityVisual();try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["gpu-vram"]);
      sessionStorage.removeItem(FLOW_KEYS["power-thermal"]);
      sessionStorage.removeItem(FLOW_KEYS["raid-rebuild-time"]);
      sessionStorage.removeItem(FLOW_KEYS["backup-window"]);
    } catch {}

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: null,
      continueBtnEl: null,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS[STEP],
      category: CATEGORY,
      step: STEP,
      emptyMessage: "Run calculation."
    });

    hasResult = false;
    hideContinue();
    refreshFlowNote();
    refreshVmDensityActiveWorkflow(null);
  }

  function calc() {
    const hostCores = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.hostCores.value, 1));
    const hostRam = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.hostRam.value, 1));
    const reserve = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.reserve.value, 0));

    const vmCpu = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.vmCpu.value, 1));
    const vmRam = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.vmRam.value, 1));

    const cpuOver = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.cpuOver.value, 1));
    const ramOver = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.ramOver.value, 1));
    const spare = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.spare.value, 0), 0, 80);

    const hostCount = Math.max(1, Math.round(ScopedLabsAnalyzer.safeNumber(els.hostCount.value, 1)));
    const haPolicy = String(els.haPolicy.value || "none");
    const maintenanceReservePct = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.maintenanceReservePct.value, 0), 0, 50);
    const targetVmCount = Math.max(0, Math.round(ScopedLabsAnalyzer.safeNumber(els.targetVmCount.value, 0)));
    const growthPct = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.growthPct.value, 20), 0, 300);
    const workloadMix = String(els.workloadMix.value || "mixed");
    const burstRisk = String(els.burstRisk.value || "normal");
    const storagePressure = String(els.storagePressure.value || "normal");
    const gpuWorkload = boolSelectValue(els.gpuWorkload);
    const backupPressure = boolSelectValue(els.backupPressure);

    const haReservedHosts = getHaReservedHosts(hostCount, haPolicy);
    const usableHostCount = Math.max(1, hostCount - haReservedHosts);
    const maintenanceFactor = 1 - (maintenanceReservePct / 100);
    const baseCpuPoolPerHost = hostCores * (1 - spare / 100) * cpuOver;
    const baseRamPoolPerHost = Math.max(0, hostRam - reserve) * (1 - spare / 100) * ramOver;
    const cpuPool = baseCpuPoolPerHost * usableHostCount * maintenanceFactor;
    const ramPool = baseRamPoolPerHost * usableHostCount * maintenanceFactor;

    const cpuVMs = Math.floor(cpuPool / vmCpu);
    const ramVMs = Math.floor(ramPool / vmRam);

    const vms = Math.max(0, Math.min(cpuVMs, ramVMs));
    const plannedVmDemand = targetVmCount > 0 ? targetVmCount : vms;
    const growthAdjustedVmDemand = targetVmCount > 0
      ? Math.ceil(plannedVmDemand * (1 + growthPct / 100))
      : plannedVmDemand;
    const capacityGapVms = vms - growthAdjustedVmDemand;

    const cpuConsumption = growthAdjustedVmDemand * vmCpu;
    const ramConsumption = growthAdjustedVmDemand * vmRam;

    const effectiveCpuHeadroom = Math.max(0, cpuPool - cpuConsumption);
    const effectiveRamHeadroom = Math.max(0, ramPool - ramConsumption);

    const cpuPressure = Math.min(160, (cpuConsumption / Math.max(cpuPool, 1)) * 100);
    const ramPressure = Math.min(160, (ramConsumption / Math.max(ramPool, 1)) * 100);

    let storageDensityPressure = 22;
    if (upstreamContext && typeof upstreamContext.finalMBps === "number") {
      storageDensityPressure = Math.min(160, upstreamContext.finalMBps / Math.max(growthAdjustedVmDemand, 1));
    }

    const metrics = [
      {
        label: "CPU Density Pressure",
        value: cpuPressure,
        displayValue: `${Math.round(cpuPressure)}%`
      },
      {
        label: "Memory Density Pressure",
        value: ramPressure,
        displayValue: `${Math.round(ramPressure)}%`
      },
      {
        label: "Storage Density Pressure",
        value: storageDensityPressure,
        displayValue: `${Math.round(storageDensityPressure)}%`
      }
    ];

    const compositeScore = Math.round(
      (cpuPressure * 0.40) +
      (ramPressure * 0.40) +
      (storageDensityPressure * 0.20)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    const planningPressureFlags = [];
    if (targetVmCount > 0 && capacityGapVms < 0) {
      planningPressureFlags.push("target-demand-exceeds-modeled-density");
    } else if (targetVmCount > 0 && capacityGapVms <= Math.max(1, Math.ceil(growthAdjustedVmDemand * 0.1))) {
      planningPressureFlags.push("target-demand-near-density-ceiling");
    }
    if (burstRisk === "high") {
      planningPressureFlags.push("high-burst-or-noisy-neighbor-risk");
    } else if (burstRisk === "elevated") {
      planningPressureFlags.push("elevated-burst-or-noisy-neighbor-risk");
    }
    if (storagePressure === "risk") {
      planningPressureFlags.push("storage-pressure-risk-from-prior-compute-tools");
    } else if (storagePressure === "watch") {
      planningPressureFlags.push("storage-pressure-watch-from-prior-compute-tools");
    }
    if (gpuWorkload) planningPressureFlags.push("gpu-vgpu-specialty-branch-possible");
    if (backupPressure) planningPressureFlags.push("backup-replication-pressure-possible");

    if (
      (targetVmCount > 0 && capacityGapVms < 0) ||
      burstRisk === "high" ||
      storagePressure === "risk"
    ) {
      analyzer.status = "RISK";
    } else if (
      analyzer.status !== "RISK" &&
      (
        planningPressureFlags.length > 0 ||
        burstRisk === "elevated" ||
        storagePressure === "watch" ||
        gpuWorkload ||
        backupPressure
      )
    ) {
      analyzer.status = "WATCH";
    }

    let limiting = "Balanced";
    if (cpuVMs < ramVMs) limiting = "CPU";
    if (ramVMs < cpuVMs) limiting = "RAM";

    let densityClass = "Balanced consolidation";
    if (vms >= 40) densityClass = "High consolidation";
    if (vms >= 80) densityClass = "Aggressive consolidation";

    let dominantConstraint = "Balanced host profile";
    if (analyzer.dominant.label === "CPU Density Pressure") {
      dominantConstraint = "CPU oversubscription envelope";
    } else if (analyzer.dominant.label === "Memory Density Pressure") {
      dominantConstraint = "Memory allocation ceiling";
    } else if (analyzer.dominant.label === "Storage Density Pressure") {
      dominantConstraint = "Per-VM storage pressure";
    }

    let crossCheck = "CPU, RAM, and storage appear reasonably aligned";
    if (upstreamContext && typeof upstreamContext.status === "string" && upstreamContext.status === "RISK" && analyzer.status !== "RISK") {
      crossCheck = "Upstream storage throughput may still tighten before the host reaches this modeled density";
    } else if (limiting === "CPU") {
      crossCheck = "CPU is likely to cap consolidation before memory is fully utilized";
    } else if (limiting === "RAM") {
      crossCheck = "Memory is likely to cap consolidation before CPU oversubscription is exhausted";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The host is crowding its usable consolidation envelope too tightly. CPU oversubscription, memory allocation, or storage pressure will begin collapsing margin before the platform can absorb meaningful workload growth.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The density target is workable, but reserve is tightening. The host should operate, although higher contention, burstier workloads, or storage-driven queue pressure will reduce stability margin faster than the VM count alone suggests.";
    } else {
      interpretation =
        "The density target remains inside a manageable operating envelope. Current CPU, memory, and storage assumptions leave room for normal consolidation without making the host the first likely scaling wall.";
    }

    let guidance = "A balanced virtualization host should maintain enough spare capacity to absorb burst behavior and maintenance events.";
    if (analyzer.status === "WATCH") {
      guidance =
        "Validate cluster spare policy, noisy-neighbor behavior, and future resource growth before locking the host count. This is where modest oversubscription can become operationally tight sooner than expected.";
    }
    if (analyzer.status === "RISK") {
      guidance =
        `Rework the density target before continuing. The primary limiter is ${dominantConstraint.toLowerCase()}, so consolidation headroom will collapse there first. Lower per-VM allocation, add host capacity, or reduce oversubscription pressure.`;
    }

    if (planningPressureFlags.length) {
      guidance += " Planning flags: " + planningPressureFlags.join(", ") + ".";
    }

    const summaryRows = [
      { label: "VM Capacity", value: `${vms}` },
      { label: "Target Demand", value: targetVmCount > 0 ? `${targetVmCount}` : "Not set" },
      { label: "Growth Demand", value: `${growthAdjustedVmDemand}` },
      { label: "Usable Hosts", value: `${usableHostCount}` },
      { label: "CPU Limit", value: `${cpuVMs}` },
      { label: "RAM Limit", value: `${ramVMs}` },
      { label: "CPU Pool", value: `${cpuPool.toFixed(1)} vCPU-eq` },
      { label: "RAM Pool", value: `${ramPool.toFixed(1)} GB` },
      { label: "Spare Policy", value: `${spare.toFixed(0)}%` }
    ];

    const derivedRows = [
      { label: "Density Class", value: densityClass },
      { label: "Primary Constraint", value: limiting },
      { label: "HA Policy", value: haPolicy.toUpperCase() },
      { label: "Capacity Gap", value: `${capacityGapVms} VMs` },
      { label: "Workload Mix", value: workloadMix },
      { label: "Risk Factors", value: planningPressureFlags.length ? String(planningPressureFlags.length) : "None" },
      { label: "Cross-Check", value: crossCheck },
      { label: "CPU Headroom", value: `${effectiveCpuHeadroom.toFixed(1)} vCPU-eq` },
      { label: "RAM Headroom", value: `${effectiveRamHeadroom.toFixed(1)} GB` }
    ];

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows,
      derivedRows,
      status: analyzer.status,
      interpretation,
      dominantConstraint,
      guidance,
      chart: {
        labels: metrics.map((m) => m.label),
        values: metrics.map((m) => m.value),
        displayValues: metrics.map((m) => m.displayValue),
        referenceValue: 65,
        healthyMax: 65,
        watchMax: 85,
        axisTitle: "VM Density Stress Magnitude",
        referenceLabel: "Healthy Margin Floor",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          120,
          Math.ceil(Math.max(...metrics.map((m) => m.value), 85) * 1.08)
        )
      }
    });
    const vmDensityStatus = String(analyzer.status || "").toUpperCase();
    const vmDensityPlannerReviewNeeded =
      ["RISK", "WATCH", "REVIEW"].includes(vmDensityStatus) ||
      limiting !== "Balanced" ||
      planningPressureFlags.length > 0 ||
      (targetVmCount > 0 && capacityGapVms < 0);
    const plannerRouting = {
      branch: "compute-density",
      toolRole: "vm-density",
      routeIntent: vmDensityStatus === "RISK" ? "planner-review-before-power-thermal" : "continue-to-power-thermal",
      nextTool: "power-thermal",
      nextHref: "/tools/compute/power-thermal/",
      plannerAssistantDecisionNeeded: vmDensityPlannerReviewNeeded,
      decisionBasis: [
        "Status: " + analyzer.status,
        "Modeled VM density: " + vms + " VMs",
        "Limiting factor: " + limiting,
        "Density class: " + densityClass,
        "Planned hosts: " + hostCount,
        "Usable hosts after HA: " + usableHostCount,
        "HA policy: " + haPolicy.toUpperCase(),
        "Maintenance reserve: " + maintenanceReservePct.toFixed(0) + "%",
        "Target VM demand: " + (targetVmCount > 0 ? targetVmCount : "not set"),
        "Growth-adjusted demand: " + growthAdjustedVmDemand,
        "Capacity gap: " + capacityGapVms + " VMs",
        "Workload mix: " + workloadMix,
        "Burst risk: " + burstRisk,
        "Storage pressure: " + storagePressure,
        "CPU limit: " + cpuVMs + " VMs",
        "RAM limit: " + ramVMs + " VMs",
        "Spare policy: " + spare.toFixed(0) + "%"
      ],
      specialtyBranchCandidates: [
        { tool: "power-thermal", reason: "Continue when modeled density is accepted and host count, CPU pool, and RAM pool should be translated into power and thermal load." },
        { tool: "gpu-vram", reason: "Use when density assumptions include GPU passthrough, vGPU, AI/ML, rendering, CUDA, inference, training, or VRAM-sensitive acceleration." },
        { tool: "nic-bonding", reason: "Use when consolidation increases east-west traffic, storage traffic, backup traffic, or host uplink pressure within the Compute pipeline." },
        { tool: "backup-window", reason: "Use when the modeled VM count changes backup, restore, replication, or recovery-window assumptions." },
        { tool: "summary", reason: "Use only when VM density is accepted and no downstream power, GPU, network, backup, rebuild, or other Compute branch is selected." }
      ],
      futureGoldTierDependencies: [
        { area: "Power / electrical design", reason: "Gold-tier site coordination can validate circuits, panels, UPS, and rack power once Compute power load is known." },
        { area: "Cooling / rack environment", reason: "Gold-tier site coordination can validate cooling, rack placement, and room-level thermal assumptions after Compute thermal load is known." },
        { area: "Network switching design", reason: "Gold-tier site coordination can validate switch capacity and uplink design after Compute NIC bonding or network pressure is known." }
      ]
    };

    const vmDensityResult = {
      label: "VM Density",
      title: "VM Density",
      summary: String(vms) + " modeled VMs; limiting factor " + limiting,
      status: analyzer.status,
      summaryStatus: analyzer.status,
      keySavedResult: String(vms) + " VMs / " + analyzer.status,
      inputs: {
        hostCores,
        hostRamGb: hostRam,
        reserveGb: reserve,
        vmCpu,
        vmRamGb: vmRam,
        cpuOvercommitRatio: cpuOver,
        ramOvercommitRatio: ramOver,
        sparePolicyPercent: spare,
        hostCount,
        haPolicy,
        haReservedHosts,
        maintenanceReservePct,
        targetVmCount,
        growthPct,
        workloadMix,
        burstRisk,
        storagePressure,
        gpuWorkload,
        backupPressure
      },
      outputs: {
        vms,
        plannedVmDemand,
        growthAdjustedVmDemand,
        capacityGapVms,
        usableHostCount,
        baseCpuPoolPerHost: Number(baseCpuPoolPerHost.toFixed(1)),
        baseRamPoolPerHost: Number(baseRamPoolPerHost.toFixed(1)),
        cpuLimitVms: cpuVMs,
        ramLimitVms: ramVMs,
        cpuPoolVcpu: Number(cpuPool.toFixed(1)),
        ramPoolGb: Number(ramPool.toFixed(1)),
        cpuHeadroomVcpu: Number(effectiveCpuHeadroom.toFixed(1)),
        ramHeadroomGb: Number(effectiveRamHeadroom.toFixed(1)),
        limiting,
        densityClass,
        crossCheck,
        dominantConstraint,
        status: analyzer.status
      },
      interpretation,
      guidance,
      summaryRows,
      derivedRows,
      plannerRouting,
      plannerAssistantDecisionNeeded: plannerRouting.plannerAssistantDecisionNeeded,
      plannerRouteHint: plannerRouting.routeIntent,
      specialtyBranchCandidates: plannerRouting.specialtyBranchCandidates,
      futureGoldTierDependencies: plannerRouting.futureGoldTierDependencies,
      planningPressureFlags,
      assistantRecommendation: {
        recommendation: guidance,
        interpretation,
        nextStep: plannerRouting.nextTool,
        plannerRouting,
        plannerAssistantDecisionNeeded: plannerRouting.plannerAssistantDecisionNeeded,
        plannerRouteHint: plannerRouting.routeIntent,
        specialtyBranchCandidates: plannerRouting.specialtyBranchCandidates,
        futureGoldTierDependencies: plannerRouting.futureGoldTierDependencies,
        planningPressureFlags
      },
      updatedAt: new Date().toISOString()
    };

    currentVmDensityExportResult = vmDensityResult;

    renderVmDensitySummaryCard(vmDensityResult);
    renderVmDensityCapacityVisual(vmDensityResult);
    renderVmDensityReferences(vmDensityResult);
    renderVmDensityRecommendedActions(vmDensityResult);
    renderVmDensityDecisionSchedule(vmDensityResult);

ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: vmDensityResult
    });

    saveComputeLedgerResult(vmDensityResult);

    hasResult = true;
    showContinue();
    refreshVmDensityActiveWorkflow(vmDensityResult);
  
    if (window.ScopedLabsExport && typeof window.ScopedLabsExport.refresh === "function") {
      window.ScopedLabsExport.refresh();
    }
}

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.hostCores.value = 32;
    els.hostRam.value = 256;
    els.reserve.value = 16;
    els.vmCpu.value = 2;
    els.vmRam.value = 4;
    els.cpuOver.value = 3;
    els.ramOver.value = 1.1;
    els.spare.value = 15;
    els.hostCount.value = 1;
    els.haPolicy.value = "none";
    els.maintenanceReservePct.value = 0;
    els.targetVmCount.value = 0;
    els.growthPct.value = 20;
    els.workloadMix.value = "mixed";
    els.burstRisk.value = "normal";
    els.storagePressure.value = "normal";
    storagePressurePrefilled = false;
    els.gpuWorkload.value = "no";
    els.backupPressure.value = "no";
    prefillStoragePressureFromUpstream();
    invalidate();
  });

  [
    "hostCores",
    "hostRam",
    "reserve",
    "vmCpu",
    "vmRam",
    "cpuOver",
    "ramOver",
    "spare",
    "hostCount",
    "haPolicy",
    "maintenanceReservePct",
    "targetVmCount",
    "growthPct",
    "workloadMix",
    "burstRisk",
    "storagePressure",
    "gpuWorkload",
    "backupPressure"
  ].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/compute/power-thermal/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    
    normalizeVmDensityPlanningInputsHeading();
    prefillStoragePressureFromUpstream();

    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    unlockCategoryPage();
    setTimeout(() => {
      unlockCategoryPage();
    }, 400);

    refreshFlowNote();
    hideContinue();
    refreshVmDensityActiveWorkflow(null);
  });
})();