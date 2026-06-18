(function () {
  "use strict";

  var VERSION = "scopedlabs-compute-shell-contract-002-flow-actions";

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


  function normalizeContinueLabel(label) {
    var text = String(label || "").replace(/\s+/g, " ").trim();

    if (/storage\s+iops/i.test(text)) return "Continue &rarr; Storage IOPS";
    if (/storage\s+throughput/i.test(text)) return "Continue &rarr; Storage Throughput";
    if (/ram\s+sizing/i.test(text)) return "Continue &rarr; RAM Sizing";

    return text ? text.replace(/\s+\?\s+/g, " &rarr; ") : "Continue &rarr; Next Step";
  }

  function normalizeFlowActions() {
    if (!isComputeShellPage()) return;

    Array.from(document.querySelectorAll(".compute-flow-actions")).forEach(function (row) {
      row.setAttribute("data-compute-flow-actions", "true");

      Array.from(row.querySelectorAll(".btn")).forEach(function (node) {
        node.style.borderRadius = "10px";
      });

      Array.from(row.querySelectorAll("#continue, [data-compute-continue]")).forEach(function (node) {
        var raw = String(node.textContent || node.innerHTML || "").replace(/\s+/g, " ").trim();
        if (/^continue/i.test(raw)) {
          node.innerHTML = normalizeContinueLabel(raw);
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

    var observer = new MutationObserver(function () {
      run();
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
    normalizeFlowActions: normalizeFlowActions
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observe);
  } else {
    observe();
  }
})();