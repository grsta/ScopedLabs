(function () {
  "use strict";

  var VERSION = "scopedlabs-compute-guided-action-strip-002-placement-polish";
  var CATEGORY = "compute";
  var GUIDED_KEY = "scopedlabs:pipeline:compute:guided-flow";

  var TOOL_LABELS = {
    "workload-planner": "Workload Planner",
    "cpu-sizing": "CPU Sizing",
    "ram-sizing": "RAM Sizing",
    "storage-iops": "Storage IOPS",
    "storage-throughput": "Storage Throughput",
    "vm-density": "VM Density",
    "gpu-vram": "GPU VRAM",
    "power-thermal": "Power and Thermal",
    "nic-bonding": "NIC Bonding",
    "raid-rebuild-time": "RAID Rebuild",
    "backup-window": "Backup Window",
    "summary": "Compute Summary"
  };

  var TOOL_HREFS = {
    "workload-planner": "/tools/compute/workload-planner/",
    "cpu-sizing": "/tools/compute/cpu-sizing/",
    "ram-sizing": "/tools/compute/ram-sizing/",
    "storage-iops": "/tools/compute/storage-iops/",
    "storage-throughput": "/tools/compute/storage-throughput/",
    "vm-density": "/tools/compute/vm-density/",
    "gpu-vram": "/tools/compute/gpu-vram/",
    "power-thermal": "/tools/compute/power-thermal/",
    "nic-bonding": "/tools/compute/nic-bonding/",
    "raid-rebuild-time": "/tools/compute/raid-rebuild-time/",
    "backup-window": "/tools/compute/backup-window/",
    "summary": "/tools/compute/summary/"
  };

  var OPTIONAL_TOOLS = [
    "storage-iops",
    "storage-throughput",
    "vm-density",
    "gpu-vram",
    "power-thermal",
    "nic-bonding",
    "raid-rebuild-time",
    "backup-window"
  ];

  function isComputePage() {
    return !!(document.body && document.body.dataset && document.body.dataset.category === CATEGORY);
  }

  function currentTool() {
    return String(document.body && document.body.dataset && document.body.dataset.step || "").trim();
  }

  function safeJson(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (error) { return null; }
  }

  function readStorageJson(key) {
    var value = null;
    try { value = window.sessionStorage && window.sessionStorage.getItem(key); } catch (error) { value = null; }
    if (!value) {
      try { value = window.localStorage && window.localStorage.getItem(key); } catch (error) { value = null; }
    }
    return safeJson(value);
  }

  function readGuidedContext() {
    var State = window.ScopedLabsComputePlanState || {};
    var context = null;

    try {
      if (typeof State.getGuidedFlowContext === "function") context = State.getGuidedFlowContext();
    } catch (error) {
      context = null;
    }

    if (!context) context = readStorageJson(GUIDED_KEY);

    if (!context || context.guidedFlow !== true || context.routeMode !== "compute-guided") return null;
    return context;
  }

  function readPlan() {
    var State = window.ScopedLabsComputePlanState || {};
    var methods = ["getPlanSnapshot", "getPlan", "readPlan", "loadPlan", "load", "getState"];

    for (var i = 0; i < methods.length; i += 1) {
      var name = methods[i];
      try {
        if (typeof State[name] === "function") {
          var plan = State[name]();
          if (plan) return plan;
        }
      } catch (error) {
        /* keep trying */
      }
    }

    var keys = [
      "scopedlabs:compute:workload-plan",
      "scopedlabs:pipeline:compute:workload-plan",
      "scopedlabs:pipeline:compute:plan",
      "scopedlabs:compute:plan",
      "scopedlabs:compute:workload-planner",
      "scopedlabs:pipeline:compute:workload-planner"
    ];

    for (var j = 0; j < keys.length; j += 1) {
      var parsed = readStorageJson(keys[j]);
      if (parsed) return parsed;
    }

    return null;
  }

  function findWorkload(plan, context) {
    var workloadId = context && (context.workloadId || context.activeWorkloadId);
    if (context && context.workload && (!workloadId || context.workload.id === workloadId || context.workload.workloadId === workloadId)) return context.workload;
    if (!plan || !workloadId) return null;

    var lists = [plan.workloads, plan.items, plan.records, plan.savedWorkloads];
    for (var i = 0; i < lists.length; i += 1) {
      var list = Array.isArray(lists[i]) ? lists[i] : [];
      for (var j = 0; j < list.length; j += 1) {
        var item = list[j];
        if (item && (item.id === workloadId || item.workloadId === workloadId)) return item;
      }
    }

    if (plan.activeWorkload && (plan.activeWorkload.id === workloadId || plan.activeWorkload.workloadId === workloadId)) return plan.activeWorkload;
    return null;
  }

  function resolveDecision() {
    var RouteEngine = window.ScopedLabsComputeGuidedRouteEngine;
    if (!RouteEngine || typeof RouteEngine.resolve !== "function") return null;

    var context = readGuidedContext();
    if (!context) return null;

    var plan = readPlan();
    var workload = findWorkload(plan, context);

    try {
      return RouteEngine.resolve({
        category: CATEGORY,
        currentTool: currentTool(),
        guidedFlow: true,
        routeMode: "compute-guided",
        context: context,
        guidedContext: context,
        plan: plan,
        workload: workload
      });
    } catch (error) {
      return null;
    }
  }

  function toolLabel(tool) {
    return TOOL_LABELS[tool] || String(tool || "Next Step");
  }

  function toolHref(tool) {
    return TOOL_HREFS[tool] || "/tools/compute/summary/";
  }

  function create(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function unique(list) {
    var seen = {};
    return (Array.isArray(list) ? list : []).filter(function (item) {
      if (!item || seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }

  function applicableTools(decision) {
    var list = unique(decision && decision.applicableTools || []);
    return list.length ? list : [];
  }

  function completedTools(decision) {
    return unique(decision && decision.completedTools || []);
  }

  function pathTools(decision) {
    var list = applicableTools(decision);
    if (!list.length) list = ["cpu-sizing", "ram-sizing"];
    if (list.indexOf("summary") === -1) list = list.concat(["summary"]);
    return unique(list);
  }

  function suppressLegacyGuidedControls() {
    if (!readGuidedContext()) return;
    ensureStyles();

    Array.from(document.querySelectorAll(".compute-flow-actions, #continue-wrap")).forEach(function (node) {
      if (!node || (node.closest && node.closest("#compute-guided-action-strip"))) return;
      node.setAttribute("data-compute-guided-action-strip-hidden", "true");
      node.setAttribute("aria-hidden", "true");
      node.style.display = "none";
      node.hidden = true;
    });
  }

  function ensureStyles() {
    if (document.getElementById("scopedlabs-compute-guided-action-strip-styles")) return;

    var style = document.createElement("style");
    style.id = "scopedlabs-compute-guided-action-strip-styles";
    style.textContent = [
      '#compute-guided-action-strip { margin: 18px 0 18px; }',
      '#compute-guided-action-strip .cg-card { border: 1px solid rgba(120,255,120,.18); background: rgba(9,24,18,.68); border-radius: 16px; padding: 16px; box-shadow: 0 18px 45px rgba(0,0,0,.18); }',
      '#compute-guided-action-strip .cg-eyebrow { color: rgba(156,255,180,.76); font-size: .72rem; letter-spacing: .075em; text-transform: uppercase; font-weight: 850; }',
      '#compute-guided-action-strip .cg-title { display: none; }',
      '#compute-guided-action-strip .cg-copy { margin-top: 6px; color: rgba(235,246,239,.72); line-height: 1.45; }',
      '#compute-guided-action-strip .cg-path { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }',
      '#compute-guided-action-strip .cg-step { border: 1px solid rgba(156,255,180,.26); background: rgba(16,80,48,.12); color: rgba(156,255,180,.76); border-radius: 9px; padding: 6px 9px; font-size: .84rem; font-weight: 500; }',
      '#compute-guided-action-strip .cg-step.is-complete { border-color: rgba(156,255,180,.38); color: rgba(156,255,180,.86); background: rgba(26,120,72,.15); }',
      '#compute-guided-action-strip .cg-step.is-current { border-color: rgba(156,255,180,.58); color: rgba(218,255,228,.96); background: rgba(36,160,92,.22); box-shadow: 0 0 0 1px rgba(92,255,160,.12); }',
      '#compute-guided-action-strip .cg-step.is-future { opacity: .72; }',
      '#compute-guided-action-strip .cg-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, .45fr); gap: 14px; align-items: start; margin-top: 14px; }',
      '#compute-guided-action-strip .cg-meta { display: grid; gap: 8px; color: rgba(235,246,239,.74); font-size: .9rem; }',
      '#compute-guided-action-strip .cg-meta strong { color: rgba(246,255,248,.95); }',
      '#compute-guided-action-strip .cg-actions { display: grid; justify-content: stretch; align-content: start; gap: 10px; min-width: 190px; }',
      '#compute-guided-action-strip .cg-actions .btn { border-radius: 10px !important; min-height: 42px; width: 100%; display: inline-flex; align-items: center; justify-content: center; text-align: center; }',
      '#compute-guided-action-strip .cg-optional { margin-top: 12px; color: rgba(235,246,239,.56); font-size: .86rem; line-height: 1.45; }',
      'body[data-category="compute"] [data-compute-guided-action-strip-hidden="true"] { display: none !important; visibility: hidden !important; }',
      '@media (max-width: 760px) { #compute-guided-action-strip .cg-grid { grid-template-columns: 1fr; } #compute-guided-action-strip .cg-actions { justify-content: stretch; } #compute-guided-action-strip .cg-actions .btn { width: 100%; text-align: center; } }'
    ].join("\n");

    document.head.appendChild(style);
  }

  function findExportReportSection() {
    var headings = Array.from(document.querySelectorAll("h2, h3, h4"));
    var heading = headings.find(function (node) {
      return /^\s*Export Report\s*$/i.test(String(node.textContent || ""));
    });
    return heading ? heading.closest("section, .card, .compute-export-card, .panel") : null;
  }

  function mountNode() {
    var existing = document.getElementById("compute-guided-action-strip");
    if (existing) return existing;

    var section = document.createElement("section");
    section.id = "compute-guided-action-strip";
    section.setAttribute("data-compute-guided-action-strip", VERSION);

    var exportSection = findExportReportSection();
    if (exportSection && exportSection.parentNode) {
      exportSection.parentNode.insertBefore(section, exportSection);
      section.setAttribute("data-compute-guided-action-strip-placement", "before-export-report");
      return section;
    }

    var results = document.getElementById("results");
    var resultsCard = results && results.closest ? results.closest("section, .card, .panel") : null;
    if (resultsCard && resultsCard.parentNode) {
      resultsCard.parentNode.insertBefore(section, resultsCard.nextSibling);
      section.setAttribute("data-compute-guided-action-strip-placement", "after-results");
      return section;
    }

    var contextCard = document.getElementById("computeWorkloadContextCard");
    if (contextCard && contextCard.parentNode) {
      contextCard.parentNode.insertBefore(section, contextCard.nextSibling);
      section.setAttribute("data-compute-guided-action-strip-placement", "after-workload-context");
      return section;
    }

    var h1 = document.querySelector("main h1, h1");
    if (h1 && h1.parentNode) {
      h1.parentNode.insertBefore(section, h1.nextSibling);
      section.setAttribute("data-compute-guided-action-strip-placement", "after-heading");
      return section;
    }

    return null;
  }

  function render() {
    if (!isComputePage()) return;
    var context = readGuidedContext();
    if (!context) return;

    ensureStyles();

    var decision = resolveDecision();
    var section = mountNode();
    if (!section) return;

    var current = currentTool();
    var completed = completedTools(decision);
    var completedMap = {};
    completed.forEach(function (tool) { completedMap[tool] = true; });

    var tools = pathTools(decision);
    var nextTool = decision && decision.nextTool ? decision.nextTool : current;
    var nextHref = decision && decision.nextHref ? decision.nextHref : toolHref(nextTool);
    var nextLabel = nextTool === "summary" ? "Review Compute Summary" : "Continue to " + toolLabel(nextTool);
    var canContinue = !!(decision && decision.nextHref && decision.nextTool && decision.nextTool !== current);

    section.innerHTML = "";

    var card = create("div", "cg-card");
    card.appendChild(create("div", "cg-eyebrow", "Guided Compute Path"));

    var selected = context.workloadName || (context.workload && context.workload.name) || "Current workload";
    card.appendChild(create("div", "cg-copy", "ScopedLabs will only route the tools that apply to this workload. Other Compute checks stay optional unless you add them from the planner."));

    var grid = create("div", "cg-grid");
    var left = create("div");
    var meta = create("div", "cg-meta");

    var workloadLine = create("div");
    workloadLine.appendChild(create("strong", "", "Workload: "));
    workloadLine.appendChild(document.createTextNode(selected));
    meta.appendChild(workloadLine);

    var currentLine = create("div");
    currentLine.appendChild(create("strong", "", "Current: "));
    currentLine.appendChild(document.createTextNode(toolLabel(current)));
    meta.appendChild(currentLine);

    var nextLine = create("div");
    nextLine.appendChild(create("strong", "", "Next: "));
    nextLine.appendChild(document.createTextNode(canContinue ? toolLabel(nextTool) : "Run this calculation first"));
    meta.appendChild(nextLine);

    left.appendChild(meta);

    var pathRow = create("div", "cg-path");
    tools.forEach(function (tool) {
      var step = create("span", "cg-step", toolLabel(tool));
      if (completedMap[tool]) step.classList.add("is-complete");
      else if (tool === current) step.classList.add("is-current");
      else step.classList.add("is-future");
      step.setAttribute("data-compute-guided-path-step", tool);
      pathRow.appendChild(step);
    });
    left.appendChild(pathRow);

    var optional = OPTIONAL_TOOLS.filter(function (tool) { return tools.indexOf(tool) === -1; }).map(toolLabel).join(", ");
    if (optional) left.appendChild(create("div", "cg-optional", "Other optional checks: " + optional + "."));

    var actions = create("div", "cg-actions");
    var back = create("a", "btn", "Back to Workload Planner");
    back.href = "/tools/compute/workload-planner/";
    actions.appendChild(back);

    var next = create(canContinue ? "a" : "span", "btn btn-primary", canContinue ? nextLabel : "Run calculation to continue");
    if (canContinue) next.href = nextHref;
    else next.setAttribute("aria-disabled", "true");
    next.setAttribute("data-compute-guided-action-strip-next", nextTool || "");
    actions.appendChild(next);

    grid.appendChild(left);
    grid.appendChild(actions);
    card.appendChild(grid);
    section.appendChild(card);
    section.setAttribute("data-compute-guided-action-strip-rendered", "true");

    suppressLegacyGuidedControls();
  }

  function scheduleRefresh() {
    render();
    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      render();
      if (attempts >= 20) window.clearInterval(timer);
    }, 500);

    window.addEventListener("storage", render);
    window.addEventListener("scopedlabs:compute:plan-change", render);
    window.addEventListener("scopedlabs-compute-plan-change", render);
    document.addEventListener("click", function () { window.setTimeout(render, 80); });
  }

  window.ScopedLabsComputeGuidedActionStrip = Object.freeze({
    version: VERSION,
    render: render
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleRefresh, { once: true });
  } else {
    scheduleRefresh();
  }
}());
