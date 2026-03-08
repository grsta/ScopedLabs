// /assets/pro.js
// ScopedLabs Pro Gate - server-backed version

(function () {
  "use strict";

  function cleanSlug(value) {
    if (!value) return null;
    return String(value).trim().toLowerCase().replace(/\s+/g, "-");
  }

  function detectCategoryFromPath(pathname) {
    const path = (pathname || "").toLowerCase();

    if (path.includes("/tools/access-control/")) return "access-control";
    if (path.includes("/tools/compute/")) return "compute";
    if (path.includes("/tools/infrastructure/")) return "infrastructure";
    if (path.includes("/tools/network/")) return "network";
    if (path.includes("/tools/performance/")) return "performance";
    if (path.includes("/tools/physical-security/")) return "physical-security";
    if (path.includes("/tools/power/")) return "power";
    if (path.includes("/tools/thermal/")) return "thermal";
    if (path.includes("/tools/video-storage/")) return "video-storage";
    if (path.includes("/tools/wireless/")) return "wireless";

    return null;
  }

  async function getSession() {
    const auth = window.SL_AUTH;
    if (!auth) return null;

    if (auth.ready && typeof auth.ready.then === "function") {
      try {
        await auth.ready;
      } catch {}
    }

    if (auth.__session) return auth.__session;
    if (auth.sb && auth.sb.auth && auth.sb.auth.getSession) {
      try {
        const { data } = await auth.sb.auth.getSession();
        return data?.session || null;
      } catch {
        return null;
      }
    }

    return null;
  }

  async function hasUnlock(category) {
    const session = await getSession();
    if (!session?.access_token) return false;

    try {
      const resp = await fetch(`/api/unlocks/has?category=${encodeURIComponent(category)}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const data = await resp.json().catch(() => null);
      return !!(resp.ok && data && data.ok && data.has);
    } catch {
      return false;
    }
  }

  async function run() {
    const body = document.body;
    const pageIsPro = body?.dataset?.tier === "pro";
    if (!pageIsPro) return;

    const category =
      cleanSlug(body?.dataset?.category) ||
      detectCategoryFromPath(window.location.pathname);

    if (!category) return;

    const unlocked = await hasUnlock(category);
    if (unlocked) return;

    window.location.href = `/upgrade/?category=${encodeURIComponent(category)}#checkout`;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();