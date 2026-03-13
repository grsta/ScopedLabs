/* ScopedLabs Tool Flow System
   Handles:
   - query parameter import
   - workflow progress state
   - shared helpers for chained tools
*/

(() => {

  const ToolFlow = {};

  /* -----------------------------
     Parse query parameters
  ----------------------------- */

  ToolFlow.params = new URLSearchParams(window.location.search);

  ToolFlow.get = (key) => {
    return ToolFlow.params.get(key);
  };

  ToolFlow.has = (key) => {
    return ToolFlow.params.has(key);
  };

  /* -----------------------------
     Import helper
  ----------------------------- */

  ToolFlow.import = (map) => {
    Object.keys(map).forEach(param => {
      const el = document.getElementById(map[param]);
      const val = ToolFlow.get(param);

      if (el && val !== null) {
        el.value = val;
      }
    });
  };

  /* -----------------------------
     Show import banner
  ----------------------------- */

  ToolFlow.banner = (text) => {

    const container =
      document.querySelector(".tool-card") ||
      document.querySelector(".card");

    if (!container) return;

    const banner = document.createElement("div");

    banner.className = "flow-note";
    banner.textContent = text;

    container.parentNode.insertBefore(banner, container);
  };

  /* -----------------------------
     Workflow step detection
  ----------------------------- */

  ToolFlow.currentTool = (() => {

    const path = window.location.pathname;

    if (path.includes("bitrate-estimator")) return "bitrate";
    if (path.includes("storage-calculator")) return "storage";
    if (path.includes("retention-planner")) return "retention";
    if (path.includes("raid-impact")) return "raid";
    if (path.includes("retention-survivability")) return "survivability";

    return null;

  })();

  /* -----------------------------
     Public API
  ----------------------------- */

  window.SL_FLOW = ToolFlow;

})();