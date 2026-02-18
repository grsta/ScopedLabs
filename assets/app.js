/* /assets/app.js
   ScopedLabs Upgrade + Checkout controller

   - Keeps current category in sync: URL ?category=  <-> localStorage(sl_selected_category)
   - Renders preview card on /upgrade checkout section
   - On /upgrade/checkout:
       * shows signed-in email
       * enables Checkout / Sign out buttons when session exists
       * wires "Choose a different category" button
   - Listens for auth event: window event "sl:session"
*/

(() => {
  "use strict";

  const LS_KEY = "sl_selected_category";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");
  const IS_UPGRADE_PAGE = location.pathname.startsWith("/upgrade") && !IS_CHECKOUT_PAGE;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeSlug(v) {
    return (v || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function getCategoryFromUrl() {
    const u = new URL(location.href);
    return safeSlug(u.searchParams.get("category") || "");
  }

  function setCategoryInUrl(cat) {
    const u = new URL(location.href);
    if (cat) u.searchParams.set("category", cat);
    else u.searchParams.delete("category");
    history.replaceState({}, document.title, u.toString());
  }

  function getStoredCategory() {
    try {
      return safeSlug(localStorage.getItem(LS_KEY) || "");
    } catch {
      return "";
    }
  }

  function storeCategory(cat) {
    try {
      localStorage.setItem(LS_KEY, cat || "");
    } catch {}
  }

  function currentCategory() {
    return getCategoryFromUrl() || getStoredCategory() || "";
  }

  // --- Category metadata (preview card) ---
  // Keep this minimal; only the essentials you already show.
  const CATEGORY_META = {
    compute: {
      title: "Compute",
      desc: "Server sizing, workload estimates, and resource headroom planning.",
      bullets: ["Capacity planning (CPU/RAM/IO)", "Growth projections", "Performance vs cost trade-offs"],
    },
    wireless: {
      title: "Wireless",
      desc: "Link planning, channel assumptions, and reliability headroom.",
      bullets: ["Link budget & margin checks", "Coverage + capacity planning", "Interference risk helpers"],
    },
    thermal: {
      title: "Thermal",
      desc: "Heat load planning, airflow assumptions, and environment constraints.",
      bullets: ["BTU/Watt conversion helpers", "Room/rack thermal planning", "Cooling headroom checks"],
    },
    "access-control": {
      title: "Access Control",
      desc: "Door hardware, credential formats, PoE power budgets, and deployment planning.",
      bullets: ["Controller sizing", "Power/cabling headroom", "Fail-safe impact modeling"],
    },
    "physical-security": {
      title: "Physical Security",
      desc: "Threat modeling basics, site hardening planning, and checklist helpers.",
      bullets: ["Zone planning", "Policy checklists", "Risk scoring"],
    },
    performance: {
      title: "Performance",
      desc: "Latency, throughput, and headroom planning across systems.",
      bullets: ["Latency budget checks", "Queueing headroom", "SLO sanity helpers"],
    },
  };

  function metaFor(cat) {
    const c = safeSlug(cat);
    return (
      CATEGORY_META[c] || {
        title: c ? c.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Category",
        desc: "Unlock Pro tools for the selected category.",
        bullets: [],
      }
    );
  }

  // --- Elements (upgrade page) ---
  const els = {
    // pills / labels
    catPill: () => $("#selected-category") || $("#sl-category-pill") || $("#sl-selected-category"),

    // upgrade page buttons / preview container
    changeOnUpgrade: () => $("#sl-change-category-upgrade") || $("#sl-change-category"),
    checkoutSection: () => $("#checkout") || $("#sl-checkout-section"),
    previewHost: () => $("#sl-preview-host") || $("#sl-preview") || $("#sl-checkout-preview"),

    // login related (upgrade page)
    signedAs: () => $("#sl-signedas") || $("#sl-signed-in-as"),
    status: () => $("#sl-status") || $("#sl-auth-status") || $("#status"),

    // checkout page controls
    checkoutBtn: () => $("#sl-checkout"),
    signoutBtn: () => $("#sl-signout") || $("#sl-logout"),
    changeOnCheckout: () => $("#sl-change-category"),
  };

  function setText(el, txt) {
    if (!el) return;
    el.textContent = txt || "";
  }

  function setStatus(msg) {
    const st = els.status();
    if (!st) return;
    st.textContent = msg || "";
  }

  function ensurePreviewHost() {
    let host = els.previewHost();
    if (host) return host;

    // If your HTML doesn't have a dedicated host, we create one inside the checkout card.
    const section = els.checkoutSection();
    if (!section) return null;

    // Try to find the checkout "card" container
    const card = section.querySelector(".card") || section.querySelector(".tool-card") || section;
    host = document.createElement("div");
    host.id = "sl-preview-host";
    host.style.minWidth = "280px";
    host.style.maxWidth = "420px";
    host.style.marginLeft = "18px";
    host.style.flex = "1";
    // we'll rely on your existing card layout; just place it after the left block if possible
    card.appendChild(host);
    return host;
  }

  function renderPreviewCard(cat) {
    if (!IS_UPGRADE_PAGE) return;

    const host = ensurePreviewHost();
    if (!host) return;

    const m = metaFor(cat);

    host.innerHTML = `
      <div class="card" style="height: 100%;">
        <div class="pill pill-pro" style="display:inline-flex; gap:.5rem; align-items:center;">
          <span aria-hidden="true">🔒</span>
          <span>Pro — Category Unlock</span>
        </div>
        <h3 style="margin-top:12px;">${escapeHtml(m.title)}</h3>
        <p class="muted" style="margin-top:8px;">${escapeHtml(m.desc)}</p>
        ${
          m.bullets && m.bullets.length
            ? `<div class="muted" style="margin-top:12px; font-weight:600;">Includes examples like:</div>
               <ul style="margin-top:8px; padding-left: 18px;">
                 ${m.bullets.map((b) => `<li class="muted">${escapeHtml(b)}</li>`).join("")}
               </ul>`
            : ""
        }
        <div class="muted" style="margin-top:10px;">
          You'll also receive future Pro tools added to <em>${escapeHtml(m.title)}</em>.
        </div>
      </div>
    `;
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, (c) => {
      switch (c) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#039;";
        default:
          return c;
      }
    });
  }

  function syncCategoryEverywhere() {
    const cat = currentCategory();

    if (cat) {
      storeCategory(cat);
      setCategoryInUrl(cat);
    }

    const pill = els.catPill();
    if (pill) setText(pill, cat || "None selected");

    // Also update any inline "selected category" chips you may have (common pattern)
    $$("[data-sl-selected-category]").forEach((n) => setText(n, cat || "None selected"));

    renderPreviewCard(cat);
    return cat;
  }

  // --- Navigation: Change Category ---
  function goToCategoriesReturnCheckout() {
    const cat = encodeURIComponent(currentCategory() || "");
    location.href = `/upgrade/?return=checkout&category=${cat}#categories`;
  }

  function wireChangeCategoryButtons() {
    // Upgrade page change category: allowed (sends you to category section)
    const up = els.changeOnUpgrade();
    if (up) {
      up.addEventListener("click", (e) => {
        e.preventDefault();
        goToCategoriesReturnCheckout();
      });
    }

    // Checkout page change category: MUST work (you pointed this out)
    const co = els.changeOnCheckout();
    if (co) {
      co.addEventListener("click", (e) => {
        e.preventDefault();
        goToCategoriesReturnCheckout();
      });
    }
  }

  // --- Session / UI state (both pages) ---
  let currentSession = null;

  function applySessionToUI(session) {
    currentSession = session || null;

    const signed = els.signedAs();
    if (signed) {
      if (currentSession && currentSession.user && currentSession.user.email) {
        signed.textContent = `Signed in as ${currentSession.user.email}`;
      } else {
        signed.textContent = "";
      }
    }

    // On checkout page, buttons should appear/enable when signed in
    if (IS_CHECKOUT_PAGE) {
      const checkoutBtn = els.checkoutBtn();
      const signoutBtn = els.signoutBtn();

      if (checkoutBtn) checkoutBtn.style.display = currentSession ? "" : "none";
      if (signoutBtn) signoutBtn.style.display = currentSession ? "" : "none";
    }

    // On upgrade page, we still want a visible “Signed in as …” line + status updates.
    if (IS_UPGRADE_PAGE) {
      if (currentSession && currentSession.user && currentSession.user.email) {
        setStatus(`Signed in as ${currentSession.user.email}`);
      }
    }
  }

  async function initSessionFromAuth() {
    const auth = window.SL_AUTH;
    if (!auth || !auth.ready) return;

    try {
      const s = await auth.ready;
      applySessionToUI(s);
    } catch {
      // auth.js already reports status
    }
  }

  // Listen for auth event
  window.addEventListener("sl:session", (ev) => {
    const s = ev && ev.detail ? ev.detail.session : null;
    applySessionToUI(s);
  });

  // --- Checkout button wiring (checkout page only) ---
  function wireCheckoutButton() {
    if (!IS_CHECKOUT_PAGE) return;

    const btn = els.checkoutBtn();
    if (!btn) return;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();

      if (!currentSession || !currentSession.user || !currentSession.user.email) {
        setStatus("Please sign in to continue.");
        return;
      }

      const cat = currentCategory();
      if (!cat) {
        setStatus("Choose a category to continue.");
        return;
      }

      btn.disabled = true;
      setStatus("Opening Stripe Checkout…");

      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: cat,
            email: currentSession.user.email,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (!data || !data.url) throw new Error("Missing checkout URL");

        location.href = data.url;
      } catch (err) {
        console.warn("[SL_APP] checkout error", err);
        btn.disabled = false;
        setStatus("Failed to start checkout.");
      }
    });
  }

  // --- Return=checkout flow (upgrade page) ---
  function handleReturnCheckoutFlow() {
    if (!IS_UPGRADE_PAGE) return;

    const u = new URL(location.href);
    const wantsReturn = u.searchParams.get("return") === "checkout";

    if (!wantsReturn) return;

    // If user already picked a category, scroll to checkout (simple + controlled UX)
    const cat = currentCategory();
    if (cat) {
      // keep them focused: go straight to checkout section
      setTimeout(() => {
        const section = els.checkoutSection();
        if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }

  // --- Init ---
  syncCategoryEverywhere();
  wireChangeCategoryButtons();
  wireCheckoutButton();
  handleReturnCheckoutFlow();
  initSessionFromAuth();
})();

