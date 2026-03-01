/* /assets/app.js
   ScopedLabs Account/Upgrade controller (Hybrid Option A).

   Goals:
   - Category selection stays stable (URL + localStorage)
   - Auth UI stable (no duplicate listeners on BFCache)
   - Start Stripe Checkout from THIS page (no separate checkout hop)
*/

(() => {
  "use strict";

  const STORAGE_KEY = "sl_selected_category";

  const getSb = () => (window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null);
  const ready = () =>
    window.SL_AUTH && window.SL_AUTH.ready ? window.SL_AUTH.ready : Promise.resolve();

  const CATEGORY_DEFS = {
    "access-control": {
      title: "Access Control",
      desc: "Door hardware, credential formats, PoE power budgets, and deployment planning.",
      bullets: [
        "Controller sizing + expansion planning",
        "Power & cabling headroom checks",
        "Fail-safe / fail-secure impact modeling",
      ],
    },
    compute: {
      title: "Compute",
      desc: "Server sizing, workload estimates, and resource headroom planning.",
      bullets: [
        "Capacity planning (CPU/RAM/IO)",
        "Growth projections + utilization targets",
        "Performance vs. cost trade-offs",
      ],
    },
    infrastructure: {
      title: "Infrastructure",
      desc: "Power chain planning, rack/room constraints, and deployment readiness checks.",
      bullets: [
        "Rack density & load planning",
        "Power/space/cooling constraint checks",
        "Failure impact + contingency planning",
      ],
    },
    network: {
      title: "Network & Throughput",
      desc: "Bandwidth planning, latency budgets, and congestion headroom.",
      bullets: ["Oversubscription analysis", "Latency budget calculators", "Uplink capacity planning"],
    },
    performance: {
      title: "Performance",
      desc: "Sizing targets, efficiency assumptions, and stress-test planning tools.",
      bullets: ["Baseline vs. peak load modeling", "Headroom targets + scenario tests", "Risk checks for bottlenecks"],
    },
    "physical-security": {
      title: "Physical Security",
      desc: "Coverage planning, deployment assumptions, and survivability checks.",
      bullets: ["Coverage + risk trade-off planners", "Storage/runtime survivability checks", "Operational readiness scoring"],
    },
    power: {
      title: "Power & Runtime",
      desc: "UPS sizing, runtime margin, redundancy, and failure planning.",
      bullets: ["Load growth simulation (staged adds over time)", "Redundancy / N+1 impact modeling", "Worst-case runtime stress tests"],
    },
    thermal: {
      title: "Thermal",
      desc: "Heat load planning, airflow assumptions, and environment constraints.",
      bullets: ["BTU/Watt conversion helpers", "Room/rack thermal planning", "Cooling headroom checks"],
    },
    "video-storage": {
      title: "Video & Storage",
      desc: "Retention planning, storage survivability, and failure behavior.",
      bullets: ["Advanced storage planning scenarios", "RAID impact + rebuild risk", "Retention survivability modeling"],
    },
    wireless: {
      title: "Wireless",
      desc: "Link planning, channel assumptions, and reliability headroom.",
      bullets: ["Link budget & margin checks", "Coverage + capacity planning", "Interference risk helpers"],
    },
  };

  let currentCategory = null;
  let currentSession = null;

  // ---------- util ----------
  function normalizeCategory(cat) {
    if (!cat) return null;
    const c = String(cat).trim().toLowerCase();
    return c || null;
  }

  function qs(name) {
    try {
      return new URLSearchParams(location.search).get(name);
    } catch {
      return null;
    }
  }

  function setUrlCategory(cat) {
    const u = new URL(location.href);
    if (cat) u.searchParams.set("category", cat);
    else u.searchParams.delete("category");
    history.replaceState({}, "", u.toString());
  }

  function setStoredCategory(cat) {
    try {
      if (cat) localStorage.setItem(STORAGE_KEY, cat);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  function getStoredCategory() {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  }

  function readCategory() {
    return normalizeCategory(qs("category")) || normalizeCategory(getStoredCategory());
  }

  function extractCategoryFromHref(href) {
    if (!href || !href.includes("category=")) return "";
    try {
      const u = new URL(href, location.origin);
      return (u.searchParams.get("category") || "").trim();
    } catch {
      const m = href.match(/[?&]category=([^&#]+)/);
      return m ? decodeURIComponent(m[1]) : "";
    }
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function show(id, on) {
    const el = document.getElementById(id);
    if (el) el.style.display = on ? "" : "none";
  }

  function setStatus(msg) {
    const el = document.getElementById("sl-status");
    if (el) el.textContent = msg || "";
  }

  // ---------- preview ----------
  function renderPreview() {
    const def = CATEGORY_DEFS[currentCategory] || null;

    const title = def ? def.title : currentCategory ? currentCategory : "Category";
    const desc = def ? def.desc : "Choose a category to see what you’ll unlock.";
    const bullets = def
      ? def.bullets
      : ["Pick a lane to unlock Pro tools.", "One-time purchase per category.", "Entitlements are account-based (no link sharing)."];

    setText("sl-preview-title", title);
    const descEl = document.getElementById("sl-preview-desc");
    if (descEl) descEl.textContent = desc;

    const ul = document.getElementById("sl-preview-bullets");
    if (ul) {
      ul.innerHTML = "";
      bullets.forEach((b) => {
        const li = document.createElement("li");
        li.textContent = b;
        ul.appendChild(li);
      });
    }
  }

  function updateCategoryUI() {
    setText("sl-category-pill", currentCategory || "None");
    setText("sl-selected-category-label", currentCategory || "None selected");
    renderPreview();
  }

  function writeCategory(cat) {
    const c = normalizeCategory(cat);
    if (!c) return;
    currentCategory = c;
    setStoredCategory(c);
    setUrlCategory(c);
    updateCategoryUI();
  }

  // ---------- auth UI ----------
  function setSignedInUI(isSignedIn, email) {
    show("sl-continue", true); // button exists; we gate behavior in handler
    show("sl-account", isSignedIn);
    show("sl-signout", isSignedIn);

    show("sl-email", !isSignedIn);
    show("sl-sendlink", !isSignedIn);

    const hint = document.getElementById("sl-login-hint");
    if (hint) {
      hint.textContent = isSignedIn
        ? email
          ? `Signed in as ${email}`
          : "Signed in"
        : "Sign in to purchase (magic link — no password)";
    }

    setText("sl-signedin", isSignedIn ? (email ? `Signed in as ${email}` : "Signed in") : "");
  }

  async function refreshAuth() {
    setSignedInUI(false, "");
    currentSession = null;

    const client = getSb();
    if (!client) return;

    try {
      await ready();
      const { data } = await client.auth.getSession();
      currentSession = data?.session || null;
      const email = currentSession?.user?.email || "";
      setSignedInUI(!!currentSession, email);
    } catch {
      setSignedInUI(false, "");
      currentSession = null;
    }
  }

  function attachAuthListenerOnce() {
    if (window.__SL_APP_AUTH_SUBBED) return;
    window.__SL_APP_AUTH_SUBBED = true;

    const client = getSb();
    if (!client) return;

    ready().then(() => {
      client.auth.onAuthStateChange((_evt, session) => {
        currentSession = session || null;
        const email = session?.user?.email || "";
        setSignedInUI(!!session, email);
      });
    });
  }

  // ---------- checkout (Hybrid A: start Stripe from this page) ----------
  async function startCheckout() {
    setStatus("");

    const cat = currentCategory || readCategory();
    if (!cat) {
      setStatus("Choose a category to continue.");
      return;
    }

    if (!currentSession) {
      setStatus("Sign in first, then click Continue.");
      try {
        const sec = document.getElementById("checkout");
        if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
      return;
    }

    const contBtn =
      document.getElementById("sl-continue") ||
      document.getElementById("sl-checkout");
    if (contBtn) contBtn.disabled = true;

    try {
      setStatus("Opening Stripe Checkout…");

      // IMPORTANT: Worker is mounted at /api/*
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: currentCategory,
          email: currentSession.user.email,
          user_id: currentSession.user.id,
        }),
      });

      if (!res.ok) throw new Error("bad_status_" + res.status);
      const data = await res.json();
      if (!data || !data.url) throw new Error("missing_url");

      location.href = data.url;
    } catch (e) {
      console.error("[app.js] startCheckout failed", e);
      setStatus("Failed to start checkout. Try again.");
      if (contBtn) contBtn.disabled = false;
    }
  }

  // ---------- click bindings (bind ONCE) ----------
  function bindClicksOnce() {
    if (window.__SL_APP_CLICKS_BOUND) return;
    window.__SL_APP_CLICKS_BOUND = true;

    document.querySelectorAll(".upgrade-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        const a = e.target && e.target.closest ? e.target.closest("a[href*='category=']") : null;
        if (a) return;
        const link = card.querySelector("a[href*='category=']");
        const cat = link ? extractCategoryFromHref(link.getAttribute("href")) : "";
        if (cat) writeCategory(cat);
      });
    });

    document.querySelectorAll("a[href*='?category='], a[href*='&category=']").forEach((a) => {
      a.addEventListener("click", () => {
        const href = a.getAttribute("href") || "";
        const cat = extractCategoryFromHref(href);
        if (cat) writeCategory(cat);
      });
    });

    const changeBtn = document.getElementById("sl-change-category");
    if (changeBtn) {
      changeBtn.addEventListener("click", () => {
        const sec = document.getElementById("categories");
        if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth", block: "start" });
        location.hash = "#categories";
      });
    }

    const contBtn =
      document.getElementById("sl-continue") ||
      document.getElementById("sl-checkout");
    if (contBtn) {
      contBtn.addEventListener("click", (e) => {
        e.preventDefault();
        startCheckout();
      });
    }
  }

  // ---------- init ----------
  async function initOnce() {
    if (window.__SL_APP_INIT_DONE) return;
    window.__SL_APP_INIT_DONE = true;

    const cat = readCategory();
    if (cat) writeCategory(cat);
    else updateCategoryUI();

    bindClicksOnce();
    attachAuthListenerOnce();
    await refreshAuth();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOnce);
  } else {
    initOnce();
  }

  window.addEventListener("pageshow", () => {
    const cat = readCategory();
    if (cat) writeCategory(cat);
    else updateCategoryUI();
    refreshAuth();
  });
})();