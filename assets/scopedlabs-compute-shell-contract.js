(function () {
  "use strict";

  var VERSION = "scopedlabs-compute-shell-contract-017-storage-throughput-promotion";

  function isComputeShellPage() {
    var body = document.body;
    return !!(
      body &&
      body.dataset &&
      body.dataset.category === "compute" &&
      !!body.dataset.computeToolShell
    );
  }

  function injectStyles() {
    if (!isComputeShellPage()) return;
    if (document.getElementById("scopedlabs-compute-shell-contract-styles")) return;

    var style = document.createElement("style");
    style.id = "scopedlabs-compute-shell-contract-styles";
    style.textContent = [
      'body[data-category="compute"][data-compute-tool-shell] .btn,',
      'body[data-category="compute"][data-compute-tool-shell] button.btn,',
      'body[data-category="compute"][data-compute-tool-shell] a.btn,',
      'body[data-category="compute"][data-compute-tool-shell] .sl-help-toggle,',
      'body[data-category="compute"][data-compute-tool-shell] .sl-help-link,',
      'body[data-category="compute"][data-compute-tool-shell] .sl-help-related-close,',
      'body[data-category="compute"][data-compute-tool-shell] .sl-report-meta,',
      'body[data-category="compute"][data-compute-tool-shell] .sl-report-meta summary,',
      'body[data-category="compute"][data-compute-tool-shell] .scopedlabs-user-tool-notes-inline summary {',
      '  border-radius: 10px !important;',
      '}',
      'body[data-category="compute"][data-compute-tool-shell] #scopedlabs-help .sl-help-eyebrow,',
      'body[data-category="compute"][data-compute-tool-shell] #scopedlabs-help [class*="eyebrow"] {',
      '  display: none !important;',
      '}'
    ].join("\n");

    document.head.appendChild(style);
  }

  function assessmentTitle() {
    var h1 = document.querySelector("h1");
    var label = h1 ? String(h1.textContent || "").trim() : "";
    if (!label) label = "Compute Tool";
    return /assessment$/i.test(label) ? label : label + " Assessment";
  }

  function cleanKnowledgeBaseCard() {
    if (!isComputeShellPage()) return;

    var card = document.getElementById("scopedlabs-help");
    if (!card) return;

    card.classList.add("sl-help-card-clean");

    Array.from(card.querySelectorAll(".pill, .pill-row, .sl-help-eyebrow, [class*='eyebrow']")).forEach(function (node) {
      var text = String(node.textContent || "").trim().toLowerCase();
      var className = String(node.className || "").toLowerCase();

      if (text === "knowledge base" || className.indexOf("eyebrow") !== -1) {
        node.style.display = "none";
        node.setAttribute("aria-hidden", "true");
      }
    });

    Array.from(card.querySelectorAll(".sl-help-toggle, .sl-help-link, .sl-help-related-close")).forEach(function (node) {
      node.style.borderRadius = "10px";
    });
  }

  function cleanReportMetadata() {
    if (!isComputeShellPage()) return;

    var input = document.getElementById("reportTitle");
    if (!input) return;

    var title = assessmentTitle();
    var placeholder = String(input.getAttribute("placeholder") || "");
    var value = String(input.value || "");
    var accessDefault = /access\s+control\s+scope\s+assessment/i;

    if (!placeholder || accessDefault.test(placeholder)) {
      input.setAttribute("placeholder", title);
    }

    if (accessDefault.test(value)) {
      input.value = title;
    }

    Array.from(document.querySelectorAll(".sl-report-meta, .sl-report-meta summary")).forEach(function (node) {
      node.style.borderRadius = "10px";
    });
  }




  
  function installGeneratedFlowContextCssGuard() {
    if (!isComputeShellPage()) return;

    if (document.getElementById("computeGeneratedFlowContextGuard")) return;

    var style = document.createElement("style");
    style.id = "computeGeneratedFlowContextGuard";
    style.setAttribute("data-compute-flow-context-guard", "true");
    style.textContent = [
      'body[data-category="compute"][data-compute-tool-shell] #flow-note,',
      'body[data-category="compute"][data-compute-tool-shell] .flow-note,',
      'body[data-category="compute"][data-compute-tool-shell] [data-compute-flow-context],',
      'body[data-category="compute"][data-compute-tool-shell] [data-flow-context] {',
      '  display: none !important;',
      '  visibility: hidden !important;',
      '}'
    ].join("\n");

    document.head.appendChild(style);
  }


  function hideGeneratedFlowContext() {
    if (!isComputeShellPage()) return;

    installGeneratedFlowContextCssGuard();

    var candidates = [];

    var direct = document.getElementById("flow-note");
    if (direct) candidates.push(direct);

    Array.from(document.querySelectorAll(".flow-note, [data-compute-flow-context], [data-flow-context]")).forEach(function (node) {
      if (candidates.indexOf(node) === -1) candidates.push(node);
    });

    Array.from(document.querySelectorAll("section, div, p")).forEach(function (node) {
      if (candidates.indexOf(node) !== -1) return;

      var text = String(node.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) return;

      var className = String(node.className || "").toLowerCase();
      var id = String(node.id || "").toLowerCase();

      var looksLikeGeneratedFlowContext =
        /^flow context\b/i.test(text) ||
        (
          text.indexOf("Recommended RAM:") !== -1 &&
          text.indexOf("Memory Status:") !== -1 &&
          text.length < 1000
        ) ||
        (
          text.indexOf("This step checks whether storage performance becomes the next practical bottleneck") !== -1 &&
          text.length < 1000
        ) ||
        (
          (className.indexOf("flow") !== -1 || id.indexOf("flow") !== -1) &&
          text.indexOf("Primary Constraint:") !== -1 &&
          text.length < 1000
        );

      if (looksLikeGeneratedFlowContext) {
        candidates.push(node);
      }
    });

    candidates.forEach(function (node) {
      node.hidden = true;
      node.setAttribute("hidden", "");
      node.setAttribute("aria-hidden", "true");
      node.setAttribute("data-compute-flow-context-hidden", "compute-shell-contract");
      node.style.setProperty("display", "none", "important");
      node.style.setProperty("visibility", "hidden", "important");
    });
  }

  function watchGeneratedFlowContext() {
    if (!isComputeShellPage()) return;
    if (window.__scopedlabsComputeFlowContextObserverInstalled) return;

    window.__scopedlabsComputeFlowContextObserverInstalled = true;

    hideGeneratedFlowContext();

    var observer = new MutationObserver(function () {
      hideGeneratedFlowContext();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["hidden", "style", "class"]
    });

    window.__scopedlabsComputeFlowContextObserver = observer;
  }

function computeWorkloadToolLabelFromPage() {
    var body = document.body;
    var step = body && body.dataset ? String(body.dataset.step || "") : "";
    var map = {
      "cpu-sizing": "CPU Sizing",
      "ram-sizing": "RAM Sizing",
      "storage-iops": "Storage IOPS",
      "storage-throughput": "Storage Throughput",
      "vm-density": "VM Density",
      "gpu-vram": "GPU VRAM",
      "power-thermal": "Power / Thermal",
      "raid-rebuild-time": "RAID Rebuild",
      "backup-window": "Backup Window"
    };

    if (map[step]) return map[step];

    var line = document.querySelector("#computeWorkloadContextCard .access-scope-context-line span:last-child");
    var text = line && line.textContent ? String(line.textContent).trim() : "";
    return text || "Compute Tool";
  }

  function renderSharedComputeWorkloadContextCard() {
    var State = window.ScopedLabsComputePlanState;
    if (!State || typeof State.renderWorkloadDisplay !== "function") return false;

    var card = document.getElementById("computeWorkloadContextCard");
    if (!card) return false;

    var title = document.getElementById("computeWorkloadContextTitle");
    var copy = document.getElementById("computeWorkloadContextCopy");
    var meta = document.getElementById("computeWorkloadContextMeta");

    State.renderWorkloadDisplay({
      card: card,
      title: title,
      description: copy,
      meta: meta,
      toolLabel: computeWorkloadToolLabelFromPage()
    });

    card.setAttribute("data-compute-workload-display-owner", "compute-shell-contract");
    return true;
  }

  function initSharedComputeWorkloadContextCard() {
    function run() {
      renderSharedComputeWorkloadContextCard();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      run();
    }
  }

  function computeFlowActionConfig() {
    var path = String(window.location && window.location.pathname || "").replace(/\/+$/, "/");

    if (path.indexOf("/tools/compute/cpu-sizing/") !== -1) {
      return {
        tool: "cpu-sizing",
        backHref: "/tools/compute/workload-planner/",
        backLabel: "Back to Workload Planner",
        continueHref: "/tools/compute/ram-sizing/",
        continueLabel: "Continue &rarr; RAM Sizing",
        continueElement: "a",
        disabled: false
      };
    }
      if (path.indexOf("/tools/compute/storage-iops/") !== -1) {
        return {
          tool: "storage-iops",
          backHref: "/tools/compute/ram-sizing/",
          backLabel: "Back to RAM Sizing",
          continueHref: "/tools/compute/storage-throughput/",
          continueLabel: "Continue &rarr; Storage Throughput",
          continueElement: "button",
          disabled: true
        };
      }





    if (path.indexOf("/tools/compute/storage-throughput/") !== -1) {
      return {
        tool: "storage-throughput",
        backHref: "/tools/compute/storage-iops/",
        backLabel: "Back to Storage IOPS",
        continueHref: "/tools/compute/vm-density/",
        continueLabel: "Continue &rarr; VM Density",
        continueElement: "button",
        disabled: true
      };
    }
    if (path.indexOf("/tools/compute/gpu-vram/") !== -1) {
      return {
        tool: "gpu-vram",
        backHref: "/tools/compute/ram-sizing/",
        backLabel: "Back to RAM Sizing",
        continueHref: "/tools/compute/summary/",
        continueLabel: "Review Compute Summary",
        continueElement: "a",
        disabled: false
      };
    }

    if (path.indexOf("/tools/compute/ram-sizing/") !== -1) {
      return {
        tool: "ram-sizing",
        backHref: "/tools/compute/cpu-sizing/",
        backLabel: "Back to CPU Sizing",
        continueHref: "/tools/compute/storage-iops/",
        continueLabel: "Continue &rarr; Storage IOPS",
        continueElement: "button",
        disabled: true
      };
    }

    return null;
  }

  function removeExistingFlowActionRows() {
    Array.from(document.querySelectorAll(".compute-flow-actions")).forEach(function (row) {
      if (row.getAttribute("data-compute-flow-owner") === "compute-shell-contract") return;
      if (row.parentNode) row.parentNode.removeChild(row);
    });
  }

  function findExportReportSection() {
    var headings = Array.from(document.querySelectorAll("h2, h3, h4"));
    var exportHeading = headings.find(function (node) {
      return /^\s*Export Report\s*$/i.test(String(node.textContent || ""));
    });

    if (!exportHeading) return null;

    var section = exportHeading.closest("section, .card");
    return section || exportHeading.parentElement;
  }

  function buildFlowActionRow(config) {
    var row = document.createElement("div");
    row.className = "compute-flow-actions";
    row.setAttribute("data-compute-flow-actions", "true");
    row.setAttribute("data-compute-flow-owner", "compute-shell-contract");
    row.setAttribute("data-compute-flow-tool", config.tool);

    var back = document.createElement("a");
    back.className = "btn";
    back.href = config.backHref;
    back.textContent = config.backLabel;
    row.appendChild(back);

    var wrap = document.createElement("span");
    wrap.id = "continue-wrap";
    wrap.style.display = "none";
    wrap.style.marginLeft = "auto";

    var next;
    if (config.continueElement === "a") {
      next = document.createElement("a");
      next.href = config.continueHref;
    } else {
      next = document.createElement("button");
      next.type = "button";
      next.disabled = !!config.disabled;
      next.setAttribute("data-compute-continue-href", config.continueHref);
    }

    next.id = "continue";
    next.className = "btn btn-primary";
    next.innerHTML = config.continueLabel;
    wrap.appendChild(next);
    row.appendChild(wrap);

    return row;
  }

  function ensureFlowActionsPlacement() {
    if (!isComputeShellPage()) return;

    var config = computeFlowActionConfig();
    if (!config) return;

    var existing = document.querySelector('.compute-flow-actions[data-compute-flow-owner="compute-shell-contract"][data-compute-flow-tool="' + config.tool + '"]');
    if (existing && existing.getAttribute("data-compute-flow-placed") === "true") {
      hideGeneratedFlowContext();
      normalizeFlowActions();
      return;
    }

    var exportSection = findExportReportSection();
    if (!exportSection || !exportSection.parentNode) return;

    removeExistingFlowActionRows();

    var row = buildFlowActionRow(config);
    row.setAttribute("data-compute-flow-placed", "true");

    exportSection.parentNode.insertBefore(row, exportSection.nextSibling);
    normalizeFlowActions();
  }

  function normalizeContinueLabel(label) {
    var text = String(label || "").replace(/\s+/g, " ").trim();

    if (/storage\s+iops/i.test(text)) return "Continue &rarr; Storage IOPS";
    if (/storage\s+throughput/i.test(text)) return "Continue &rarr; Storage Throughput";
    if (/vm\s+density/i.test(text)) return "Continue &rarr; VM Density";
    if (/ram\s+sizing/i.test(text)) return "Continue &rarr; RAM Sizing";

    return text ? text.replace(/\s+\?\s+/g, " &rarr; ") : "Continue &rarr; Next Step";
  }

  function setAttributeIfNeeded(node, name, value) {
    if (!node || node.getAttribute(name) === value) return;
    node.setAttribute(name, value);
  }

  function setStyleIfNeeded(node, name, value) {
    if (!node || node.style[name] === value) return;
    node.style[name] = value;
  }

  function normalizeFlowActions() {
    if (!isComputeShellPage()) return;

    Array.from(document.querySelectorAll(".compute-flow-actions")).forEach(function (row) {
      setAttributeIfNeeded(row, "data-compute-flow-actions", "true");

      Array.from(row.querySelectorAll(".btn")).forEach(function (node) {
        setStyleIfNeeded(node, "borderRadius", "10px");
      });

      Array.from(row.querySelectorAll("#continue, [data-compute-continue]")).forEach(function (node) {
        var raw = String(node.textContent || node.innerHTML || "").replace(/\s+/g, " ").trim();
        if (!/^continue/i.test(raw)) return;

        var next = normalizeContinueLabel(raw);
        if (node.innerHTML !== next) {
          node.innerHTML = next;
        }
      });
    });
  }

  function run() {
    if (!isComputeShellPage()) return;
    injectStyles();
    cleanKnowledgeBaseCard();
    cleanReportMetadata();
    normalizeFlowActions();
  }

  function observe() {
    if (!isComputeShellPage()) return;

    run();

    var scheduled = false;
    var observer = new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;

      window.setTimeout(function () {
        scheduled = false;
        run();
      }, 80);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    window.setTimeout(run, 80);
    window.setTimeout(run, 250);
    window.setTimeout(run, 800);
  }

  window.ScopedLabsComputeShellContract = Object.freeze({
    version: VERSION,
    run: run,
    normalizeFlowActions: normalizeFlowActions,
    hideGeneratedFlowContext: hideGeneratedFlowContext,
    installGeneratedFlowContextCssGuard: installGeneratedFlowContextCssGuard,
    watchGeneratedFlowContext: watchGeneratedFlowContext,
    ensureFlowActionsPlacement: ensureFlowActionsPlacement
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observe);
  } else {
    observe();
  }
  initSharedComputeWorkloadContextCard();


  function readComputeGuidedContinueContext() {
    var State = window.ScopedLabsComputePlanState || {};
    var context = null;

    try {
      if (typeof State.getGuidedFlowContext === "function") {
        context = State.getGuidedFlowContext();
      }
    } catch (error) {
      context = null;
    }

    if (!context) {
      try {
        context = JSON.parse(window.localStorage.getItem("scopedlabs:pipeline:compute:guided-flow") || "null");
      } catch (error) {
        context = null;
      }
    }

    if (!context || context.guidedFlow !== true || context.routeMode !== "compute-guided") {
      return null;
    }

    return context;
  }

  function readComputeGuidedContinuePlan() {
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
        /* ignore optional state readers */
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
      try {
        var parsed = JSON.parse(window.localStorage.getItem(keys[j]) || "null");
        if (parsed) return parsed;
      } catch (error) {
        /* ignore optional storage snapshots */
      }
    }

    return null;
  }

  function findComputeGuidedContinueWorkload(plan, context) {
    var State = window.ScopedLabsComputePlanState || {};
    var workloadId = context && (context.workloadId || context.id);

    if (context && context.workload && typeof context.workload === "object") {
      return context.workload;
    }

    try {
      if (workloadId && typeof State.getWorkload === "function") {
        var direct = State.getWorkload(workloadId);
        if (direct) return direct;
      }
    } catch (error) {
      /* ignore optional workload reader */
    }

    try {
      if (workloadId && typeof State.getWorkloadById === "function") {
        var byId = State.getWorkloadById(workloadId);
        if (byId) return byId;
      }
    } catch (error) {
      /* ignore optional workload reader */
    }

    if (context && context.workload && (context.workload.id === workloadId || context.workload.workloadId === workloadId)) {
      return context.workload;
    }

    if (!plan || !workloadId) return null;

    var arrays = [plan.workloads, plan.items, plan.records, plan.savedWorkloads];
    for (var i = 0; i < arrays.length; i += 1) {
      var list = arrays[i];
      if (!Array.isArray(list)) continue;
      for (var j = 0; j < list.length; j += 1) {
        var item = list[j];
        if (item && (item.id === workloadId || item.workloadId === workloadId)) {
          return item;
        }
      }
    }

    var maps = [plan.workloadMap, plan.workloadsById, plan.byId];
    for (var k = 0; k < maps.length; k += 1) {
      var map = maps[k];
      if (map && map[workloadId]) return map[workloadId];
    }

    if (plan.activeWorkload && (plan.activeWorkload.id === workloadId || plan.activeWorkload.workloadId === workloadId)) {
      return plan.activeWorkload;
    }

    return null;
  }

  function resolveComputeGuidedContinueDecision(tool) {
    var RouteEngine = window.ScopedLabsComputeGuidedRouteEngine;
    if (!RouteEngine || typeof RouteEngine.resolve !== "function") return null;

    var context = readComputeGuidedContinueContext();
    if (!context) return null;

    var plan = readComputeGuidedContinuePlan();
    var workload = findComputeGuidedContinueWorkload(plan, context);

    var decision = null;
    try {
      decision = RouteEngine.resolve({
        category: "compute",
        currentTool: tool,
        guidedFlow: true,
        routeMode: "compute-guided",
        context: context,
        guidedContext: context,
        plan: plan,
        workload: workload
      });
    } catch (error) {
      decision = null;
    }

    if (!decision || decision.mode !== "guided" || !decision.nextHref) return null;
    if (decision.nextTool === tool) return null;

    return decision;
  }

  function computeGuidedContinueToolLabel(tool, fallback) {
    var labels = {
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

    var label = labels[tool] || fallback || "Next Step";
    label = String(label || "").replace(String.fromCharCode(8594), "->");
    label = label.replace(/^\s*(Start|Resume)\s+Guided\s+Flow\s*->\s*/i, "");
    label = label.replace(/^\s*Continue\s*(to|->)?\s*/i, "");
    label = label.replace(/\s+/g, " ").trim();
    return label || labels[tool] || "Next Step";
  }

  function normalizeComputeGuidedContinueLabel(decision) {
    if (!decision || !decision.nextTool) return "Continue";
    if (decision.nextTool === "summary") return "Review Compute Summary";
    return "Continue to " + computeGuidedContinueToolLabel(decision.nextTool, decision.nextLabel);
  }

  function applyComputeGuidedContinueDecision(button, decision) {
    if (!button || !decision || !decision.nextHref) return;

        /* compute-storage-iops-next-owner-0705 */
        var storageIopsFlowRow = button.closest ? button.closest("[data-compute-flow-actions]") : null;
        var storageIopsFlowTool = storageIopsFlowRow ? String(storageIopsFlowRow.getAttribute("data-compute-flow-tool") || "") : "";
        var storageIopsTarget = String(button.getAttribute("data-storage-iops-continue-target") || "");

        if (storageIopsFlowTool === "storage-iops" && storageIopsTarget === "storage-throughput") {
          Object.assign(decision, {
            action: "next-tool",
            nextTool: "storage-throughput",
            nextLabel: "Storage Throughput",
            nextHref: button.getAttribute("data-compute-continue-href") || "/tools/compute/storage-throughput/",
            buttonLabel: "Continue &rarr; Storage Throughput"
          });
        }

        /* compute-storage-throughput-next-owner-0705 */
        var flowRow = button.closest ? button.closest("[data-compute-flow-actions]") : null;
        var flowTool = flowRow ? String(flowRow.getAttribute("data-compute-flow-tool") || "") : "";
        var storageThroughputTarget = String(button.getAttribute("data-storage-throughput-continue-target") || "");

        if (flowTool === "storage-throughput" && storageThroughputTarget === "vm-density") {
          Object.assign(decision, {
            action: "next-tool",
            nextTool: "vm-density",
            nextLabel: "VM Density",
            nextHref: button.getAttribute("data-compute-continue-href") || "/tools/compute/vm-density/",
            buttonLabel: "Continue &rarr; VM Density"
          });
        }

    button.setAttribute("data-compute-guided-route-continue", "true");
    button.setAttribute("data-compute-continue-href", decision.nextHref);
    button.setAttribute("data-compute-guided-next-tool", decision.nextTool || "");
    button.setAttribute("data-compute-guided-click-target", decision.nextHref);

    if (button.tagName && button.tagName.toLowerCase() === "a") {
      button.setAttribute("href", decision.nextHref);
    }

    if (button.tagName && button.tagName.toLowerCase() === "button") button.disabled = false;

    button.innerHTML = decision && decision.buttonLabel ? decision.buttonLabel : normalizeComputeGuidedContinueLabel(decision);
  }

  function suppressLegacyComputeContinueControls(ownerRow) {
    var context = readComputeGuidedContinueContext();
    if (!context || !ownerRow) return;

    Array.from(document.querySelectorAll("#continue-wrap, #continue")).forEach(function (node) {
      if (!node) return;
      var inOwnerRow = node.closest && node.closest('.compute-flow-actions[data-compute-flow-owner="compute-shell-contract"]');
      if (inOwnerRow === ownerRow) return;

      node.setAttribute("data-compute-dynamic-continue-suppressed", "true");
      node.setAttribute("aria-hidden", "true");
      node.hidden = true;
      node.style.display = "none";
      node.style.visibility = "hidden";
    });
  }

  function refreshComputeGuidedContinueCta() {
    var row = document.querySelector('.compute-flow-actions[data-compute-flow-owner="compute-shell-contract"][data-compute-flow-tool]') || document.querySelector(".compute-flow-actions[data-compute-flow-tool]");
    if (!row) return;

    var tool = row.getAttribute("data-compute-flow-tool");
    var button = row.querySelector("[data-compute-continue-href], #continue, a.btn-primary, button.btn-primary") || row.querySelector("a.btn, button.btn");
    if (!tool || !button) return;

    var decision = resolveComputeGuidedContinueDecision(tool);
    if (decision) {
      applyComputeGuidedContinueDecision(button, decision);
      suppressLegacyComputeContinueControls(row);
    }
  }
      function initComputeStorageExplicitClickOwner0705() {
        if (window.__ScopedLabsComputeStorageExplicitClickOwner0705) return;
        window.__ScopedLabsComputeStorageExplicitClickOwner0705 = true;

        document.addEventListener("click", function (event) {
          var target = event.target && event.target.closest ? event.target.closest("#continue, [data-compute-continue-href]") : null;
          if (!target || target.disabled) return;

          var row = target.closest ? target.closest(".compute-flow-actions[data-compute-flow-tool]") : null;
          if (!row) return;

          var tool = String(row.getAttribute("data-compute-flow-tool") || "");
          var href = "";

          if (tool === "storage-iops" && target.getAttribute("data-storage-iops-continue-target") === "storage-throughput") {
            href = target.getAttribute("data-compute-continue-href") || "/tools/compute/storage-throughput/";
            target.innerHTML = "Continue &rarr; Storage Throughput";
          }

          if (tool === "storage-throughput" && target.getAttribute("data-storage-throughput-continue-target") === "vm-density") {
            href = target.getAttribute("data-compute-continue-href") || "/tools/compute/vm-density/";
            target.innerHTML = "Continue &rarr; VM Density";
          }

          if (!href) return;

          /* compute-storage-explicit-click-owner-0705 */
          target.setAttribute("data-compute-continue-href", href);
          target.setAttribute("data-compute-guided-route-continue-href", href);
          event.preventDefault();
          event.stopPropagation();
          if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
          window.location.href = href;
        }, true);
      }


  function initComputeGuidedContinueClickGuard() {
    if (window.__ScopedLabsComputeGuidedContinueClickGuard) return;
    window.__ScopedLabsComputeGuidedContinueClickGuard = true;

    document.addEventListener("click", function (event) {
      var target = event.target && event.target.closest ? event.target.closest("#continue, [data-compute-continue-href], [data-compute-guided-click-target]") : null;
      if (!target) return;

      var context = readComputeGuidedContinueContext();
      if (!context) return;

      var row = target.closest ? target.closest(".compute-flow-actions[data-compute-flow-tool]") : null;
      var tool = row ? row.getAttribute("data-compute-flow-tool") : "";
      var decision = tool ? resolveComputeGuidedContinueDecision(tool) : null;

      var href = decision && decision.nextHref ? decision.nextHref : "";
      if (!href) href = target.getAttribute("data-compute-guided-click-target") || target.getAttribute("data-compute-continue-href") || target.getAttribute("href") || "";
      if (!href) return;

      if (decision && decision.nextHref) applyComputeGuidedContinueDecision(target, decision);

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      window.location.assign(href);
    }, true);
  }

  function initComputeGuidedContinueRouting() {
    function runRefreshLoop() {
      refreshComputeGuidedContinueCta();
      var attempts = 0;
      var timer = window.setInterval(function () {
        attempts += 1;
        refreshComputeGuidedContinueCta();
        if (attempts >= 20) window.clearInterval(timer);
      }, 500);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runRefreshLoop, { once: true });
    } else {
      runRefreshLoop();
    }

    document.addEventListener("click", function (event) {
      var target = event.target && event.target.closest ? event.target.closest("#continue, [data-compute-continue-href]") : null;
      if (!target) return;

      var row = target.closest ? target.closest(".compute-flow-actions[data-compute-flow-tool]") : null;
      if (!row) return;

      var tool = row.getAttribute("data-compute-flow-tool");
      var decision = resolveComputeGuidedContinueDecision(tool);
      if (!decision) return;

      applyComputeGuidedContinueDecision(target, decision);
      event.preventDefault();
      window.location.href = decision.nextHref;
    }, true);
  }

  initComputeStorageExplicitClickOwner0705();
      initComputeGuidedContinueRouting();
      initComputeGuidedContinueClickGuard();
})();

// compute-result-card-contract-0704
(function () {
  var namespace = window.ScopedLabsComputeShellContract = window.ScopedLabsComputeShellContract || {};

  if (namespace.__computeResultCardContract0704) return;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeStatus(status) {
    var value = String(status || "WATCH").toUpperCase();
    return value === "HEALTHY" ? "GOOD" : value;
  }

  function statusClass(status) {
    var value = normalizeStatus(status);
    if (value === "RISK" || value === "BLOCKED") return "risk";
    if (value === "WATCH" || value === "REVIEW") return "watch";
    return "good";
  }

  function injectResultCardStyles() {
    if (document.querySelector("style[data-compute-result-card-contract='0704']")) return;

    var style = document.createElement("style");
    style.setAttribute("data-compute-result-card-contract", "0704");
    style.textContent = [
      ".compute-result-card-contract{padding:14px;}",
      ".compute-result-card-contract-panel{padding:16px;border:1px solid rgba(20,185,109,.34);border-radius:12px;background:radial-gradient(circle at 0% 0%,rgba(34,197,94,.08),transparent 34%),rgba(1,18,14,.72);box-shadow:inset 0 0 0 1px rgba(112,255,145,.035);}",
      ".compute-result-card-contract-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px;}",
      ".compute-result-card-contract-title{margin:0;color:rgba(241,255,245,.98);font-size:1.02rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase;}",
      ".compute-result-card-contract-status-text{margin:7px 0 0;max-width:780px;color:rgba(210,237,230,.84);font-size:.92rem;line-height:1.45;}",
      ".compute-result-card-contract-chip{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;min-width:64px;min-height:30px;padding:7px 12px;border-radius:4px;border:1px solid rgba(112,255,145,.28);background:rgba(112,255,145,.08);color:rgba(231,255,236,.96);font-size:.72rem;font-weight:900;letter-spacing:.08em;line-height:1.1;text-transform:uppercase;}",
      ".compute-result-card-contract-chip.watch{border-color:rgba(255,204,102,.42);background:rgba(255,204,102,.10);color:rgba(255,236,188,.98);}",
      ".compute-result-card-contract-chip.risk{border-color:rgba(255,108,108,.45);background:rgba(255,108,108,.11);color:rgba(255,214,214,.98);}",
      ".compute-result-card-contract-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px;}",
      ".compute-result-card-contract-cell{min-height:64px;padding:10px 12px;border:1px solid rgba(20,185,109,.22);border-radius:8px;background:rgba(0,10,8,.58);}",
      ".compute-result-card-contract-label{color:rgba(160,210,255,.76);font-size:.68rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;}",
      ".compute-result-card-contract-value{margin-top:7px;color:rgba(255,255,255,.97);font-size:.94rem;line-height:1.42;font-weight:750;}",
      ".compute-result-card-contract-carry{margin:12px 0 0;padding-left:12px;border-left:3px solid rgba(20,185,109,.78);color:rgba(210,237,230,.88);font-size:.92rem;line-height:1.48;}",
      "@media(max-width:760px){.compute-result-card-contract-head{align-items:stretch;flex-direction:column}.compute-result-card-contract-chip{width:fit-content}.compute-result-card-contract-grid{grid-template-columns:1fr}}"
    ].join("\n");

    document.head.appendChild(style);
  }

  namespace.clearComputeResultCard = function clearComputeResultCard(options) {
    var config = options || {};
    var card = config.card || null;
    var mount = config.mount || null;
    var emptyText = config.emptyText || "Run the calculator to generate the recommendation.";

    if (mount) {
      mount.innerHTML = '<div class="muted">' + escapeHtml(emptyText) + '</div>';
    }

    if (card) {
      card.hidden = true;
      card.setAttribute("hidden", "");
    }
  };

  namespace.renderComputeResultCard = function renderComputeResultCard(options) {
    var config = options || {};
    var card = config.card || null;
    var mount = config.mount || null;

    if (!card || !mount) return;

    injectResultCardStyles();

    var status = normalizeStatus(config.status);
    var chipClass = config.statusClass || statusClass(status);
    var decisionFlags = Array.isArray(config.decisionFlags)
      ? config.decisionFlags.join(" | ")
      : String(config.decisionFlags || "");

    mount.innerHTML = [
      '<div class="compute-result-card-contract-panel">',
        '<div class="compute-result-card-contract-head">',
          '<div>',
            '<p class="compute-result-card-contract-title">' + escapeHtml(config.title || "RESULT") + '</p>',
            '<p class="compute-result-card-contract-status-text">' + escapeHtml(config.statusText || config.statusSentence || "") + '</p>',
          '</div>',
          '<span class="compute-result-card-contract-chip ' + escapeHtml(chipClass) + '">' + escapeHtml(status) + '</span>',
        '</div>',
        '<div class="compute-result-card-contract-grid">',
          '<div class="compute-result-card-contract-cell">',
            '<div class="compute-result-card-contract-label">RECOMMENDATION</div>',
            '<div class="compute-result-card-contract-value">' + escapeHtml(config.recommendation || "Review the current planning inputs.") + '</div>',
          '</div>',
          '<div class="compute-result-card-contract-cell">',
            '<div class="compute-result-card-contract-label">CONFIDENCE</div>',
            '<div class="compute-result-card-contract-value">' + escapeHtml(config.confidence || "MEDIUM") + '</div>',
          '</div>',
          '<div class="compute-result-card-contract-cell">',
            '<div class="compute-result-card-contract-label">DECISION FLAGS</div>',
            '<div class="compute-result-card-contract-value">' + escapeHtml(decisionFlags || "No decision flags generated.") + '</div>',
          '</div>',
          '<div class="compute-result-card-contract-cell">',
            '<div class="compute-result-card-contract-label">PRIMARY RISK</div>',
            '<div class="compute-result-card-contract-value">' + escapeHtml(config.primaryRisk || "No primary risk generated.") + '</div>',
          '</div>',
        '</div>',
        '<p class="compute-result-card-contract-carry">' + escapeHtml(config.carryForward || "Carry this result into the next Compute planning step.") + '</p>',
      '</div>'
    ].join("");

    card.classList.add("compute-result-card-contract");
    card.hidden = false;
    card.removeAttribute("hidden");
  };

  namespace.__computeResultCardContract0704 = true;
})();


// compute-shell-storage-throughput-ui-contract-0706
(function () {
  if (window.__ScopedLabsComputeStorageThroughputUiContract0706) return;
  window.__ScopedLabsComputeStorageThroughputUiContract0706 = true;

  var STYLE_ID = 'scopedlabs-compute-storage-throughput-ui-contract-0706';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      'body[data-step="storage-throughput"] #flow-note { display: none !important; }',
      'body[data-step="storage-throughput"] #computeStorageThroughputResultCard.storage-throughput-result-summary-card { display: none !important; }',
      'body[data-step="storage-throughput"] .storage-throughput-active-workflow-card { margin-top: 16px; }',
      'body[data-step="storage-throughput"] .storage-throughput-active-workflow-card .eyebrow { color: #3fff80; font-weight: 500; letter-spacing: 0.04em; }',
      'body[data-step="storage-throughput"] .storage-throughput-active-workflow-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }',
      'body[data-step="storage-throughput"] .storage-throughput-active-workflow-chip { border: 1px solid rgba(63, 255, 128, 0.14); border-radius: 10px; padding: 10px 12px; background: rgba(1, 18, 12, 0.55); min-height: 48px; }',
      'body[data-step="storage-throughput"] .storage-throughput-active-workflow-chip .mini-label { display: block; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sl-muted, #9fb4ad); margin-bottom: 4px; }',
      'body[data-step="storage-throughput"] .storage-throughput-active-workflow-chip strong { display: block; font-size: 0.86rem; }',
      '@media (max-width: 760px) { body[data-step="storage-throughput"] .storage-throughput-active-workflow-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }'
    ].join('\n');

    document.head.appendChild(style);
  }

  function normalizeCardText(el) {
    return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function findStorageThroughputKbCard() {
    var cards = Array.from(document.querySelectorAll('section.card, div.card'));
    return cards.find(function (card) {
      var text = normalizeCardText(card);
      return text.indexOf('Storage Throughput Guide') >= 0 && text.indexOf('Open KB Guide') >= 0;
    }) || null;
  }

  function hideKbPill(kbCard) {
    if (!kbCard) return;

    Array.from(kbCard.querySelectorAll('*')).forEach(function (node) {
      var text = normalizeCardText(node);
      if (text === 'Knowledge Base' && node.children.length === 0) {
        node.hidden = true;
        node.setAttribute('aria-hidden', 'true');
        node.style.display = 'none';
      }
    });
  }

  function buildStorageThroughputWorkflowCard() {
    var card = document.createElement('section');
    card.className = 'card storage-throughput-active-workflow-card';
    card.setAttribute('data-storage-throughput-active-workflow-card', '0705');
    card.setAttribute('data-compute-shell-owned-active-workflow', '0706');
    card.innerHTML = [
      '<div class="eyebrow">ACTIVE WORKLOAD &rarr; STORAGE THROUGHPUT</div>',
      '<h2 class="h2" style="margin-top: 8px;">Improving the tools</h2>',
      '<p class="muted" style="margin-top: 4px;">Production | General | Standard Server</p>',
      '<div class="storage-throughput-active-workflow-grid" aria-label="Active workload context">',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Environment</span><strong>Production</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Workload Type</span><strong>VM datastore</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Demand Source</span><strong>Storage IOPS</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Next Tool</span><strong>VM Density</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Transport Path</span><strong>10 GbE / shared path</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Media Tier</span><strong>SATA / SAS SSD</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Growth Reserve</span><strong>20%</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Status</span><strong>Pending Calculation</strong></div>',
      '</div>'
    ].join('');
    return card;
  }

  function placeStorageThroughputWorkflowCard() {
    if (!document.body || document.body.getAttribute('data-step') !== 'storage-throughput') return;
    if (document.querySelector('[data-storage-throughput-active-workflow-card="0705"]')) return;

    var kbCard = findStorageThroughputKbCard();
    if (!kbCard) return;

    kbCard.insertAdjacentElement('afterend', buildStorageThroughputWorkflowCard());
  }

  function normalizePlanningInputsTitle() {
    if (!document.body || document.body.getAttribute('data-step') !== 'storage-throughput') return;

    var toolCard = document.getElementById('toolCard');
    if (!toolCard) return;

    Array.from(toolCard.querySelectorAll('h1,h2,h3')).forEach(function (heading) {
      if (normalizeCardText(heading) === 'Inputs') {
        heading.textContent = 'Planning Inputs';
      }
    });
  }

  function applyContract() {
    if (!document.body || document.body.getAttribute('data-step') !== 'storage-throughput') return;
    injectStyle();
    hideKbPill(findStorageThroughputKbCard());
    // storage-throughput-active-workflow-0709b: legacy 0705 renderer disabled; promoted 0706/strict singleton owns the card.
    normalizePlanningInputsTitle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyContract);
  } else {
    applyContract();
  }

  window.addEventListener('load', applyContract);
  window.setTimeout(applyContract, 250);
  window.setTimeout(applyContract, 900);
  window.setTimeout(applyContract, 1800);
})();

// compute-shell-storage-throughput-planner-ui-overlay-0706
(function () {
  if (window.__ScopedLabsComputeStorageThroughputPlannerUiOverlay0706) return;
  window.__ScopedLabsComputeStorageThroughputPlannerUiOverlay0706 = true;

  var STYLE_ID = "scopedlabs-compute-storage-throughput-planner-ui-overlay-0706";

  function isStorageThroughputPage() {
    return !!(document.body && document.body.getAttribute("data-step") === "storage-throughput");
  }

  function injectStyle() {
    if (!isStorageThroughputPage() || document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      'body[data-step="storage-throughput"] #flow-note { display: none !important; visibility: hidden !important; }',
      'body[data-step="storage-throughput"] #computeStorageThroughputResultCard.storage-throughput-result-summary-card { display: none !important; visibility: hidden !important; }',
      'body[data-step="storage-throughput"] .storage-throughput-active-workflow-card { margin-top: 16px; }',
      'body[data-step="storage-throughput"] .storage-throughput-active-workflow-card .eyebrow { color: #3fff80; font-weight: 500; letter-spacing: 0.04em; }',
      'body[data-step="storage-throughput"] .storage-throughput-active-workflow-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }',
      'body[data-step="storage-throughput"] .storage-throughput-active-workflow-chip { border: 1px solid rgba(63, 255, 128, 0.14); border-radius: 10px; padding: 10px 12px; background: rgba(1, 18, 12, 0.55); min-height: 48px; }',
      'body[data-step="storage-throughput"] .storage-throughput-active-workflow-chip .mini-label { display: block; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sl-muted, #9fb4ad); margin-bottom: 4px; }',
      'body[data-step="storage-throughput"] .storage-throughput-active-workflow-chip strong { display: block; font-size: 0.86rem; }',
      '@media (max-width: 760px) { body[data-step="storage-throughput"] .storage-throughput-active-workflow-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }'
    ].join("\n");
    document.head.appendChild(style);
  }

  function textOf(el) {
    return (el && el.textContent ? el.textContent : "").replace(/\s+/g, " ").trim();
  }

  function selectedText(id, fallback) {
    var el = document.getElementById(id);
    if (!el) return fallback || "Not set";
    if (el.options && el.selectedIndex >= 0) return textOf(el.options[el.selectedIndex]) || fallback || "Not set";
    return String(el.value || "").trim() || fallback || "Not set";
  }

  function inputValue(id, suffix, fallback) {
    var el = document.getElementById(id);
    var value = el ? String(el.value || "").trim() : "";
    return value ? value + (suffix || "") : fallback || "Not set";
  }

  function readActiveWorkload() {
    var State = window.ScopedLabsComputePlanState || {};
    var context = null;
    var workload = null;

    try { if (typeof State.getGuidedFlowContext === "function") context = State.getGuidedFlowContext(); } catch (error) { context = null; }
    if (context && context.workload && typeof context.workload === "object") workload = context.workload;
    try { if (!workload && context && context.activeWorkload && typeof context.activeWorkload === "object") workload = context.activeWorkload; } catch (error) { workload = workload || null; }
    try { if (!workload && typeof State.getActiveWorkload === "function") workload = State.getActiveWorkload(); } catch (error) { workload = workload || null; }
    try { if (!workload && typeof State.getCurrentWorkload === "function") workload = State.getCurrentWorkload(); } catch (error) { workload = workload || null; }
    try {
      if (!workload && typeof State.load === "function" && typeof State.activeWorkload === "function") {
        var plan = State.load();
        workload = State.activeWorkload(plan);
      }
    } catch (error) {
      workload = workload || null;
    }

    return workload && typeof workload === "object" ? workload : {};
  }

  function workloadValue(workload, keys, fallback) {
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (workload[key] != null && String(workload[key]).trim()) return String(workload[key]).trim();
    }
    return fallback;
  }

  function workflowData() {
    var workload = readActiveWorkload();
    var environment = workloadValue(workload, ["environmentLabel", "environment", "criticality"], "Active workload");
    var workloadType = selectedText("workloadType", workloadValue(workload, ["workloadTypeLabel", "workloadType"], "VM datastore"));

    return {
      title: workloadValue(workload, ["name", "title", "workloadName", "label"], "Active Workflow"),
      summary: environment + " | " + workloadType + " | Storage Throughput",
      environment: environment,
      workloadType: workloadType,
      demandSource: workloadValue(workload, ["primaryConstraint", "constraint", "demandSource"], "Storage IOPS"),
      nextTool: "VM Density",
      transportPath: selectedText("transportPath", "10 GbE / shared path"),
      mediaTier: selectedText("mediaTier", "SATA / SAS SSD"),
      growthReserve: inputValue("growthPct", "%", "20%"),
      status: "Pending Calculation"
    };
  }

  function findKbCard() {
    var cards = Array.from(document.querySelectorAll("section.card, div.card"));
    return cards.find(function (card) {
      var text = textOf(card);
      return text.indexOf("Storage Throughput Guide") >= 0 && text.indexOf("Open KB Guide") >= 0;
    }) || document.getElementById("scopedlabs-help") || null;
  }

  function hideKbPill(card) {
    if (!card) return;
    Array.from(card.querySelectorAll("*")).forEach(function (node) {
      if (node.children.length === 0 && textOf(node) === "Knowledge Base") {
        node.hidden = true;
        node.setAttribute("aria-hidden", "true");
        node.style.display = "none";
      }
    });
  }

  function buildCard() {
    var card = document.createElement("section");
    card.className = "card storage-throughput-active-workflow-card";
    card.setAttribute("data-storage-throughput-active-workflow-card", "0706");
    card.setAttribute("data-compute-shell-owned-active-workflow", "0706");
    card.setAttribute("data-compute-planner-routing-context", "storage-throughput-0706");
    card.innerHTML = [
      '<div class="eyebrow">ACTIVE WORKFLOW &rarr; STORAGE THROUGHPUT</div>',
      '<h2 class="h2" style="margin-top: 8px;" data-storage-throughput-workflow-title>Active Workflow</h2>',
      '<p class="muted" style="margin-top: 4px;" data-storage-throughput-workflow-summary>Storage Throughput uses the active workload context and carries storage-path decisions into the next Compute step.</p>',
      '<div class="storage-throughput-active-workflow-grid" aria-label="Active workload context">',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Environment</span><strong data-storage-throughput-workflow-value="environment">Active workload</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Workload Type</span><strong data-storage-throughput-workflow-value="workloadType">VM datastore</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Demand Source</span><strong data-storage-throughput-workflow-value="demandSource">Storage IOPS</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Next Tool</span><strong data-storage-throughput-workflow-value="nextTool">VM Density</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Transport Path</span><strong data-storage-throughput-workflow-value="transportPath">10 GbE / shared path</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Media Tier</span><strong data-storage-throughput-workflow-value="mediaTier">SATA / SAS SSD</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Growth Reserve</span><strong data-storage-throughput-workflow-value="growthReserve">20%</strong></div>',
      '<div class="storage-throughput-active-workflow-chip"><span class="mini-label">Status</span><strong data-storage-throughput-workflow-value="status">Pending Calculation</strong></div>',
      '</div>'
    ].join("");
    return card;
  }

  function setValue(card, key, value) {
    var node = card.querySelector('[data-storage-throughput-workflow-value="' + key + '"]');
    if (node) node.textContent = value;
  }

  function updateCard() {
    if (!isStorageThroughputPage()) return;
    var card = document.querySelector('[data-storage-throughput-active-workflow-card="0706"]');
    if (!card) return;

    var data = workflowData();
    var title = card.querySelector("[data-storage-throughput-workflow-title]");
    var summary = card.querySelector("[data-storage-throughput-workflow-summary]");
    if (title) title.textContent = data.title;
    if (summary) summary.textContent = data.summary;
    setValue(card, "environment", data.environment);
    setValue(card, "workloadType", data.workloadType);
    setValue(card, "demandSource", data.demandSource);
    setValue(card, "nextTool", data.nextTool);
    setValue(card, "transportPath", data.transportPath);
    setValue(card, "mediaTier", data.mediaTier);
    setValue(card, "growthReserve", data.growthReserve);
    setValue(card, "status", data.status);
  }

  function ensureCard() {
    if (!isStorageThroughputPage()) return;
    injectStyle();

    var kbCard = findKbCard();
    hideKbPill(kbCard);

    var current = document.querySelector('[data-storage-throughput-active-workflow-card]');
    if (current && current.getAttribute("data-storage-throughput-active-workflow-card") !== "0706") {
      var replacement = buildCard();
      current.parentNode.replaceChild(replacement, current);
      current = replacement;
    }

    if (!current && kbCard) {
      current = buildCard();
      kbCard.insertAdjacentElement("afterend", current);
    }

    updateCard();
  }

  function bind() {
    if (window.__ScopedLabsComputeStorageThroughputPlannerUiRefresh0706) return;
    window.__ScopedLabsComputeStorageThroughputPlannerUiRefresh0706 = true;
    document.addEventListener("input", updateCard, true);
    document.addEventListener("change", updateCard, true);
    window.addEventListener("scopedlabs:compute:workload-plan-change", updateCard);
  }

  function run() {
    ensureCard();
    bind();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();

  window.addEventListener("load", run);
  window.setTimeout(run, 250);
  window.setTimeout(run, 900);
  window.setTimeout(run, 1800);
})();


// compute-shell-vm-density-active-workflow-0706
(function () {
  if (window.__ScopedLabsComputeVmDensityActiveWorkflow0706) return;
  window.__ScopedLabsComputeVmDensityActiveWorkflow0706 = true;

  var STYLE_ID = "scopedlabs-compute-vm-density-active-workflow-0706";
  var VM_RESULT_KEY = "scopedlabs:pipeline:compute:vm-density";
  var STORAGE_RESULT_KEY = "scopedlabs:pipeline:compute:storage-throughput";

  function isVmDensityPage() {
    return !!(document.body && document.body.getAttribute("data-step") === "vm-density");
  }

  function injectStyle() {
    if (!isVmDensityPage() || document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      'body[data-step="vm-density"] #flow-note { display: none !important; visibility: hidden !important; }',
      'body[data-step="vm-density"] .vm-density-active-workflow-card { margin-top: 16px; }',
      'body[data-step="vm-density"] .vm-density-active-workflow-card .eyebrow { color: #3fff80; font-weight: 500; letter-spacing: 0.04em; }',
      'body[data-step="vm-density"] .vm-density-active-workflow-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }',
      'body[data-step="vm-density"] .vm-density-active-workflow-chip { border: 1px solid rgba(63, 255, 128, 0.14); border-radius: 10px; padding: 10px 12px; background: rgba(1, 18, 12, 0.55); min-height: 48px; }',
      'body[data-step="vm-density"] .vm-density-active-workflow-chip .mini-label { display: block; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sl-muted, #9fb4ad); margin-bottom: 4px; }',
      'body[data-step="vm-density"] .vm-density-active-workflow-chip strong { display: block; font-size: 0.86rem; }',
      '@media (max-width: 760px) { body[data-step="vm-density"] .vm-density-active-workflow-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }'
    ].join("\n");
    document.head.appendChild(style);
  }

  function textOf(el) {
    return (el && el.textContent ? el.textContent : "").replace(/\s+/g, " ").trim();
  }

  function selectedText(id, fallback) {
    var el = document.getElementById(id);
    if (!el) return fallback || "Not set";
    if (el.options && el.selectedIndex >= 0) return textOf(el.options[el.selectedIndex]) || fallback || "Not set";
    return String(el.value || "").trim() || fallback || "Not set";
  }

  function inputValue(id, suffix, fallback) {
    var el = document.getElementById(id);
    var value = el ? String(el.value || "").trim() : "";
    return value ? value + (suffix || "") : fallback || "Not set";
  }

  function readJsonStorage(key) {
    try {
      var raw = window.sessionStorage ? window.sessionStorage.getItem(key) : null;
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function statusFromResult(result) {
    if (result && (result.status || result.summaryStatus)) return String(result.status || result.summaryStatus).toUpperCase();
    var stored = readJsonStorage(VM_RESULT_KEY);
    var data = stored && stored.data ? stored.data : null;
    if (data && (data.status || data.summaryStatus)) return String(data.status || data.summaryStatus).toUpperCase();
    return "Pending Calculation";
  }

  function readActiveWorkload() {
    var State = window.ScopedLabsComputePlanState || {};
    var context = null;
    var workload = null;

    try { if (typeof State.getGuidedFlowContext === "function") context = State.getGuidedFlowContext(); } catch (error) { context = null; }
    if (context && context.workload && typeof context.workload === "object") workload = context.workload;
    try { if (!workload && typeof State.getActiveWorkload === "function") workload = State.getActiveWorkload(); } catch (error) { workload = workload || null; }
    try { if (!workload && typeof State.getCurrentWorkload === "function") workload = State.getCurrentWorkload(); } catch (error) { workload = workload || null; }

    return workload && typeof workload === "object" ? workload : {};
  }

  function workloadValue(workload, keys, fallback) {
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (workload[key] != null && String(workload[key]).trim()) return String(workload[key]).trim();
    }
    return fallback;
  }

  function storageDemandSource() {
    var stored = readJsonStorage(STORAGE_RESULT_KEY);
    var data = stored && stored.data ? stored.data : null;
    var status = data && (data.status || data.summaryStatus) ? String(data.status || data.summaryStatus).toUpperCase() : "";
    return status ? "Storage Throughput / " + status : "Storage Throughput";
  }

  function sharedWorkloadDisplayContext() {
    var State = window.ScopedLabsComputePlanState || {};
    try {
      if (typeof State.buildWorkloadDisplayContext === "function") {
        return State.buildWorkloadDisplayContext("VM Density");
      }
    } catch (error) {}
    return null;
  }

  function contextRowValue(context, label, fallback) {
    var rows = context && Array.isArray(context.rows) ? context.rows : [];
    var wanted = String(label || "").toLowerCase();
    for (var i = 0; i < rows.length; i += 1) {
      if (String(rows[i][0] || "").toLowerCase() === wanted) return String(rows[i][1] || fallback || "");
    }
    return fallback;
  }

  function workflowData(result) {
    var context = sharedWorkloadDisplayContext();
    var workload = context && context.raw && typeof context.raw === "object" ? context.raw : readActiveWorkload();
    var environment = contextRowValue(context, "Environment", workloadValue(workload, ["environmentLabel", "environment", "criticality"], "Active workload"));
    var workflowTitle = context && context.hasActiveWorkload ? context.title : workloadValue(workload, ["name", "title", "workloadName", "label"], "Active Workflow");
    var workloadMix = selectedText("workloadMix", contextRowValue(context, "Workload Type", workloadValue(workload, ["workloadMixLabel", "workloadTypeLabel", "workloadType"], "Mixed / general")));
    var ha = selectedText("haPolicy", "No HA reserve");
    var spare = inputValue("spare", "%", "15%");

    return {
      title: workflowTitle,
      summary: context && context.hasActiveWorkload ? context.description : environment + " | " + workloadMix + " | VM Density",
      environment: environment,
      workloadMix: workloadMix,
      demandSource: storageDemandSource(),
      nextTool: "Power / Thermal",
      plannedHosts: inputValue("hostCount", "", "1"),
      reservePolicy: ha + " / spare " + spare,
      growthReserve: inputValue("growthPct", "%", "20%"),
      status: statusFromResult(result)
    };
  }

  function buildMount() {
    var mount = document.getElementById("computeVmDensityActiveWorkflowMount");
    if (mount) return mount;

    mount = document.createElement("div");
    mount.id = "computeVmDensityActiveWorkflowMount";
    mount.setAttribute("data-vm-density-active-workflow-mount", "0706");

    var pipeline = document.getElementById("pipeline");
    if (pipeline && pipeline.parentNode) {
      pipeline.insertAdjacentElement("afterend", mount);
      return mount;
    }

    var main = document.querySelector("main.container.page") || document.querySelector("main");
    if (main) main.insertBefore(mount, main.firstChild);
    return mount;
  }

  function removeLegacyStaticCards() {
    Array.from(document.querySelectorAll("section.card, div.card")).forEach(function (card) {
      if (card.getAttribute("data-vm-density-active-workflow-card")) return;
      var text = textOf(card);
      if (text.indexOf("Active Workflow") >= 0 && text.indexOf("Compute density validation") >= 0) {
        card.parentNode.removeChild(card);
      }
    });
  }

  function removeDuplicateCards(keep) {
    Array.from(document.querySelectorAll("[data-vm-density-active-workflow-card]")).forEach(function (card) {
      if (card !== keep && card.parentNode) card.parentNode.removeChild(card);
    });
  }

  function buildCard() {
    var card = document.createElement("section");
    card.className = "card vm-density-active-workflow-card";
    card.setAttribute("data-vm-density-active-workflow-card", "0706");
    card.setAttribute("data-compute-shell-owned-active-workflow", "0706");
    card.setAttribute("data-compute-planner-routing-context", "vm-density-0706");
    card.innerHTML = [
      '<div class="eyebrow">ACTIVE WORKFLOW &rarr; VM DENSITY</div>',
      '<h2 class="h2" style="margin-top: 8px;" data-vm-density-workflow-title>Active Workflow</h2>',
      '<p class="muted" style="margin-top: 4px;" data-vm-density-workflow-summary>VM Density uses the active workload context and carries consolidation decisions into Power / Thermal.</p>',
      '<div class="vm-density-active-workflow-grid" aria-label="Active workload context">',
      '<div class="vm-density-active-workflow-chip"><span class="mini-label">Environment</span><strong data-vm-density-workflow-value="environment">Active workload</strong></div>',
      '<div class="vm-density-active-workflow-chip"><span class="mini-label">Workload Mix</span><strong data-vm-density-workflow-value="workloadMix">Mixed / general</strong></div>',
      '<div class="vm-density-active-workflow-chip"><span class="mini-label">Demand Source</span><strong data-vm-density-workflow-value="demandSource">Storage Throughput</strong></div>',
      '<div class="vm-density-active-workflow-chip"><span class="mini-label">Next Tool</span><strong data-vm-density-workflow-value="nextTool">Power / Thermal</strong></div>',
      '<div class="vm-density-active-workflow-chip"><span class="mini-label">Planned Hosts</span><strong data-vm-density-workflow-value="plannedHosts">1</strong></div>',
      '<div class="vm-density-active-workflow-chip"><span class="mini-label">Reserve Policy</span><strong data-vm-density-workflow-value="reservePolicy">No HA reserve / spare 15%</strong></div>',
      '<div class="vm-density-active-workflow-chip"><span class="mini-label">Growth Reserve</span><strong data-vm-density-workflow-value="growthReserve">20%</strong></div>',
      '<div class="vm-density-active-workflow-chip"><span class="mini-label">Status</span><strong data-vm-density-workflow-value="status">Pending Calculation</strong></div>',
      "</div>"
    ].join("");
    return card;
  }

  function setValue(card, key, value) {
    var node = card.querySelector('[data-vm-density-workflow-value="' + key + '"]');
    if (node) node.textContent = value;
  }

  function updateCard(result) {
    if (!isVmDensityPage()) return;
    var card = document.querySelector('[data-vm-density-active-workflow-card="0706"]');
    if (!card) return;

    var data = workflowData(result);
    var title = card.querySelector("[data-vm-density-workflow-title]");
    var summary = card.querySelector("[data-vm-density-workflow-summary]");
    if (title) title.textContent = data.title;
    if (summary) summary.textContent = data.summary;
    setValue(card, "environment", data.environment);
    setValue(card, "workloadMix", data.workloadMix);
    setValue(card, "demandSource", data.demandSource);
    setValue(card, "nextTool", data.nextTool);
    setValue(card, "plannedHosts", data.plannedHosts);
    setValue(card, "reservePolicy", data.reservePolicy);
    setValue(card, "growthReserve", data.growthReserve);
    setValue(card, "status", data.status);
  }

  function ensureCard(result) {
    if (!isVmDensityPage()) return;
    injectStyle();
    removeLegacyStaticCards();

    var mount = buildMount();
    if (!mount) return;

    var card = mount.querySelector('[data-vm-density-active-workflow-card="0706"]');
    if (!card) {
      card = buildCard();
      mount.innerHTML = "";
      mount.appendChild(card);
    }

    removeDuplicateCards(card);
    updateCard(result);
  }

  function run(result) {
    ensureCard(result || null);
  }

  window.ScopedLabsComputeVmDensityActiveWorkflow = {
    refresh: function (result) {
      run(result || null);
    }
  };

  document.addEventListener("input", function () { updateCard(null); }, true);
  document.addEventListener("change", function () { updateCard(null); }, true);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { run(null); }, { once: true });
  else run(null);

  window.addEventListener("load", function () { run(null); });
  window.setTimeout(function () { run(null); }, 250);
  window.setTimeout(function () { run(null); }, 900);
  window.setTimeout(function () { run(null); }, 1800);
})();


// compute-shell-storage-throughput-active-workflow-singleton-0709
(function () {
  if (window.__ScopedLabsStorageThroughputActiveWorkflowSingleton0709) return;
  window.__ScopedLabsStorageThroughputActiveWorkflowSingleton0709 = true;

  function isStorageThroughputPage() {
    return !!(document.body && document.body.getAttribute("data-step") === "storage-throughput");
  }

  function textOf(el) {
    return (el && el.textContent ? el.textContent : "").replace(/\s+/g, " ").trim();
  }

  function looksLikeStorageThroughputWorkflowCard(card) {
    if (!card) return false;

    if (
      card.matches &&
      card.matches("[data-storage-throughput-active-workflow-card], .storage-throughput-active-workflow-card")
    ) {
      return true;
    }

    var text = textOf(card).toLowerCase();
    return (
      (text.indexOf("active workflow") >= 0 || text.indexOf("active workload") >= 0) &&
      text.indexOf("storage throughput") >= 0
    );
  }

  function preferredStorageThroughputWorkflowCard(cards) {
    return cards.find(function (card) {
      return card.getAttribute("data-storage-throughput-active-workflow-card") === "0706";
    }) || cards.find(function (card) {
      return card.getAttribute("data-compute-planner-routing-context") === "storage-throughput-0706";
    }) || cards.find(function (card) {
      return card.getAttribute("data-compute-shell-owned-active-workflow");
    }) || cards[cards.length - 1] || null;
  }

  function dedupeStorageThroughputWorkflowCards() {
    if (!isStorageThroughputPage()) return;

    var cards = Array.from(document.querySelectorAll("section.card, div.card"))
      .filter(looksLikeStorageThroughputWorkflowCard);

    if (!cards.length) return;

    var keep = preferredStorageThroughputWorkflowCard(cards);

    cards.forEach(function (card) {
      if (card !== keep && card.parentNode) {
        card.parentNode.removeChild(card);
      }
    });

    if (keep) {
      keep.hidden = false;
      keep.removeAttribute("hidden");
      keep.style.display = "";
      keep.setAttribute("data-storage-throughput-active-workflow-singleton", "0709");
    }
  }

  function scheduleStorageThroughputWorkflowDedupe() {
    [0, 100, 400, 900, 1600].forEach(function (delay) {
      window.setTimeout(dedupeStorageThroughputWorkflowCards, delay);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleStorageThroughputWorkflowDedupe);
  } else {
    scheduleStorageThroughputWorkflowDedupe();
  }

  window.addEventListener("pageshow", scheduleStorageThroughputWorkflowDedupe);
})();


// compute-shell-storage-throughput-active-workflow-strict-singleton-0709b
(function () {
  if (window.__ScopedLabsStorageThroughputActiveWorkflowStrictSingleton0709b) return;
  window.__ScopedLabsStorageThroughputActiveWorkflowStrictSingleton0709b = true;

  var STYLE_ID = "scopedlabs-storage-throughput-active-workflow-strict-singleton-0709b";

  function isStorageThroughputPage() {
    return !!(document.body && document.body.getAttribute("data-step") === "storage-throughput");
  }

  function textOf(el) {
    return (el && el.textContent ? el.textContent : "").replace(/\s+/g, " ").trim();
  }

  function injectStrictSingletonStyle() {
    if (!isStorageThroughputPage() || document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      'body[data-step="storage-throughput"] [data-storage-throughput-active-workflow-card="0705"] { display: none !important; visibility: hidden !important; }',
      'body[data-step="storage-throughput"] [data-storage-throughput-active-workflow-duplicate-removed="0709b"] { display: none !important; visibility: hidden !important; }'
    ].join("\n");

    document.head.appendChild(style);
  }

  function addUnique(list, node) {
    if (!node) return;
    var card = node.closest && node.closest(".card") ? node.closest(".card") : node;
    if (card && list.indexOf(card) === -1) list.push(card);
  }

  function looksLikeStorageThroughputWorkflow(card) {
    if (!card) return false;

    if (
      card.getAttribute("data-storage-throughput-active-workflow-card") ||
      card.getAttribute("data-storage-throughput-active-workflow-singleton") ||
      card.classList.contains("storage-throughput-active-workflow-card") ||
      card.getAttribute("data-compute-planner-routing-context") === "storage-throughput-0706"
    ) {
      return true;
    }

    var text = textOf(card).toLowerCase();
    return (
      (text.indexOf("active workflow") >= 0 || text.indexOf("active workload") >= 0) &&
      text.iif (card.getAttribute("data-compute-planner-routing-context") === "storage-throughput-0706") score += 80;
    if (card.getAttribute("data-storage-throughput-active-workflow-singleton") === "0709") score += 60;
    if (card.getAttribute("data-compute-shell-owned-active-workflow")) score += 40;
    if (card.classList.contains("storage-throughput-active-workflow-card")) score += 20;
    if (card.getAttribute("data-storage-throughput-active-workflow-card") === "0705") score -= 100;

    return score;
  }

  function strictDedupeStorageThroughputWorkflowCards() {
    if (!isStorageThroughputPage()) return;

    injectStrictSingletonStyle();

    var cards = collectStorageThroughputWorkflowCards();
    if (cards.length <= 1) {
      if (cards[0]) cards[0].setAttribute("data-storage-throughput-active-workflow-strict-singleton", "0709b");
      return;
    }

    cards.sort(function (a, b) {
      return scoreWorkflowCard(b) - scoreWorkflowCard(a);
    });

    var keep = cards[0];

    cards.forEach(function (card) {
      if (card === keep) return;

      card.setAttribute("data-storage-throughput-active-workflow-duplicate-removed", "0709b");

      if (card.parentNode) {
        card.parentNode.removeChild(card);
      }
    });

    keep.hidden = false;
    keep.removeAttribute("hidden");
    keep.style.display = "";
    keep.style.visibility = "";
    keep.setAttribute("data-storage-throughput-active-workflow-strict-singleton", "0709b");
  }

  function scheduleStrictStorageThroughputWorkflowDedupe() {
    [0, 50, 150, 300, 700, 1200, 2000, 4000, 7000, 10000, 15000, 25000].forEach(function (delay) {
      window.setTimeout(strictDedupeStorageThroughputWorkflowCards, delay);
    });

    var runs = 0;
    var timer = window.setInterval(function () {
      strictDedupeStorageThroughputWorkflowCards();
      runs += 1;
      if (runs >= 30) window.clearInterval(timer);
    }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleStrictStorageThroughputWorkflowDedupe);
  } else {
    scheduleStrictStorageThroughputWorkflowDedupe();
  }

  window.addEventListener("load", scheduleStrictStorageThroughputWorkflowDedupe);
  window.addEventListener("pageshow", scheduleStrictStorageThroughputWorkflowDedupe);
})();
