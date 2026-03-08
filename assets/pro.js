// ScopedLabs Pro Gate v4
// Canonical unlock key:
//   localStorage["scopedlabs_pro_<category-slug>"] = "1"

(function () {
  function detectCategory(path) {
    path = (path || "").toLowerCase();

    if (path.includes("/tools/power/")) return "power";
    if (path.includes("/tools/network/")) return "network";
    if (path.includes("/tools/video-storage/") || path.includes("/tools/video/")) return "video-storage";
    if (path.includes("/tools/access-control/")) return "access-control";
    if (path.includes("/tools/wireless/")) return "wireless";
    if (path.includes("/tools/thermal/")) return "thermal";
    if (path.includes("/tools/infrastructure/")) return "infrastructure";
    if (path.includes("/tools/performance/")) return "performance";
    if (path.includes("/tools/physical-security/")) return "physical-security";
    if (path.includes("/tools/compute/")) return "compute";

    return null;
  }

  function run() {
    const url = new URL(window.location.href);
    const qs = url.searchParams;
    const path = (url.pathname || "").toLowerCase();
    const cat = detectCategory(path);

    const KEY_GLOBAL = "scopedlabs_pro_all";
    const KEY_CAT = cat ? `scopedlabs_pro_${cat}` : null;

    // legacy/dev bridge
    if (qs.get("pro") === "1") {
      if (KEY_CAT) {
        localStorage.setItem(KEY_CAT, "1");
      } else {
        localStorage.setItem(KEY_GLOBAL, "1");
      }
      qs.delete("pro");
      url.search = qs.toString();
      window.history.replaceState({}, "", url.toString());
    }

    const hasPro =
      localStorage.getItem(KEY_GLOBAL) === "1" ||
      (KEY_CAT && localStorage.getItem(KEY_CAT) === "1");

    const body = document.body;
    const pageIsPro = !!(body && body.dataset && body.dataset.tier === "pro");

    if (pageIsPro && !hasPro) {
      const fallbackCat = cat || "pro";
      window.location.href = `/upgrade/?category=${encodeURIComponent(fallbackCat)}#checkout`;
      return;
    }

    document.querySelectorAll("[data-pro-only]").forEach((btn) => {
      if (!hasPro) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const fallbackCat = cat || "pro";
          window.location.href = `/upgrade/?category=${encodeURIComponent(fallbackCat)}#checkout`;
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