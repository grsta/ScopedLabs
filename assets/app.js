/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Goals:
   - Keep "current category" in sync between:
     URL ?category=, localStorage(sl_selected_category), and UI label(s)
   - Bind all category unlock buttons/links (data-category OR id sl-unlock-<cat> OR href ?category=)
   - Routing rules:
       * If signed in: clicking a category unlock goes straight to /upgrade/checkout/?category=CAT
       * If NOT signed in: clicking a category unlock goes to /upgrade/?category=CAT#checkout
   - Checkout page:
       * Requires a valid session
       * Checkout button calls /api/create-checkout-session
*/

/* /assets/app.js */

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");
  const STORAGE_KEY = "sl_selected_category";

  const sb = () => (window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null);
  const ready = () => (window.SL_AUTH && window.SL_AUTH.ready ? window.SL_AUTH.ready : Promise.resolve());

  const CATEGORY_DEFS = {
    power: {
      title: "Power",
      desc: "UPS runtime, battery bank sizing, generator headroom, and redundancy planning.",
      bullets: [
        "UPS runtime + load growth modeling",
        "Battery bank sizer",
        "Generator capacity planning"
      ]
    },
    network: {
      title: "Network & Throughput",
      desc: "Bandwidth budgets, latency envelopes, uplink sizing and oversubscription modeling.",
      bullets: [
        "Bandwidth planner",
        "Latency budget calculator",
        "Oversubscription estimator"
      ]
    },
    video: {
      title: "Video & Storage",
      desc: "Retention modeling, bitrate math, RAID impact, and storage planning.",
      bullets: [
        "Storage calculator",
        "Retention planner",
        "RAID impact estimator"
      ]
    },
    infrastructure: {
      title: "Infrastructure",
      desc: "Rack power, PoE budgets, redundancy modeling, and deployment headroom.",
      bullets: [
        "Rack power estimator",
        "PoE budget planner",
        "Redundancy planning tools"
      ]
    },
    compute: {
      title: "Compute",
      desc: "Workload sizing, headroom modeling, and compute growth planning.",
      bullets: [
        "Compute capacity estimator",
        "Virtualization density planner",
        "CPU + memory growth modeling"
      ]
    },
    performance: {
      title: "Performance",
      desc: "System bottleneck detection and throughput modeling.",
      bullets: [
        "Throughput modeling",
        "Bottleneck estimator",
        "Performance margin calculator"
      ]
    },
    physical: {
      title: "Physical Security",
      desc: "Deployment modeling for field hardware and site planning.",
      bullets: [
        "Coverage estimators",
        "Hardware capacity planning",
        "Deployment scaling tools"
      ]
    },
    thermal: {
      title: "Thermal",
      desc: "Heat load estimation and cooling envelope planning.",
      bullets: [
        "Thermal load estimator",
        "Cooling margin planner",
        "Rack heat modeling"
      ]
    },
    "access-control": {
      title: "Access Control",
      desc: "Controller sizing, door hardware modeling, and credential planning.",
      bullets: [
        "Controller expansion modeling",
        "Door hardware capacity planning",
        "Credential format planning"
      ]
    }
  };

  let currentCategory = null;
  let currentSession = null;

  /* -------------------------- */
  /* Helpers                    */
  /* -------------------------- */

  function normalize(cat) {
    return cat ? String(cat).trim().toLowerCase() : null;
  }

  function qs(name) {
    try { return new URLSearchParams(location.search).get(name); }
    catch { return null; }
  }

  function setStored(cat) {
    if (cat) localStorage.setItem(STORAGE_KEY, cat);
    else localStorage.removeItem(STORAGE_KEY);
  }

  function getStored() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function setUrl(cat) {
    const u = new URL(location.href);
    if (cat) u.searchParams.set("category", cat);
    else u.searchParams.delete("category");
    history.replaceState({}, "", u.toString());
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* -------------------------- */
  /* Auth UI                    */
  /* -------------------------- */

  function setSignedInUI(isSignedIn, email) {
    const show = (id, on) => {
      const el = document.getElementById(id);
      if (el) el.style.display = on ? "" : "none";
    };

    show("sl-continue", isSignedIn);
    show("sl-account", isSignedIn);
    show("sl-signout", isSignedIn);

    show("sl-email", !isSignedIn);
    show("sl-sendlink", !isSignedIn);

    const hint = document.getElementById("sl-login-hint");
    if (hint) {
      hint.textContent = isSignedIn
        ? (email ? `Signed in as ${email}` : "Signed in")
        : "Sign in to purchase (magic link — no password)";
    }
  }

  async function refreshAuth() {
    setSignedInUI(false, "");

    const client = sb();
    if (!client) return;

    try { await ready(); } catch {}

    try {
      const { data } = await client.auth.getSession();
      currentSession = data?.session || null;
      const email = currentSession?.user?.email || "";
      setSignedInUI(!!currentSession, email);
    } catch {
      setSignedInUI(false, "");
    }
  }

  function attachAuthListener() {
    const client = sb();
    if (!client) return;

    ready().then(() => {
      client.auth.onAuthStateChange((_evt, session) => {
        currentSession = session || null;
        const email = session?.user?.email || "";
        setSignedInUI(!!session, email);
        updateCategoryUI();
      });
    });
  }

  /* -------------------------- */
  /* Category UI                */
  /* -------------------------- */

  function renderPreview() {
    const mount =
      document.getElementById("sl-selected-category-preview") ||
      document.getElementById("sl-selected-category-preview-checkout");

    if (!mount) return;

    const def = CATEGORY_DEFS[currentCategory];
    if (!def) {
      mount.innerHTML = "";
      return;
    }

    mount.innerHTML = `
      <div class="card">
        <div class="pill" style="margin-bottom:10px;">Preview</div>
        <h3>${escapeHtml(def.title)}</h3>
        <p class="muted">${escapeHtml(def.desc)}</p>
        <ul class="muted">
          ${def.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  function updateCategoryUI() {
    const pill = document.getElementById("sl-selected-category");
    const label = document.getElementById("sl-selected-category-label");

    if (pill) pill.textContent = currentCategory || "None";
    if (label) label.textContent = currentCategory || "None selected";

    renderPreview();

    const checkoutBtn = document.getElementById("sl-checkout");
    if (checkoutBtn) checkoutBtn.disabled = !currentCategory || !currentSession;
  }

  function selectCategory(cat) {
    currentCategory = normalize(cat);
    setStored(currentCategory);
    setUrl(currentCategory);
    updateCategoryUI();
  }

  function goToCheckout(cat) {
    selectCategory(cat);

    if (currentSession) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(cat);
    } else {
      location.href = "/upgrade/?category=" + encodeURIComponent(cat) + "#checkout";
    }
  }

  /* -------------------------- */
  /* Bindings                   */
  /* -------------------------- */

  function bindCategoryCards() {
    document.querySelectorAll("[data-category-card]").forEach(card => {
      card.addEventListener("click", () => {
        const cat = card.getAttribute("data-category-card");
        if (cat) selectCategory(cat);
      });
    });

    document.querySelectorAll("[data-category]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const cat = btn.getAttribute("data-category");
        if (cat) goToCheckout(cat);
      });
    });
  }

  /* -------------------------- */
  /* Init                       */
  /* -------------------------- */

  async function init() {
    currentCategory = normalize(qs("category")) || normalize(getStored());
    if (currentCategory) {
      setStored(currentCategory);
      setUrl(currentCategory);
    }

    bindCategoryCards();
    await refreshAuth();
    updateCategoryUI();
  }

  document.addEventListener("DOMContentLoaded", () => {
    attachAuthListener();
    init();
  });

  window.addEventListener("pageshow", () => {
    attachAuthListener();
    init();
  });

})();