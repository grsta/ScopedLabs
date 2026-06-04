(function () {
  "use strict";

  const VERSION = "access-control-tool-polish-001";
  const STYLE_ID = "access-control-tool-polish-styles";

  const FLOW_LABELS = {
    "fail-safe-fail-secure": "Fail-Safe / Fail-Secure \u2192 Reader Type"
  };

  function currentStep() {
    return String(document.body?.dataset?.step || "").trim();
  }

  function isAccessControlTool() {
    return document.body?.dataset?.category === "access-control" &&
      document.body?.dataset?.accessControlToolPolish === "true";
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      'body[data-category="access-control"][data-access-control-tool-polish="true"] .btn{border-radius:10px!important;}',
      'body[data-category="access-control"][data-access-control-tool-polish="true"] .sl-help-card>.pill-row,',
      'body[data-category="access-control"][data-access-control-tool-polish="true"] .scopedlabs-local-assistant-card>.pill-row{display:none!important;}',
      'body[data-category="access-control"][data-access-control-tool-polish="true"] .sl-help-title,',
      'body[data-category="access-control"][data-access-control-tool-polish="true"] .access-control-tool-card-title,',
      'body[data-category="access-control"][data-access-control-tool-polish="true"] .scopedlabs-local-assistant-card .h2,',
      'body[data-category="access-control"][data-access-control-tool-polish="true"] .access-fail-safe-export-card .h3{margin-top:0;color:rgba(246,255,248,.96);font-size:1.24rem;line-height:1.2;font-weight:900;letter-spacing:normal;}',
      'body[data-category="access-control"][data-access-control-tool-polish="true"] .access-control-tool-intro-card .muted,',
      'body[data-category="access-control"][data-access-control-tool-polish="true"] .sl-help-summary{font-size:.96rem;line-height:1.55;}',
      'body[data-category="access-control"][data-access-control-tool-polish="true"] .access-assistant-flow-line{color:rgba(203,213,225,.7);font-size:.78rem;font-weight:850;letter-spacing:.04em;margin:0 0 8px;text-transform:none;}',
      'body[data-category="access-control"][data-access-control-tool-polish="true"] .access-assistant-flow-line .arrow{color:rgba(125,255,152,.75);padding:0 5px;}',
      'body[data-category="access-control"][data-access-control-tool-polish="true"] .access-control-flow-actions{align-items:center;display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-start;margin-top:26px;margin-bottom:18px;}',
      'body[data-category="access-control"][data-access-control-tool-polish="true"] .access-control-flow-actions #next-step-row{align-items:center;gap:10px;margin:0!important;}',
      '@media (max-width:640px){body[data-category="access-control"][data-access-control-tool-polish="true"] .access-control-flow-actions{align-items:stretch;flex-direction:column;}body[data-category="access-control"][data-access-control-tool-polish="true"] .access-control-flow-actions .btn{width:100%;}}'
    ].join("\n");

    document.head.appendChild(style);
  }

  function removePillRows(root) {
    const scope = root || document;
    scope.querySelectorAll(".sl-help-card > .pill-row, .scopedlabs-local-assistant-card > .pill-row").forEach((node) => {
      node.remove();
    });
  }

  function addAssistantFlowLine(root) {
    const step = currentStep();
    const label = FLOW_LABELS[step] || "";
    if (!label) return;

    const scope = root || document;
    scope.querySelectorAll(".scopedlabs-local-assistant-card").forEach((card) => {
      if (card.querySelector(".access-assistant-flow-line")) return;

      const title = card.querySelector("h2");
      if (!title) return;

      const line = document.createElement("div");
      line.className = "access-assistant-flow-line";
      const parts = label.split("\u2192");
      if (parts.length === 2) {
        line.innerHTML = "<span>" + parts[0].trim() + "</span><span class=\"arrow\">\u2192</span><span>" + parts[1].trim() + "</span>";
      } else {
        line.textContent = label;
      }

      title.parentNode.insertBefore(line, title);
    });
  }

  function normalize(root) {
    if (!isAccessControlTool()) return;
    injectStyles();
    removePillRows(root || document);
    addAssistantFlowLine(root || document);
  }

  function observe() {
    if (!isAccessControlTool() || document.body.dataset.accessControlToolPolishObserver === "true") return;
    document.body.dataset.accessControlToolPolishObserver = "true";

    const observer = new MutationObserver((mutations) => {
      let shouldRun = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node && node.nodeType === 1) shouldRun = true;
        });
      });
      if (shouldRun) normalize(document);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    if (!isAccessControlTool()) return;
    normalize(document);
    observe();
  }

  window.ScopedLabsAccessControlToolPolish = Object.freeze({
    version: VERSION,
    init,
    normalize
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();