/* /assets/app.js
   ScopedLabs global UI helpers only.
   - No tool math
   - No auth
   - No checkout
*/

(function () {
  "use strict";

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function ensureHelpModal() {
    // If your HTML already has a modal, we won't duplicate it.
    // We look for an element with id="help-modal".
    let modal = document.getElementById("help-modal");
    if (modal) return modal;

    // Minimal modal shell (dark/lab style should be coming from your CSS)
    modal = document.createElement("div");
    modal.id = "help-modal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-backdrop" data-close="1"></div>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <div class="modal-head">
          <div id="help-title" class="modal-title">Help</div>
          <button class="btn btn-sm" id="help-close" type="button">Close</button>
        </div>
        <div class="modal-body">
          <div id="help-body" class="muted"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // close handlers
    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (!t) return;
      if (t.id === "help-close") hideHelp();
      if (t.getAttribute && t.getAttribute("data-close") === "1") hideHelp();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideHelp();
    });

    function hideHelp() {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }

    return modal;
  }

  function openHelp(title, body) {
    const modal = ensureHelpModal();
    const t = document.getElementById("help-title");
    const b = document.getElementById("help-body");
    if (t) t.textContent = title || "Help";
    if (b) b.textContent = body || "";
    modal.classList.add("open");
    document.body.classList.add("modal-open");
  }

  function wireHintButtons() {
    // Your hint buttons use: button.hint with data-title / data-help
    qsa("button.hint").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const title = btn.getAttribute("data-title") || "Help";
        const help = btn.getAttribute("data-help") || "";
        openHelp(title, help);
      });
    });
  }

  function setFooterYear() {
    const y = String(new Date().getFullYear());
    qsa("[data-year]").forEach((el) => (el.textContent = y));
    // Also support: <span id="year"></span>
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = y;
  }

  onReady(() => {
    setFooterYear();
    wireHintButtons();
  });

  // Expose minimal help API if needed elsewhere
  window.SCOPEDLABS_UI = window.SCOPEDLABS_UI || {};
  window.SCOPEDLABS_UI.openHelp = openHelp;
})();
