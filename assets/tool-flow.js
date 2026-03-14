/* ScopedLabs Tool Flow System
   Handles:
   - query parameter import
   - workflow progress state
   - shared helpers for chained tools
   - pro-step link handoff through app.js gating
*/

(() => {
  "use strict";

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

  ToolFlow.set = (key, value) => {
    if (value == null || value === "") ToolFlow.params.delete(key);
    else ToolFlow.params.set(key, String(value));
    return ToolFlow;
  };

  ToolFlow.toQueryString = () => {
    const qs = ToolFlow.params.toString();
    return qs ? `?${qs}` : "";
  };

  /* -----------------------------
     Import helper
  ----------------------------- */

  ToolFlow.import = (map) => {
    Object.keys(map).forEach((param) => {
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
    const existing = document.getElementById("flow-note");

    if (existing) {
      existing.textContent = text;
      existing.hidden = false;
      existing.style.display = "";
      return existing;
    }

    const container =
      document.querySelector(".tool-card") ||
      document.querySelector(".card");

    if (!container || !container.parentNode) return null;

    const banner = document.createElement("div");
    banner.className = "flow-note";
    banner.textContent = text;

    container.parentNode.insertBefore(banner, container);
    return banner;
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

  ToolFlow.currentCategory = (() => {
    const bodyCat = document.body?.dataset?.category;
    if (bodyCat) return String(bodyCat).trim().toLowerCase();

    const parts = window.location.pathname.split("/").filter(Boolean);
    const toolsIdx = parts.indexOf("tools");
    if (toolsIdx >= 0 && parts[toolsIdx + 1]) {
      return String(parts[toolsIdx + 1]).trim().toLowerCase();
    }

    return null;
  })();

  /* -----------------------------
     Helpers
  ----------------------------- */

  ToolFlow.cleanSlug = (value) => {
    if (!value) return null;
    return String(value).trim().toLowerCase();
  };

  ToolFlow.getToolMeta = (category, slug) => {
    const cat = ToolFlow.cleanSlug(category);
    const toolSlug = ToolFlow.cleanSlug(slug);
    const catalog = window.SCOPEDLABS_CATALOG || {};
    const catEntry = catalog[cat];

    if (!catEntry || !Array.isArray(catEntry.tools)) return null;

    return (
      catEntry.tools.find((tool) => ToolFlow.cleanSlug(tool.slug) === toolSlug) ||
      null
    );
  };

  ToolFlow.toolHref = (category, slug, params = {}) => {
    const cat = ToolFlow.cleanSlug(category);
    const toolSlug = ToolFlow.cleanSlug(slug);
    if (!cat || !toolSlug) return "#";

    const qs = new URLSearchParams();

    Object.keys(params || {}).forEach((key) => {
      const value = params[key];
      if (value != null && value !== "") {
        qs.set(key, String(value));
      }
    });

    const query = qs.toString();
    return `/tools/${cat}/${toolSlug}/${query ? `?${query}` : ""}`;
  };

  ToolFlow.upgradeHref = (category) => {
    const cat = ToolFlow.cleanSlug(category);
    return cat ? `/upgrade/?category=${encodeURIComponent(cat)}` : "/upgrade/";
  };

  ToolFlow.show = (elOrId, display = "flex") => {
    const el =
      typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
    if (!el) return null;
    el.style.display = display;
    return el;
  };

  ToolFlow.hide = (elOrId) => {
    const el =
      typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
    if (!el) return null;
    el.style.display = "none";
    return el;
  };

  /* -----------------------------
     Next-step / continue-link helper

     For free tools:
       - link directly to the tool

     For pro tools:
       - href points to upgrade page
       - data-tool holds the real tool path
       - app.js intercepts unlocked clicks and routes correctly
  ----------------------------- */

  ToolFlow.setNext = (linkOrId, config = {}) => {
    const link =
      typeof linkOrId === "string"
        ? document.getElementById(linkOrId)
        : linkOrId;

    if (!link) return null;

    const category =
      ToolFlow.cleanSlug(config.category) || ToolFlow.currentCategory;

    const slug = ToolFlow.cleanSlug(config.slug);
    if (!category || !slug) return null;

    const params = { ...(config.params || {}) };
    const directHref = ToolFlow.toolHref(category, slug, params);
    const meta = ToolFlow.getToolMeta(category, slug);
    const isPro = meta?.tier === "pro";

    if (isPro) {
      link.href = ToolFlow.upgradeHref(category);
      link.dataset.tool = directHref;
      link.dataset.category = category;
      link.classList.add("tool-row", "pro");
    } else {
      link.href = directHref;
      link.dataset.tool = "";
      link.dataset.category = category;
      link.classList.remove("tool-row", "pro");
    }

    if (config.showRow) {
      ToolFlow.show(config.showRow, config.showDisplay || "flex");
    } else if (link.parentElement && config.revealParent !== false) {
      link.parentElement.style.display = config.showDisplay || "flex";
    }

    return link;
  };

  /* -----------------------------
     Public API
  ----------------------------- */

  window.SL_FLOW = ToolFlow;
  window.ToolFlow = ToolFlow;
})();