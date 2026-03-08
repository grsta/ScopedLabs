// ScopedLabs Pro Gate v3
// Canonical rule: page is Pro if <body data-tier="pro">

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
      "pro";

    // -------- Storage keys --------
    const KEY_POWER = "scopedlabs_pro_power";
    const KEY_NETWORK = "scopedlabs_pro_network";
    const KEY_VIDEO = "scopedlabs_pro_video";
    const KEY_ACCESS = "scopedlabs_pro_access";
    const KEY_WIRELESS = "scopedlabs_pro_wireless";
    const KEY_THERMAL = "scopedlabs_pro_thermal";
    const KEY_INFRA = "scopedlabs_pro_infrastructure";
    const KEY_PERF = "scopedlabs_pro_performance";
    const KEY_PHYSICAL = "scopedlabs_pro_physical_security";
    const KEY_COMPUTE = "scopedlabs_pro_compute";
    const KEY_GLOBAL = "scopedlabs_pro_all";

    // -------- Bridge: ?pro=1 (legacy/dev) --------
    if (qs.get("pro") === "1") {
      if (isPower) localStorage.setItem(KEY_POWER, "1");
      if (isNetwork) localStorage.setItem(KEY_NETWORK, "1");
      if (isVideo) localStorage.setItem(KEY_VIDEO, "1");
      if (isAccess) localStorage.setItem(KEY_ACCESS, "1");
      if (isWireless) localStorage.setItem(KEY_WIRELESS, "1");
      if (isThermal) localStorage.setItem(KEY_THERMAL, "1");
      if (isInfrastructure) localStorage.setItem(KEY_INFRA, "1");
      if (isPerformance) localStorage.setItem(KEY_PERF, "1");
      if (isPhysical) localStorage.setItem(KEY_PHYSICAL, "1");
      if (isCompute) localStorage.setItem(KEY_COMPUTE, "1");

      if (
        !isPower && !isNetwork && !isVideo && !isAccess &&
        !isWireless && !isThermal && !isInfrastructure &&
        !isPerformance && !isPhysical && !isCompute
      ) {
        localStorage.setItem(KEY_GLOBAL, "1");
      }

      qs.delete("pro");
      url.search = qs.toString();
      window.history.replaceState({}, "", url.toString());
    }

    // -------- Determine if user owns Pro --------
    const hasPro =
      localStorage.getItem(KEY_GLOBAL) === "1" ||
      (isPower && localStorage.getItem(KEY_POWER) === "1") ||
      (isNetwork && localStorage.getItem(KEY_NETWORK) === "1") ||
      (isVideo && localStorage.getItem(KEY_VIDEO) === "1") ||
      (isAccess && localStorage.getItem(KEY_ACCESS) === "1") ||
      (isWireless && localStorage.getItem(KEY_WIRELESS) === "1") ||
      (isThermal && localStorage.getItem(KEY_THERMAL) === "1") ||
      (isInfrastructure && localStorage.getItem(KEY_INFRA) === "1") ||
      (isPerformance && localStorage.getItem(KEY_PERF) === "1") ||
      (isPhysical && localStorage.getItem(KEY_PHYSICAL) === "1") ||
      (isCompute && localStorage.getItem(KEY_COMPUTE) === "1");

    const body = document.body;

    // -------- Determine if this PAGE is Pro --------
    const pageIsPro = body && body.dataset && body.dataset.tier === "pro";

    // -------- Gate direct visits to Pro pages --------
    if (pageIsPro && !hasPro) {
      window.location.href =
        `/upgrade/?category=${encodeURIComponent(cat)}#checkout`;
      return;
    }

    // -------- Lock Pro-only buttons / links --------
    document.querySelectorAll("[data-pro-only]").forEach((btn) => {
      if (!hasPro) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.location.href =
            `/upgrade/?category=${encodeURIComponent(cat)}#checkout`;
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