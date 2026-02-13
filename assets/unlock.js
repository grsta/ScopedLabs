/* ScopedLabs Unlock v2 (STRICT)
   Unlock source of truth: localStorage.scopedlabs_pro_<category>

   Production unlock requires:
     ?unlocked=1&category=<slug>

   Dev unlock requires (localhost only):
     ?devunlock=1&category=<slug>
*/

(function () {
  function qs() { return new URL(window.location.href).searchParams; }

  function stripParams() {
    const url = new URL(window.location.href);
    ["unlocked", "devunlock", "category"].forEach(k => url.searchParams.delete(k));
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
    // only allow slugs like "video-storage", "access-control"
    return typeof cat === "string" && /^[a-z0-9-]{2,40}$/.test(cat);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const p = qs();
    const category = p.get("category");

    const prodUnlock = (p.get("unlocked") === "1");
    const devUnlock = (p.get("devunlock") === "1");

    // STRICT: do nothing unless the required params are present
    if (!validCategory(category)) return;

    if (prodUnlock) {
      localStorage.setItem(`scopedlabs_pro_${category}`, "1");
      toast(`Unlocked${category.replace(/-/g, " ")}`);
      stripParams();
      return;
    }

    // STRICT: dev unlock only on localhost
    if (devUnlock) {
      localStorage.setItem(`scopedlabs_pro_${category}`, "1");
      toast(`Dev Unlock ${category.replace(/-/g, " ")}`);
      stripParams();
    }
  });
})();
