/* ScopedLabs Unlock v3 (LOCKED-DOWN)
   Production unlock-by-URL is DISABLED.
   Only localhost may use ?devunlock=1&category=<slug>
*/

(function () {
  function qs() {
    return new URL(window.location.href).searchParams;
  }

  function stripParams() {
    const url = new URL(window.location.href);
    ["unlocked", "devunlock", "category"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, "", url.toString());
  }

  function toast(msg) {
    try {
      let host = document.getElementById("sl-toast-host");
      if (!host) {
        host = document.createElement("div");
        host.id = "sl-toast-host";
        document.body.appendChild(host);
      }
      const el = document.createElement("div");
      el.className = "sl-toast";
      el.textContent = msg;
      host.appendChild(el);
      requestAnimationFrame(() => el.classList.add("show"));
      setTimeout(() => {
        el.classList.remove("show");
        setTimeout(() => el.remove(), 250);
      }, 2200);
    } catch (_) {}
  }

  function isLocalhost() {
    const h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1";
  }

  function validCategory(cat) {
    return typeof cat === "string" && /^[a-z0-9-]{2,40}$/.test(cat);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const p = qs();
    const category = p.get("category");
    const prodUnlock = p.get("unlocked") === "1";
    const devUnlock = p.get("devunlock") === "1";

    // Never trust production unlock params.
    if (prodUnlock) {
      stripParams();
      return;
    }

    // Dev unlock is allowed only on localhost.
    if (!devUnlock) return;
    if (!isLocalhost()) {
      stripParams();
      return;
    }
    if (!validCategory(category)) {
      stripParams();
      return;
    }

    localStorage.setItem(`scopedlabs_pro_${category}`, "1");

    const existing = (localStorage.getItem("sl_unlocked_categories") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!existing.includes(category)) {
      existing.push(category);
      localStorage.setItem("sl_unlocked_categories", existing.join(","));
    }

    toast(`Dev unlock: ${category.replace(/-/g, " ")}`);
    stripParams();
  });
})();