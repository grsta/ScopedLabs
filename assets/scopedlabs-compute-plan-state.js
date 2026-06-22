(function () {
  "use strict";

  var CATEGORY = "compute";
  var CONTRACT = "scopedlabs.compute.workload-plan.v1";
  var PLAN_KEY = "scopedlabs:pipeline:compute:workload-plan";
  var ACTIVE_KEY = "scopedlabs:pipeline:compute:active-workload";
  var CONTEXT_KEY = "scopedlabs:pipeline:compute:workload-context";
  var GUIDED_FLOW_KEY = "scopedlabs:pipeline:compute:guided-flow";
  var PLAN_CHANGE_EVENT = "scopedlabs:compute:workload-plan-change";

  function now() {
    return new Date().toISOString();
  }

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function createId() {
    return "cw-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function defaultPlan() {
    return {
      contract: CONTRACT,
    eventName: PLAN_CHANGE_EVENT,
      category: CATEGORY,
      activeWorkloadId: null,
      workloads: [],
      results: {},
      updatedAt: now()
    };
  }

  function normalizePlan(plan) {
    var next = plan && typeof plan === "object" ? plan : defaultPlan();
    next.contract = CONTRACT;
    next.category = CATEGORY;
    next.workloads = Array.isArray(next.workloads) ? next.workloads : [];
    next.results = next.results && typeof next.results === "object" ? next.results : {};
    next.updatedAt = next.updatedAt || now();
    return next;
  }


  function emitPlanChange(action, plan, workload) {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;

    var source = normalizePlan(plan || load());
    var active = workload || activeWorkload(source);
    var detail = {
      action: action || "updated",
      plan: source,
      activeWorkload: active,
      activeWorkloadId: source.activeWorkloadId || null,
      workloads: source.workloads.slice(),
      updatedAt: now()
    };

    try {
      window.dispatchEvent(new CustomEvent(PLAN_CHANGE_EVENT, { detail: detail }));
    } catch {
      var event = document.createEvent("Event");
      event.initEvent(PLAN_CHANGE_EVENT, true, true);
      event.detail = detail;
      window.dispatchEvent(event);
    }
  }

  function onPlanChange(handler) {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function" || typeof handler !== "function") {
      return function () {};
    }

    window.addEventListener(PLAN_CHANGE_EVENT, handler);
    return function () {
      window.removeEventListener(PLAN_CHANGE_EVENT, handler);
    };
  }

  function load() {
    return normalizePlan(safeParse(localStorage.getItem(PLAN_KEY), null));
  }

  function save(plan) {
    var next = normalizePlan(plan);
    next.updatedAt = now();
    localStorage.setItem(PLAN_KEY, JSON.stringify(next));
    sessionStorage.setItem(PLAN_KEY, JSON.stringify(next));
    emitPlanChange("save", next, activeWorkload(next));
    return next;
  }

  function activeWorkload(plan) {
    var source = normalizePlan(plan || load());
    return source.workloads.find(function (item) {
      return item.id === source.activeWorkloadId;
    }) || source.workloads[0] || null;
  }

  function writeContext(workload, plan) {
    if (!workload) return null;

    var payload = {
      contract: "scopedlabs.compute.active-workload.v1",
      category: CATEGORY,
      sourceTool: "workload-planner",
      activeWorkloadId: workload.id,
      workload: workload,
      planUpdatedAt: plan && plan.updatedAt ? plan.updatedAt : now(),
      updatedAt: now()
    };

    sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(payload));
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(payload));
    sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(payload));
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(payload));
    return payload;
  }

  function branchSeeds(workload) {
    var branches = workload && workload.branches ? workload.branches : {};

    return {
      "vm-density": Boolean(branches.vmDensity),
      "gpu-vram": Boolean(branches.gpu),
      "nic-bonding": Boolean(branches.nicBonding),
      "backup-window": Boolean(branches.backup),
      "raid-rebuild-time": Boolean(branches.raid),
      "power-thermal": Boolean(branches.powerThermal),
      "storage-iops": Boolean(branches.storageHeavy),
      "storage-throughput": Boolean(branches.storageHeavy)
    };
  }

  function writeBranchSeeds(workload) {
    if (!workload) return [];

    var seeds = branchSeeds(workload);
    var written = [];

    Object.keys(seeds).forEach(function (toolSlug) {
      if (!seeds[toolSlug]) return;

      var payload = {
        contract: "scopedlabs.compute.branch-seed." + toolSlug + ".v1",
        category: CATEGORY,
        sourceTool: "workload-planner",
        branchTool: toolSlug,
        workloadId: workload.id,
        workloadName: workload.name,
        planningPath: workload.planningPath,
        workloadType: workload.workloadType,
        criticality: workload.criticality,
        primaryConstraint: workload.primaryConstraint,
        updatedAt: now()
      };

      var key = "scopedlabs:pipeline:compute:branch-seed:" + toolSlug;
      sessionStorage.setItem(key, JSON.stringify(payload));
      localStorage.setItem(key, JSON.stringify(payload));
      written.push(toolSlug);
    });

    return written;
  }

  function createGuidedFlowId() {
    return "compute-guided-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  }

  function selectedBranchTools(workload) {
    var seeds = branchSeeds(workload);
    return Object.keys(seeds).filter(function (toolSlug) { return !!seeds[toolSlug]; });
  }

  function writeGuidedFlowContext(payload) {
    if (!payload) return null;
    sessionStorage.setItem(GUIDED_FLOW_KEY, JSON.stringify(payload));
    localStorage.setItem(GUIDED_FLOW_KEY, JSON.stringify(payload));
    return payload;
  }

  function readGuidedFlowContext() {
    var payload = safeParse(sessionStorage.getItem(GUIDED_FLOW_KEY), null) || safeParse(localStorage.getItem(GUIDED_FLOW_KEY), null);
    if (!payload || payload.contract !== "scopedlabs.compute.guided-flow.v1" || payload.guidedFlow !== true) return null;
    return payload;
  }

  function startGuidedFlow(workloadId) {
    var plan = load();
    var workload = workloadId
      ? (plan.workloads || []).find(function (item) { return item.id === workloadId; })
      : activeWorkload(plan);

    if (!workload) return null;

    plan.activeWorkloadId = workload.id;
    plan = save(plan);
    writeContext(workload, plan);
    writeBranchSeeds(workload);

    var payload = {
      contract: "scopedlabs.compute.guided-flow.v1",
      category: CATEGORY,
      guidedFlow: true,
      guidedFlowId: createGuidedFlowId(),
      routeMode: "compute-guided",
      sourceTool: "workload-planner",
      startedFrom: "workload-planner",
      activeWorkloadId: workload.id,
      workloadId: workload.id,
      workloadName: workload.name || "Compute Workload",
      currentTool: "workload-planner",
      nextTool: "cpu-sizing",
      nextHref: "/tools/compute/cpu-sizing/",
      selectedBranchTools: selectedBranchTools(workload),
      startedAt: now(),
      updatedAt: now()
    };

    writeGuidedFlowContext(payload);
    emitPlanChange("guided-flow-start", plan, workload);
    return payload;
  }

  function getGuidedFlowContext() {
    return readGuidedFlowContext();
  }

  function isGuidedFlowActive() {
    return !!readGuidedFlowContext();
  }

  function clearGuidedFlow() {
    sessionStorage.removeItem(GUIDED_FLOW_KEY);
    localStorage.removeItem(GUIDED_FLOW_KEY);
    var plan = load();
    emitPlanChange("guided-flow-clear", plan, activeWorkload(plan));
    return true;
  }

  function upsertWorkload(workload) {
    var plan = load();
    var next = Object.assign({}, workload || {});
    next.id = next.id || createId();
    next.name = next.name || "Compute Workload";
    next.updatedAt = now();
    next.createdAt = next.createdAt || now();

    var index = plan.workloads.findIndex(function (item) {
      return item.id === next.id;
    });

    if (index >= 0) plan.workloads[index] = next;
    else plan.workloads.push(next);

    plan.activeWorkloadId = next.id;
    plan = save(plan);
    writeContext(next, plan);
    writeBranchSeeds(next);

    return { plan: plan, workload: next };
  }

  function setActiveWorkload(id) {
    var plan = load();
    var match = plan.workloads.find(function (item) {
      return item.id === id;
    });

    if (!match) return null;

    plan.activeWorkloadId = id;
    plan = save(plan);
    writeContext(match, plan);
    writeBranchSeeds(match);
    return match;
  }

  function invalidateToolAndDownstream(toolSlug, options) {
    options = options || {};
    var plan = load();
    var active = activeWorkload(plan);
    var workloadId = active ? active.id : "unscoped";
    var downstream = Array.isArray(options.downstreamTools) ? options.downstreamTools.slice() : [];
    var tools = [];

    if (options.includeSelf && toolSlug) tools.push(toolSlug);
    downstream.forEach(function (tool) {
      if (tool && tools.indexOf(tool) === -1) tools.push(tool);
    });

    if (!tools.length) return { plan: plan, workload: active, cleared: [] };

    plan.results = plan.results && typeof plan.results === "object" ? plan.results : {};
    plan.results[workloadId] = plan.results[workloadId] && typeof plan.results[workloadId] === "object" ? plan.results[workloadId] : {};

    tools.forEach(function (tool) {
      delete plan.results[workloadId][tool];
      try {
        sessionStorage.removeItem("scopedlabs:pipeline:compute:" + tool);
        localStorage.removeItem("scopedlabs:pipeline:compute:" + tool);
      } catch (error) {}
    });

    if (active) {
      active.completedTools = active.completedTools && typeof active.completedTools === "object" ? active.completedTools : {};
      active.completedChecks = active.completedChecks && typeof active.completedChecks === "object" ? active.completedChecks : {};
      active.toolStatuses = active.toolStatuses && typeof active.toolStatuses === "object" ? active.toolStatuses : {};
      active.keyResults = active.keyResults && typeof active.keyResults === "object" ? active.keyResults : {};

      tools.forEach(function (tool) {
        delete active.completedTools[tool];
        delete active.completedChecks[tool];
        delete active.toolStatuses[tool];
        delete active.keyResults[tool];
      });

      active.updatedAt = now();
    }

    plan.updatedAt = now();
    plan = save(plan);
    if (active) writeContext(active, plan);
    emitPlanChange("tool-downstream-invalidated", plan, active);

    return { plan: plan, workload: active, cleared: tools };
  }

  function recordToolResult(toolSlug, result) {
    var plan = load();
    var active = activeWorkload(plan);
    var workloadId = active ? active.id : "unscoped";
    var savedResult = result || {};
    var statusValue = String(savedResult.status || savedResult.summaryStatus || "PENDING").toUpperCase();

    plan.results[workloadId] = plan.results[workloadId] || {};
    plan.results[workloadId][toolSlug] = {
      contract: "scopedlabs.compute.tool-result." + toolSlug + ".v1",
      category: CATEGORY,
      tool: toolSlug,
      workloadId: workloadId,
      result: savedResult,
      updatedAt: now()
    };

    if (active) {
      active.completedTools = active.completedTools && typeof active.completedTools === "object" ? active.completedTools : {};
      active.completedChecks = active.completedChecks && typeof active.completedChecks === "object" ? active.completedChecks : {};
      active.toolStatuses = active.toolStatuses && typeof active.toolStatuses === "object" ? active.toolStatuses : {};
      active.keyResults = active.keyResults && typeof active.keyResults === "object" ? active.keyResults : {};

      active.completedTools[toolSlug] = true;
      active.completedChecks[toolSlug] = true;
      active.toolStatuses[toolSlug] = statusValue;
      active.keyResults[toolSlug] = {
        label: savedResult.label || savedResult.title || toolSlug,
        summary: savedResult.summary || savedResult.keySavedResult || "",
        status: statusValue,
        updatedAt: now()
      };

      if (statusValue === "RISK") {
        active.status = "RISK";
      } else if (statusValue === "WATCH" && active.status !== "RISK") {
        active.status = "WATCH";
      } else if (active.status !== "RISK" && active.status !== "WATCH") {
        active.status = "PENDING";
      }

      active.updatedAt = now();

      plan.workloads = plan.workloads.map(function (item) {
        return item.id === active.id ? active : item;
      });

      writeContext(active, plan);
      writeBranchSeeds(active);
    }

    return save(plan);
  }


  function removeWorkload(id) {
    var plan = load();
    var removed = null;

    plan.workloads = (plan.workloads || []).filter(function (item) {
      if (item.id === id) {
        removed = item;
        return false;
      }
      return true;
    });

    if (plan.activeWorkloadId === id) {
      plan.activeWorkloadId = plan.workloads[0] ? plan.workloads[0].id : null;
    }

    plan = save(plan);

    var active = activeWorkload(plan);
    if (active) {
      writeContext(active, plan);
      writeBranchSeeds(active);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
      sessionStorage.removeItem(ACTIVE_KEY);
      localStorage.removeItem(CONTEXT_KEY);
      sessionStorage.removeItem(CONTEXT_KEY);
    }

    emitPlanChange("remove", plan, active);
    return { plan: plan, workload: active, removed: removed };
  }

  function reset() {
    localStorage.removeItem(PLAN_KEY);
    sessionStorage.removeItem(PLAN_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    sessionStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(CONTEXT_KEY);
    sessionStorage.removeItem(CONTEXT_KEY);
    var next = defaultPlan();
    emitPlanChange("reset", next, null);
    return next;
  }


  // compute-workload-display-renderer-0614b
  function workloadDisplayEscapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function workloadDisplayTitleCase(value) {
    return String(value || "N/A")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      }) || "N/A";
  }


  function workloadDisplayTitle(workload) {
    var explicitName = String(workload && workload.name || "").trim();
    var normalized = explicitName.toLowerCase();

    if (
      explicitName &&
      normalized !== "compute workload" &&
      normalized !== "active compute workload" &&
      normalized !== "new compute workload"
    ) {
      return explicitName;
    }

    var environment = workloadDisplayTitleCase(workload && workload.environmentType);
    var workloadType = workloadDisplayTitleCase(workload && workload.workloadType);
    var path = workloadDisplayTitleCase(workload && workload.planningPath);

    function useful(value) {
      return value && value !== "N/A" && value !== "Unknown";
    }

    if (useful(environment) && useful(path)) return environment + " " + path;
    if (useful(path)) return path + " Workload";
    if (useful(environment) && useful(workloadType)) return environment + " " + workloadType + " Workload";
    if (useful(workloadType)) return workloadType + " Workload";

    return explicitName || "Compute Workload";
  }

  function ensureWorkloadDisplayStyles() {
    if (typeof document === "undefined" || document.getElementById("compute-workload-display-styles")) return;

    const style = document.createElement("style");
    style.id = "compute-workload-display-styles";
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

  function buildWorkloadDisplayContext(toolLabel) {
    toolLabel = toolLabel || "Compute Tool";

    var plan = load();
    var workload = activeWorkload(plan);

    if (!workload) {
      return {
        hasActiveWorkload: false,
        title: "No active Compute workload selected",
        lineTarget: toolLabel,
        description: "Open or create a Compute workload before using this tool so the result can be tied to the right workload plan.",
        rows: [
          ["Workload Source", "No Workload Planner context detected"],
          ["Result Save", "Tool result will not be tied to a workload yet."]
        ],
        reportRows: [
          { label: "Active Workload", value: "No active Compute workload selected" },
          { label: "Workload Source", value: "No Workload Planner context detected" }
        ],
        raw: null
      };
    }

    var branches = [];
    var branchMap = workload.branches || {};

    if (branchMap.vmDensity) branches.push("VM Density");
    if (branchMap.storageHeavy) branches.push("Storage");
    if (branchMap.gpu) branches.push("GPU");
    if (branchMap.powerThermal) branches.push("Power / Thermal");
    if (branchMap.raid) branches.push("RAID");
    if (branchMap.backup) branches.push("Backup");
    if (branchMap.nicBonding) branches.push("NIC Bonding");

    var environment = workloadDisplayTitleCase(workload.environmentType);
    var workloadType = workloadDisplayTitleCase(workload.workloadType);
    var demand = workloadDisplayTitleCase(workload.demandPattern || workload.demandProfile);
    var status = workloadDisplayTitleCase(workload.status || workload.summaryStatus || "Planning");
    var path = workloadDisplayTitleCase(workload.planningPath);
    var targetUtilization = workload.targetUtilization ? String(workload.targetUtilization) + "%" : "N/A";
    var growthMargin = workload.growthMargin ? String(workload.growthMargin) + "%" : "N/A";
    var branchText = branches.length ? branches.join(", ") : "None";

    return {
      hasActiveWorkload: true,
      title: workloadDisplayTitle(workload),
      lineTarget: toolLabel,
      description: environment + " | " + workloadType + " | " + path,
      rows: [
        ["Environment", environment],
        ["Workload Type", workloadType],
        ["Demand", demand],
        ["Status", status],
        ["Path", path],
        ["Target Utilization", targetUtilization],
        ["Growth Margin", growthMargin],
        ["Branches", branchText]
      ],
      reportRows: [
        { label: "Active Workload", value: workloadDisplayTitle(workload) },
        { label: "Environment", value: environment },
        { label: "Workload Type", value: workloadType },
        { label: "Demand", value: demand },
        { label: "Status", value: status },
        { label: "Path", value: path },
        { label: "Target Utilization", value: targetUtilization },
        { label: "Growth Margin", value: growthMargin },
        { label: "Branches", value: branchText }
      ],
      raw: workload
    };
  }

  function renderWorkloadDisplay(config) {
    config = config || {};
    if (typeof document === "undefined") return null;

    ensureWorkloadDisplayStyles();

    var card = typeof config.card === "string" ? document.getElementById(config.card) : config.card;
    var titleEl = typeof config.title === "string" ? document.getElementById(config.title) : config.title;
    var descriptionEl = typeof config.description === "string" ? document.getElementById(config.description) : config.description;
    var metaEl = typeof config.meta === "string" ? document.getElementById(config.meta) : config.meta;
    var toolLabel = config.toolLabel || "Compute Tool";

    var context = buildWorkloadDisplayContext(toolLabel);

    if (card) {
      card.hidden = false;
      card.dataset.workloadStatus = context.hasActiveWorkload ? "active" : "missing";
    }

    if (titleEl) titleEl.textContent = context.title;
    if (descriptionEl) descriptionEl.textContent = context.description;

    if (metaEl) {
      metaEl.innerHTML = context.rows.map(function (row) {
        return "<div><strong>" + workloadDisplayEscapeHtml(row[0]) + "</strong><span>" + workloadDisplayEscapeHtml(row[1]) + "</span></div>";
      }).join("");
    }

    return context;
  }



  function workloadPlannerNavMeta(workload) {
    if (!workload) return "Create or select the compute workload being planned.";

    var parts = [
      workloadDisplayTitleCase(workload.environmentType),
      workloadDisplayTitleCase(workload.workloadType),
      workloadDisplayTitleCase(workload.planningPath)
    ].filter(function (value) {
      return value && value !== "N/A" && value !== "Unknown";
    });

    return parts.join(" | ") || "Active Compute workload";
  }


  function renderWorkloadPlannerNav(config) {
    config = config || {};
    if (typeof document === "undefined") return null;

    var mount = typeof config.mount === "string" ? document.getElementById(config.mount) : config.mount;
    if (!mount) return null;

    ensureWorkloadDisplayStyles();

    var plannerHref = config.href || config.plannerHref || "/tools/compute/workload-planner/";
    var title = config.title || "Compute Workload Planner";
    var plan = load();
    var workloads = plan.workloads || [];
    var active = activeWorkload(plan);

    mount.classList.add("sl-compute-workload-planner-nav");
    mount.setAttribute("data-compute-workload-planner-nav-rendered", "true");

    var rows = [];

    rows.push('<div class="sl-pipeline-group-label" style="font-size:.74rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(125,255,158,.86);margin-bottom:6px;">' + workloadDisplayEscapeHtml(title) + '</div>');
    rows.push('<nav class="sl-pipeline-row sl-compute-workload-planner-row" aria-label="Compute workload planner saved workloads">');

    if (!workloads.length) {
      rows.push('<a class="sl-pipeline-step is-current is-category-endpoint" href="' + workloadDisplayEscapeHtml(plannerHref) + '" data-category-endpoint="planner" data-step="workload-planner"><span class="sl-pipeline-dot" aria-hidden="true"></span><span class="sl-pipeline-label">Open Workload Planner</span></a>');
    } else {
      workloads.forEach(function (workload) {
        var isActive = active && workload.id === active.id;
        var label = workloadDisplayTitle(workload);
        var meta = workloadPlannerNavMeta(workload);
        rows.push('<a class="sl-pipeline-step sl-compute-workload-nav-step' + (isActive ? ' is-current' : ' is-future') + '" href="' + workloadDisplayEscapeHtml(plannerHref) + '" data-compute-workload-nav-item="true" data-workload-id="' + workloadDisplayEscapeHtml(workload.id) + '"><span class="sl-pipeline-dot" aria-hidden="true"></span><span class="sl-pipeline-label"><strong>' + workloadDisplayEscapeHtml(label) + '</strong><small style="display:block;font-size:.68rem;color:rgba(226,232,240,.62);font-weight:700;line-height:1.25;margin-top:2px;">' + workloadDisplayEscapeHtml(meta) + '</small></span></a>');
      });
    }

    rows.push("</nav>");
    mount.innerHTML = rows.join("");

    Array.from(mount.querySelectorAll("[data-compute-workload-nav-item]")).forEach(function (link) {
      link.addEventListener("click", function () {
        var id = link.getAttribute("data-workload-id");
        if (id) setActiveWorkload(id);
      });
    });

    return { plan: plan, activeWorkload: active, workloads: workloads };
  }

  function bindWorkloadPlannerNav(config) {
    config = config || {};
    var mount = typeof config.mount === "string" ? document.getElementById(config.mount) : config.mount;
    if (!mount) return null;

    renderWorkloadPlannerNav(Object.assign({}, config, { mount: mount }));

    if (mount.__slComputeWorkloadPlannerNavBound) return mount;
    mount.__slComputeWorkloadPlannerNavBound = true;

    var rerender = function () {
      renderWorkloadPlannerNav(Object.assign({}, config, { mount: mount }));
    };

    onPlanChange(rerender);

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("storage", function (event) {
        if (!event || event.key === PLAN_KEY || event.key === ACTIVE_KEY || event.key === CONTEXT_KEY) {
          rerender();
        }
      });
    }

    return mount;
  }

  function bindAllWorkloadPlannerNavs() {
    if (typeof document === "undefined") return [];
    return Array.from(document.querySelectorAll("[data-compute-workload-planner-nav]")).map(function (mount) {
      return bindWorkloadPlannerNav({
        mount: mount,
        title: mount.getAttribute("data-compute-workload-planner-title") || "Compute Workload Planner",
        href: mount.getAttribute("data-compute-workload-planner-href") || "/tools/compute/workload-planner/"
      });
    });
  }

  window.ScopedLabsComputePlanState = Object.freeze({
    version: "scopedlabs-compute-plan-state-008-downstream-invalidation",
    contract: CONTRACT,
    keys: Object.freeze({
      plan: PLAN_KEY,
      active: ACTIVE_KEY,
      context: CONTEXT_KEY
    }),
    load: load,
    save: save,
    activeWorkload: activeWorkload,
    upsertWorkload: upsertWorkload,
    setActiveWorkload: setActiveWorkload,
    writeContext: writeContext,
    writeBranchSeeds: writeBranchSeeds,
    recordToolResult: recordToolResult,
    invalidateToolAndDownstream: invalidateToolAndDownstream,
    startGuidedFlow: startGuidedFlow,
    getGuidedFlowContext: getGuidedFlowContext,
    isGuidedFlowActive: isGuidedFlowActive,
    clearGuidedFlow: clearGuidedFlow,
    ensureWorkloadDisplayStyles: ensureWorkloadDisplayStyles,
    buildWorkloadDisplayContext: buildWorkloadDisplayContext,
    renderWorkloadDisplay: renderWorkloadDisplay,
    onPlanChange: onPlanChange,
    removeWorkload: removeWorkload,
    renderWorkloadPlannerNav: renderWorkloadPlannerNav,
    bindWorkloadPlannerNav: bindWorkloadPlannerNav,
    bindAllWorkloadPlannerNavs: bindAllWorkloadPlannerNavs,
    reset: reset
  });

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        window.ScopedLabsComputePlanState.bindAllWorkloadPlannerNavs();
      }, { once: true });
    } else {
      setTimeout(function () {
        window.ScopedLabsComputePlanState.bindAllWorkloadPlannerNavs();
      }, 0);
    }
  }

})();