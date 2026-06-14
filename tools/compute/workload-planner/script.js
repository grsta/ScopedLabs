(function () {
  "use strict";

  function boot() {
    if (!window.ScopedLabsComputePlannerAdapter || typeof window.ScopedLabsComputePlannerAdapter.boot !== "function") {
      console.error("ScopedLabsComputePlannerAdapter did not load.");
      return;
    }

    window.ScopedLabsComputePlannerAdapter.boot();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();