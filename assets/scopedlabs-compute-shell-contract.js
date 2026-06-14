(function () {
  "use strict";

  var COMPUTE_SHELL_CONTRACT_VERSION = "scopedlabs-compute-shell-contract-008-active-title-guide-match";

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

  function run() {
    if (!isComputeShellPage()) return;
    injectStyles();
    cleanKnowledgeBaseCard();
    cleanReportMetadata();
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observe);
  } else {
    observe();
  }
})();

;(function computeActiveWorkloadContextCardAccessCss0614() {
  var STYLE_ID = "sl-compute-active-card-access-css-0614";

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = [
      "/* Matches tools/access-control/fail-safe-fail-secure active status card CSS values. */",
      ".compute-workload-context-card{border:1px solid rgba(125,255,152,.2)!important;background:rgba(255,255,255,.035)!important;border-radius:16px!important;padding:16px!important;margin-top:14px!important}",
      ".compute-workload-context-card .access-scope-mini-flow{color:rgba(166,255,190,.86)!important;font-size:.72rem!important;font-weight:800!important;letter-spacing:.055em!important;text-transform:uppercase!important;margin:0 0 .42rem!important;line-height:1.18!important}",
      ".compute-workload-context-card #computeWorkloadContextTitle{color:rgba(246,255,248,.96)!important;font-size:1rem!important;font-weight:800!important;line-height:1.3!important;margin:0!important}",
      ".compute-workload-context-card #computeWorkloadContextCopy{color:rgba(203,213,225,.72)!important;font-size:.9rem!important;line-height:1.45!important;margin:6px 0 0!important;font-weight:500!important}",
      ".compute-workload-context-card .access-scope-meta{display:grid!important;gap:10px!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;margin-top:14px!important}",
      ".compute-workload-context-card .access-scope-meta-item{border:1px solid rgba(148,163,184,.12)!important;border-radius:12px!important;padding:10px!important;background:rgba(0,0,0,.12)!important;min-height:auto!important;box-sizing:border-box!important;color:rgba(226,232,240,.9)!important;font-size:.88rem!important;font-weight:750!important;line-height:1.4!important}",
      ".compute-workload-context-card .access-scope-meta-item strong{color:rgba(203,213,225,.66)!important;display:block!important;font-size:.68rem!important;font-weight:800!important;letter-spacing:.08em!important;margin-bottom:5px!important;text-transform:uppercase!important;line-height:1.1!important}",
      ".compute-workload-context-card .access-scope-meta-item span{color:rgba(226,232,240,.9)!important;display:block!important;font-size:.88rem!important;font-weight:750!important;line-height:1.4!important}",
      "@media (max-width: 900px){.compute-workload-context-card .access-scope-meta{grid-template-columns:repeat(2,minmax(0,1fr))!important}}",
      "@media (max-width: 620px){.compute-workload-context-card .access-scope-meta{grid-template-columns:1fr!important}}"
    ].join("\n");

    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installStyle, { once: true });
  } else {
    installStyle();
  }
})();

