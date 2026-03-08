// ScopedLabs Pro Gate v3
// Canonical rule: page is Pro if <body data-tier="pro">
// Unlock source of truth: localStorage["scopedlabs_pro_<category-slug>"]

(function () {
  function run() {
    const url = new URL(window.location.href);
    const qs = url.searchParams;
    const path = (url.pathname || "").toLowerCase();

    // -------- Category detection --------
    const isPower = path.includes("/tools/power/");
    const isNetwork = path.includes("/tools/network/");
    const isVideo = path.includes("/tools/video-storage/") || path.includes("/tools/video/");
    const isAccess = path.includes("/tools/access-control/");
    const isWireless = path.includes("/tools/wireless/");
    const isThermal = path.includes("/tools/thermal/");
    const isInfrastructure = path.includes("/tools/infrastructure/");
    const isPerformance = path.includes("/tools/performance/");
    const isPhysical = path.includes("/tools/physical-security/");
    const isCompute = path.includes("/tools/compute/");

    // -------- Current category slug --------
    const cat =
      isPower ? "power" :
      isNetwork ? "network" :
      isVideo ? "video-storage" :
      isAccess ? "access-control" :
      isWireless ? "wireless" :
      isThermal ? "thermal" :
      isInfrastructure ? "infrastructure" :
      isPerformance ? "performance" :
      isPhysical ? "physical-security" :
      isCompute ? "compute" :
      null;

    // -------- Canonical storage key --------
    const KEY_GLOBAL = "scopedlabs_pro_all";
    const categoryKey = cat ? `scopedlabs_pro_${cat}` : null;

    // -------- Bridge: ?pro=1 (legacy/dev) --------
    if (qs.get("pro") === "1") {
      if (categoryKey) {
        localStorage.setItem(categoryKey, "1");
      } else {
        localStorage.setItem(KEY_GLOBAL, "1");
      }

      qs.delete("pro");
      url.search = qs.toString();
      window.history.replaceState({}, "", url.toString());
    }

    // -------- Determine if user owns Pro --------
    const hasPro =
      localStorage.getItem(KEY_GLOBAL) === "1" ||
      (categoryKey && localStorage.getItem(categoryKey) === "1");

    const body = document.body;

    // -------- Determine if this PAGE is Pro --------
    const pageIsPro = body && body.dataset && body.dataset.tier === "pro";

    // -------- Gate direct visits to Pro pages --------
    if (pageIsPro && !hasPro) {
      const fallbackCat = cat || "pro";
      window.location.href =
        `/upgrade/?category=${encodeURIComponent(fallbackCat)}#checkout`;
      return;
    }

    // -------- Lock Pro-only buttons / links --------
    document.querySelectorAll("[data-pro-only]").forEach((btn) => {
      if (!hasPro) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const fallbackCat = cat || "pro";
          window.location.href =
            `/upgrade/?category=${encodeURIComponent(fallbackCat)}#checkout`;
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();