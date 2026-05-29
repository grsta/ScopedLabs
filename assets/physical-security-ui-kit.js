/* ScopedLabs Physical Security UI Kit
   Version: physical-security-ui-kit-001-dormant-foundation
   Purpose: shared UI helpers for Physical Security tools.
   Notes:
   - No auto-mount.
   - No runtime fetch.
   - No page mutation unless a function is explicitly called.
*/
(function () {
  "use strict";

  const API_VERSION = "physical-security-ui-kit-001-dormant-foundation";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function flowLabel(parts) {
    return (Array.isArray(parts) ? parts : [])
      .filter(Boolean)
      .map((part) => '<span>' + escapeHtml(part) + '</span>')
      .join('<span class="area-flow-arrow">&rarr;</span>');
  }

  function setButtonFeedback(button, label, options) {
    if (!button) return false;

    const settings = options || {};
    const original = button.dataset.originalLabel || button.textContent || "";
    button.dataset.originalLabel = original;
    button.textContent = String(label || "Done");
    button.disabled = settings.disabled !== false;

    window.clearTimeout(button._scopedLabsFeedbackTimer);
    button._scopedLabsFeedbackTimer = window.setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, Number(settings.durationMs || 1600));

    return true;
  }

  function statusClass(status) {
    const value = String(status || "").toLowerCase();
    if (value.includes("risk")) return "risk";
    if (value.includes("watch")) return "watch";
    if (value.includes("healthy") || value.includes("safe")) return "healthy";
    return "pending";
  }

  window.ScopedLabsPhysicalSecurityUiKit = Object.freeze({
    version: API_VERSION,
    escapeHtml,
    flowLabel,
    setButtonFeedback,
    statusClass
  });
})();
