(function () {
  "use strict";

  var VERSION = "scopedlabs-compute-shell-contract-005-flow-actions-static-safe";

  function isComputeShellPage() {
    var body = document.body;
    return !!(
      body &&
      body.dataset &&
      body.dataset.category === "compute" &&
      body.dataset.computeToolShell === "0614"
    );
  }

  function injectStyles() {
    if (!isComputeShellPage()) return;
    if (document.getElementById("scopedlabs-compute-shell-contract-styles")) return;

    var style = document.createElement("style");
    style.id = "scopedlabs-compute-shell-contract-styles";
    style.textContent = [
      'body[data-category="compute"][data-compute-tool-shell="0614"] .btn,',
      'body[data-category="compute"][data-compute-tool-shell="0614"] button.btn,',
      'body[data-category="compute"][data-compute-tool-shell="0614"] a.btn,',
      'body[data-category="compute"][data-compute-tool-shell="0614"] .sl-help-toggle,',
      'body[data-category="compute"][data-compute-tool-shell="0614"] .sl-help-link,',
      'body[data-category="compute"][data-compute-tool-shell="0614"] .sl-help-related-close,',
      'body[data-category="compute"][data-compute-tool-shell="0614"] .sl-report-meta,',
      'body[data-category="compute"][data-compute-tool-shell="0614"] .sl-report-meta summary,',
      'body[data-category="compute"][data-compute-tool-shell="0614"] .scopedlabs-user-tool-notes-inline summary {',
      '  border-radius: 10px !important;',
      '}',
      'body[data-category="compute"][data-compute-tool-shell="0614"] #scopedlabs-help .sl-help-eyebrow,',
      'body[data-category="compute"][data-compute-tool-shell="0614"] #scopedlabs-help [class*="eyebrow"] {',
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
      normalizeFlowActions();
    ensureFlowActionsPlacement();
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
    ensureFlowActionsPlacement: ensureFlowActionsPlacement
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observe);
  } else {
    observe();
  }
  initSharedComputeWorkloadContextCard();

})();