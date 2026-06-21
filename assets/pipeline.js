// /assets/pipeline.js
(() => {
  "use strict";

  const pipelines = window.SCOPED_PIPELINES || {};
  const body = document.body;
  if (!body) return;

  const category = body.dataset.category;
  const currentStep = body.dataset.step;
  const laneName = body.dataset.lane || "v1";

  if (!category || !currentStep) return;

  // Support BOTH:
  // 1) new nested structure: SCOPED_PIPELINES.categories[category].lanes[laneName]
  // 2) old flat structure:   SCOPED_PIPELINES[category]
  const nestedSteps =
    pipelines?.categories?.[category]?.lanes?.[laneName];

  const flatSteps =
    pipelines?.[category];

  const steps = Array.isArray(nestedSteps) && nestedSteps.length
    ? nestedSteps
    : (Array.isArray(flatSteps) ? flatSteps : []);

  if (!Array.isArray(steps) || !steps.length) return;

  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  if (currentIndex === -1) return;

  // If already rendered anywhere, stop
  if (document.getElementById("sl-design-pipeline")) return;

  const explicitAnchor = document.getElementById("pipeline");

  const h1 =
    document.querySelector("main .container h1") ||
    document.querySelector("main.container h1") ||
    document.querySelector("main h1");

  if (!explicitAnchor && !h1) return;

  const wrap = document.createElement("section");
  wrap.id = "sl-design-pipeline";
  wrap.className = "sl-pipeline card";
  wrap.setAttribute("aria-label", "Design pipeline");

  const title = document.createElement("div");
  title.className = "sl-pipeline-title";
  title.textContent = "DESIGN PIPELINE";
  wrap.appendChild(title);

  const hasFlowGroups = steps.some((step) => {
    return !!(step && (step.flowGroup || step.group || step.lane));
  });

  const indexedSteps = steps.map((step, index) => ({ ...step, __slIndex: index }));

  function flowGroupFor(step) {
    const raw = String(step.flowGroup || step.group || step.lane || "").toLowerCase();

    if (raw.includes("foundation") || step.id === "area-planner") return "foundation";
    if (raw.includes("optional") || raw.includes("specialty") || raw.includes("branch")) return "optional-specialty-zone";

    return "core";
  }

  function readScopedJsonStorage(key) {
    if (!key || typeof window === "undefined") return null;
    var raw = null;

    try { raw = window.sessionStorage && window.sessionStorage.getItem(key); } catch (error) { raw = null; }
    if (!raw) {
      try { raw = window.localStorage && window.localStorage.getItem(key); } catch (error) { raw = null; }
    }

    if (!raw) return null;
    try { return JSON.parse(raw); } catch (error) { return null; }
  }

  function readComputeGuidedPipelineContext() {
    var State = window.ScopedLabsComputePlanState || {};

    try {
      if (typeof State.getGuidedFlowContext === "function") {
        var fromState = State.getGuidedFlowContext();
        if (fromState && fromState.guidedFlow === true && fromState.routeMode === "compute-guided") return fromState;
      }
    } catch (error) {
      /* Fall through to storage. */
    }

    var fromStorage = readScopedJsonStorage("scopedlabs:pipeline:compute:guided-flow");
    if (fromStorage && fromStorage.guidedFlow === true && fromStorage.routeMode === "compute-guided") return fromStorage;
    return null;
  }

  function readComputeActivePipelineContext() {
    return readScopedJsonStorage("scopedlabs:pipeline:compute:active-workload") ||
      readScopedJsonStorage("scopedlabs:pipeline:compute:workload-context") ||
      null;
  }

  function readComputePipelinePlan() {
    var State = window.ScopedLabsComputePlanState || {};
    var methodNames = ["getPlanSnapshot", "getPlan", "readPlan", "loadPlan", "getWorkloadPlan"];

    for (var i = 0; i < methodNames.length; i += 1) {
      var name = methodNames[i];
      try {
        if (typeof State[name] === "function") {
          var plan = State[name]();
          if (plan) return plan;
        }
      } catch (error) {
        /* Fall through to storage. */
      }
    }

    return readScopedJsonStorage("scopedlabs:pipeline:compute:workload-plan") || {};
  }

  function findComputePipelineWorkload(plan, context) {
    if (!plan && !context) return null;

    var workloadId = context && (context.workloadId || context.activeWorkloadId || "");
    var lists = plan ? [plan.workloads, plan.items, plan.scopes, plan.entries] : [];

    for (var i = 0; i < lists.length; i += 1) {
      var list = Array.isArray(lists[i]) ? lists[i] : [];
      for (var j = 0; j < list.length; j += 1) {
        var item = list[j];
        if (item && String(item.id || item.workloadId || "") === String(workloadId)) return item;
      }
    }

    if (context && context.workload && typeof context.workload === "object") {
      if (!workloadId || String(context.workload.id || context.workload.workloadId || "") === String(workloadId)) return context.workload;
    }

    var activeContext = readComputeActivePipelineContext();
    if (activeContext && activeContext.workload && typeof activeContext.workload === "object") {
      var activeWorkload = activeContext.workload;
      var activeId = activeContext.activeWorkloadId || activeContext.workloadId || activeWorkload.id || activeWorkload.workloadId || "";
      if (!workloadId || String(activeId) === String(workloadId)) return activeWorkload;
    }

    if (plan && Array.isArray(plan.workloads)) {
      var activePlanId = plan.activeWorkloadId || plan.activeId || plan.currentWorkloadId || "";
      if (activePlanId) {
        var activePlanWorkload = plan.workloads.find(function (item) {
          return item && String(item.id || item.workloadId || "") === String(activePlanId);
        });
        if (activePlanWorkload) return activePlanWorkload;
      }

      if (plan.workloads.length === 1) return plan.workloads[0];
    }

    return null;
  }

  function computeGuidedPipelineDecision(plan, workload, context) {
    var RouteEngine = window.ScopedLabsComputeGuidedRouteEngine;
    if (!RouteEngine || typeof RouteEngine.resolve !== "function") return null;

    try {
      return RouteEngine.resolve({
        category: "compute",
        currentTool: currentStep,
        guidedFlow: true,
        routeMode: "compute-guided",
        guidedContext: context,
        context: context,
        plan: plan,
        workload: workload
      });
    } catch (error) {
      return null;
    }
  }

  function computeGuidedPipelineStepState(step) {
    if (category !== "compute" || !step || !step.id) return null;

    var context = readComputeGuidedPipelineContext();
    if (!context) return null;

    var RouteEngine = window.ScopedLabsComputeGuidedRouteEngine;
    if (!RouteEngine || typeof RouteEngine.applicableSteps !== "function" || typeof RouteEngine.completedMap !== "function") return null;

    var plan = readComputePipelinePlan();
    var workload = findComputePipelineWorkload(plan, context);
    if (!workload) return null;

    var tool = String(step.id);
    var completed = RouteEngine.completedMap(plan, workload) || {};
    var applicableSteps = RouteEngine.applicableSteps(workload) || [];
    var applicable = {};
    var applicableTools = [];

    function addApplicable(toolId) {
      if (!toolId || applicable[toolId]) return;
      applicable[toolId] = true;
      applicableTools.push(toolId);
    }

    applicableSteps.forEach(function (item) {
      if (item && item.tool) addApplicable(item.tool);
    });

    if (Array.isArray(context.selectedBranchTools)) {
      context.selectedBranchTools.forEach(addApplicable);
    }

    if (!applicable[currentStep] && currentStep !== "workload-planner" && currentStep !== "summary") {
      addApplicable(currentStep);
    }

    var currentApplicableIndex = applicableTools.indexOf(currentStep);
    var toolApplicableIndex = applicableTools.indexOf(tool);

    if (tool === currentStep) return "current";
    if (completed[tool]) return "complete";

    if (toolApplicableIndex >= 0 && currentApplicableIndex >= 0 && toolApplicableIndex < currentApplicableIndex) {
      return "complete";
    }

    if (step.categoryEndpoint === "planner") return "complete";
    if (step.categoryEndpoint === "summary") return "future";
    if (applicable[tool]) return "future";
    return "skipped";
  }

  function appendStepAnchor(parent, step) {
    const index = Number.isInteger(step && step.__slIndex) ? step.__slIndex : steps.indexOf(step);
    const currentStepData = steps[currentIndex];
    const currentGroup = hasFlowGroups ? flowGroupFor(currentStepData) : "";
    const stepGroup = hasFlowGroups ? flowGroupFor(step) : "";
    const isCategoryEndpoint = !!(step && step.categoryEndpoint);
    const isSummaryEndpoint = step && step.categoryEndpoint === "summary";
    const guidedState = computeGuidedPipelineStepState(step);
    const isCurrent = guidedState ? guidedState === "current" : index === currentIndex;
    const isPast = guidedState ? guidedState === "complete" : !isSummaryEndpoint && (hasFlowGroups
      ? (
          (
            stepGroup === "foundation" &&
            currentGroup !== "foundation" &&
            index < currentIndex
          ) ||
          (
            stepGroup === currentGroup &&
            index < currentIndex &&
            currentGroup !== "optional-specialty-zone"
          )
        )
      : index < currentIndex);
    const isSkipped = guidedState === "skipped";
    const isFuture = guidedState ? (guidedState === "future" || isSkipped) : !isCurrent && !isPast;

    const a = document.createElement("a");
    a.href = step.href;
    a.className = "sl-pipeline-step";
    if (isPast) a.classList.add("is-complete");
    if (isCurrent) a.classList.add("is-current");
    if (isFuture) a.classList.add("is-future");
    if (isSkipped) a.classList.add("is-skipped");
    if (step.optional) a.classList.add("is-optional");
    if (isCategoryEndpoint) {
      a.classList.add("is-category-endpoint");
      a.setAttribute("data-category-endpoint", String(step.categoryEndpoint));
    }
    a.setAttribute("data-step", step.id);
    if (guidedState) a.setAttribute("data-guided-pipeline-state", guidedState);
    if (step.optional) a.setAttribute("data-optional-step", "true");
    if (isCurrent) a.setAttribute("aria-current", "step");

    const dot = document.createElement("span");
    dot.className = "sl-pipeline-dot";
    dot.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "sl-pipeline-label";
    label.textContent = step.label;

    a.appendChild(dot);
    a.appendChild(label);
    parent.appendChild(a);
  }

  function appendStepRow(parent, groupSteps, ariaLabel) {
    const row = document.createElement("nav");
    row.className = "sl-pipeline-row";
    row.setAttribute("aria-label", ariaLabel || "Pipeline steps");

    groupSteps.forEach((step, index) => {
      appendStepAnchor(row, step);

      if (index < groupSteps.length - 1) {
        const arrow = document.createElement("span");
        arrow.className = "sl-pipeline-sep";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "\u2192";
        row.appendChild(arrow);
      }
    });

    parent.appendChild(row);
  }

  function appendGroupedFlow(parent, label, description, groupSteps, ariaLabel) {
    if (!groupSteps.length) return;

    const representativeStep = groupSteps.find(function (step) {
      return step && (step.flowGroupLabel || step.groupLabel || step.flowGroupDescription || step.groupDescription);
    }) || groupSteps[0] || {};
    const resolvedLabel = representativeStep.flowGroupLabel || representativeStep.groupLabel || label;
    const resolvedDescription = representativeStep.flowGroupDescription || representativeStep.groupDescription || description;

    const group = document.createElement("div");
    group.className = "sl-pipeline-group";
    group.setAttribute("data-pipeline-group", resolvedLabel);

    if (parent.childElementCount > 0) {
      group.style.marginTop = "12px";
      group.style.paddingTop = "12px";
      group.style.borderTop = "1px solid rgba(255,255,255,.08)";
    }

    if (category === "compute" && flowGroupFor(groupSteps[0] || {}) === "foundation") {
      group.setAttribute("data-pipeline-group", "Compute Workload Planner");
      group.setAttribute("data-compute-workload-planner-nav", "true");
      group.setAttribute("data-compute-workload-planner-nav-pipeline", "true");
      group.setAttribute("data-compute-workload-planner-title", "Compute Workload Planner");
      group.setAttribute("data-compute-workload-planner-href", "/tools/compute/workload-planner/");

      if (
        window.ScopedLabsComputePlanState &&
        typeof window.ScopedLabsComputePlanState.bindWorkloadPlannerNav === "function"
      ) {
        window.ScopedLabsComputePlanState.bindWorkloadPlannerNav({ mount: group, title: "Compute Workload Planner", href: "/tools/compute/workload-planner/" });
      } else if (typeof window !== "undefined") {
        window.addEventListener("DOMContentLoaded", function () {
          if (
            window.ScopedLabsComputePlanState &&
            typeof window.ScopedLabsComputePlanState.bindWorkloadPlannerNav === "function"
          ) {
            window.ScopedLabsComputePlanState.bindWorkloadPlannerNav({ mount: group, title: "Compute Workload Planner", href: "/tools/compute/workload-planner/" });
          }
        }, { once: true });
      }

      parent.appendChild(group);
      return;
    }

    const groupLabel = document.createElement("div");
    groupLabel.className = "sl-pipeline-group-label";
    groupLabel.textContent = resolvedLabel;
    groupLabel.style.fontSize = ".74rem";
    groupLabel.style.fontWeight = "800";
    groupLabel.style.letterSpacing = ".08em";
    groupLabel.style.textTransform = "uppercase";
    groupLabel.style.color = "rgba(125,255,158,.86)";
    groupLabel.style.marginBottom = "6px";
    group.appendChild(groupLabel);

    if (resolvedDescription) {
      const desc = document.createElement("div");
      desc.className = "sl-pipeline-group-description";
      desc.textContent = resolvedDescription;
      desc.style.fontSize = ".86rem";
      desc.style.color = "rgba(255,255,255,.68)";
      desc.style.margin = "0 0 8px 0";
      group.appendChild(desc);
    }

    appendStepRow(group, groupSteps, ariaLabel);
    parent.appendChild(group);
  }

  if (hasFlowGroups) {
    title.textContent = "DESIGN FLOW";

    const groupedFlowCopy = category === "access-control"
      ? {
          foundationLabel: "Foundation",
          foundationDescription: "Create or select the access scope being planned.",
          foundationAria: "Access Control foundation step",
          coreLabel: "Core access pipeline",
          coreDescription: "Run this path for normal access-controlled doors, or select an individual core tool.",
          coreAria: "Access Control core access pipeline steps",
          specialtyLabel: "Optional specialty zones",
          specialtyDescription: "Use these only when the access design needs elevator, anti-passback, or special locking review, or select an individual specialty tool.",
          specialtyAria: "Access Control optional specialty zone checks"
        }
      : {
          foundationLabel: "Foundation",
          foundationDescription: "Create or select the area/zone being planned.",
          foundationAria: "Physical Security foundation step",
          coreLabel: "Core area pipeline",
          coreDescription: "Run this path for normal camera coverage areas, or select an individual core tool.",
          coreAria: "Physical Security core area pipeline steps",
          specialtyLabel: "Optional specialty zones",
          specialtyDescription: "Use these only when a specific area needs identity or vehicle capture validation, or select an individual specialty tool.",
          specialtyAria: "Physical Security optional specialty zone checks"
        };

    const groupsWrap = document.createElement("div");
    groupsWrap.className = "sl-pipeline-groups";

    appendGroupedFlow(
      groupsWrap,
      groupedFlowCopy.foundationLabel,
      groupedFlowCopy.foundationDescription,
      indexedSteps.filter((step) => flowGroupFor(step) === "foundation"),
      groupedFlowCopy.foundationAria
    );

    appendGroupedFlow(
      groupsWrap,
      groupedFlowCopy.coreLabel,
      groupedFlowCopy.coreDescription,
      indexedSteps.filter((step) => flowGroupFor(step) === "core"),
      groupedFlowCopy.coreAria
    );

    appendGroupedFlow(
      groupsWrap,
      groupedFlowCopy.specialtyLabel,
      groupedFlowCopy.specialtyDescription,
      indexedSteps.filter((step) => flowGroupFor(step) === "optional-specialty-zone"),
      groupedFlowCopy.specialtyAria
    );

    wrap.appendChild(groupsWrap);
  } else {
    const row = document.createElement("nav");
    row.className = "sl-pipeline-row";
    row.setAttribute("aria-label", "Pipeline steps");

    indexedSteps.forEach((step, index) => {
      appendStepAnchor(row, step);

      if (index < indexedSteps.length - 1) {
        const arrow = document.createElement("span");
        arrow.className = "sl-pipeline-sep";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "\u2192";
        row.appendChild(arrow);
      }
    });

    wrap.appendChild(row);
  }

  if (explicitAnchor) {
    // Clear any ghost space / leftover manual content
    explicitAnchor.innerHTML = "";
    explicitAnchor.appendChild(wrap);
  } else {
    const headingWrapper = h1.closest(".summary-page-heading");
    if (headingWrapper && headingWrapper.parentElement) {
      headingWrapper.insertAdjacentElement("afterend", wrap);
    } else {
      h1.insertAdjacentElement("afterend", wrap);
    }
  }
})();