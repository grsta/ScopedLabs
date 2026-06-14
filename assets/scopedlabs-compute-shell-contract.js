(function () {
  "use strict";

  var COMPUTE_SHELL_CONTRACT_VERSION = "scopedlabs-compute-shell-contract-004-active-card-access-match";

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

;(function computeActiveWorkloadContextCardAccessParity0614() {
  var STYLE_ID = "sl-compute-active-workload-access-parity-0614";

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".compute-workload-context-card{border-color:rgba(120,255,120,.22)!important;background:linear-gradient(180deg,rgba(19,59,38,.34),rgba(4,17,12,.58))!important}",
      ".compute-workload-context-card .access-scope-mini-flow{color:rgba(166,255,190,.86)!important;font-size:.74rem!important;font-weight:800!important;letter-spacing:.06em!important;text-transform:uppercase!important;margin:0 0 .45rem!important}",
      ".compute-workload-context-card .card-title{font-size:1.2rem!important;line-height:1.22!important;margin:.15rem 0 .55rem!important}",
      ".compute-workload-context-card #computeWorkloadContextCopy{color:rgba(216,238,224,.78)!important;font-size:.94rem!important;line-height:1.45!important;margin:0 0 12px!important}",
      ".compute-workload-context-card .access-scope-meta{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;margin-top:12px!important}",
      ".compute-workload-context-card .access-scope-meta-item{min-width:0!important;padding:10px 12px!important;border:1px solid rgba(120,255,120,.15)!important;border-radius:10px!important;background:rgba(0,0,0,.18)!important;color:rgba(245,255,248,.96)!important;font-size:.9rem!important;font-weight:800!important;line-height:1.25!important}",
      ".compute-workload-context-card .access-scope-meta-item small{display:block!important;margin:0 0 5px!important;color:rgba(166,255,190,.70)!important;font-size:.68rem!important;font-weight:800!important;letter-spacing:.055em!important;text-transform:uppercase!important}",
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

;(function computeActiveWorkloadContextCardAccessMatch0614() {
  var STYLE_ID = "sl-compute-active-card-access-match-0614";

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".compute-workload-context-card{border-color:rgba(120,255,120,.22)!important;background:linear-gradient(180deg,rgba(19,59,38,.34),rgba(4,17,12,.58))!important}",
      ".compute-workload-context-card .access-scope-mini-flow{color:rgba(166,255,190,.86)!important;font-size:.72rem!important;font-weight:800!important;letter-spacing:.055em!important;text-transform:uppercase!important;margin:0 0 .42rem!important}",
      ".compute-workload-context-card .card-title{font-size:1.12rem!important;line-height:1.22!important;font-weight:800!important;margin:.1rem 0 .45rem!important;color:rgba(246,255,248,.98)!important}",
      ".compute-workload-context-card #computeWorkloadContextCopy{color:rgba(206,226,214,.74)!important;font-size:.92rem!important;line-height:1.42!important;margin:0 0 12px!important;font-weight:500!important}",
      ".compute-workload-context-card .access-scope-meta{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;margin-top:12px!important}",
      ".compute-workload-context-card .access-scope-meta-item{min-width:0!important;padding:9px 11px!important;border:1px solid rgba(120,255,120,.13)!important;border-radius:10px!important;background:rgba(0,0,0,.16)!important;color:rgba(244,255,248,.96)!important;font-size:.86rem!important;font-weight:800!important;line-height:1.25!important}",
      ".compute-workload-context-card .access-scope-meta-item small{display:block!important;margin:0 0 5px!important;color:rgba(166,204,190,.64)!important;font-size:.65rem!important;font-weight:800!important;letter-spacing:.055em!important;text-transform:uppercase!important}",
      ".compute-workload-context-card .compute-context-value{display:block!important;color:rgba(244,255,248,.96)!important;font-size:.86rem!important;font-weight:800!important;line-height:1.25!important}",
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

