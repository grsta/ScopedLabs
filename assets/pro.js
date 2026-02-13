// ScopedLabs Pro Gate v2
// Canonical rule: page is Pro if <body data-tier="pro">

(function () {
  function run() {
    const url = new URL(window.location.href);
    const qs = url.searchParams;
    const path = (url.pathname || "").toLowerCase();

    // -------- Category detection --------
    const isPower   = path.includes("/tools/power/");
    const isNetwork = path.includes("/tools/network/");
    const isVideo   = path.includes("/tools/video-storage/") || path.includes("/tools/video/");
    const isAccess  = path.includes("/tools/access-control/");
    const isOther   = path.includes("/tools/");

    // -------- Storage keys --------
    const KEY_POWER   = "scopedlabs_pro_power";
    const KEY_NETWORK = "scopedlabs_pro_network";
    const KEY_VIDEO   = "scopedlabs_pro_video";
    const KEY_ACCESS  = "scopedlabs_pro_access";
    const KEY_GLOBAL  = "scopedlabs_pro_all";

    // -------- Bridge: ?pro=1 (legacy/dev) --------
    if (qs.get("pro") === "1") {
      if (isPower)   localStorage.setItem(KEY_POWER, "1");
      if (isNetwork) localStorage.setItem(KEY_NETWORK, "1");
      if (isVideo)   localStorage.setItem(KEY_VIDEO, "1");
      if (isAccess)  localStorage.setItem(KEY_ACCESS, "1");
      if (!isPower && !isNetwork && !isVideo && !isAccess) {
        localStorage.setItem(KEY_GLOBAL, "1");
      }

      qs.delete("pro");
      url.search = qs.toString();
      window.history.replaceState({}, "", url.toString());
    }

    // -------- Determine if user owns Pro --------
    const hasPro =
      localStorage.getItem(KEY_GLOBAL) === "1" ||
      (isPower   && localStorage.getItem(KEY_POWER) === "1") ||
      (isNetwork && localStorage.getItem(KEY_NETWORK) === "1") ||
      (isVideo   && localStorage.getItem(KEY_VIDEO) === "1") ||
      (isAccess  && localStorage.getItem(KEY_ACCESS) === "1");

    const body = document.body;

    // -------- Determine if this PAGE is Pro --------
    const pageIsPro = body && body.dataset && body.dataset.tier === "pro";

    // -------- Gate Pro pages --------
    if (pageIsPro && !hasPro) {
      const cat =
        isPower   ? "power" :
        isNetwork ? "network" :
        isVideo   ? "video-storage" :
        isAccess  ? "access-control" :
        "pro";

      window.location.href =
        `/upgrade/?category=${encodeURIComponent(cat)}&from=${encodeURIComponent(path)}`;
      return;
    }

    // -------- Lock Pro-only buttons --------
    document.querySelectorAll("[data-pro-only]").forEach(btn => {
      if (!hasPro) {
        btn.addEventListener("click", e => {
          e.preventDefault();
          window.location.href = "/upgrade/";
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
