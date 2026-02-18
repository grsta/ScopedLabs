/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller (UI state renderer)

   Key rules:
   - auth.js creates window.SL_AUTH = { sb, ready }
   - app.js imports nothing
   - app.js must re-render UI from sb.auth.getSession() on load
   - app.js must listen to onAuthStateChange and re-render
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE =
    location.pathname.startsWith("/upgrade/checkout") ||
    location.pathname.startsWith("/upgrade/checkout/");

  // -----------------------------
  // Helpers
  // -----------------------------
  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);

  function safeText(el, txt) {
    if (!el) return;
    el.textContent = txt == null ? "" : String(txt);
  }

  function setDisabled(el, disabled) {
    if (!el) return;
    el.disabled = !!disabled;
  }

  function setVisible(el, show) {
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  function getParam(name) {
    try {
      return new URLSearchParams(location.search).get(name);
    } catch {
      return null;
    }
  }

  function setParam(name, value) {
    const url = new URL(location.href);
    if (value == null || value === "") url.searchParams.delete(name);
    else url.searchParams.set(name, value);
    history.replaceState({}, "", url.toString());
  }

  function normalizeCategory(v) {
    if (!v) return "";
    return String(v).trim().toLowerCase();
  }

  function getCategory() {
    // URL wins, then localStorage
    const fromUrl = normalizeCategory(getParam("category"));
    if (fromUrl) return fromUrl;

    const fromLs = normalizeCategory(localStorage.getItem("sl_selected_category"));
    if (fromLs) return fromLs;

    return "";
  }

  function setCategory(cat) {
    const c = normalizeCategory(cat);
    if (c) {
      localStorage.setItem("sl_selected_category", c);
      setParam("category", c);
    } else {
      localStorage.removeItem("sl_selected_category");
      setParam("category", "");
    }
  }

  function scrollToCheckout() {
    // hash might be missing after redirects; keep it simple
    const el = byId("checkout") || byId("sl-checkout") || $("#sl-checkout-grid");
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // -----------------------------
  // Element map (defensive)
  // -----------------------------
  const els = {
    // Upgrade page pieces
    selectedPill: byId("selected-category") || byId("sl-selected-category") || $("#selected-category"),
    changeCategoryBtn: byId("sl-change-category") || byId("sl-change-cat") || $("#sl-change-category"),

    // Preview panel (your project has used a couple IDs while iterating)
    previewCard:
      byId("selected-category-preview") ||
      byId("sl-selected-category-preview") ||
      byId("sl-category-preview") ||
      $("#selected-category-preview") ||
      $("#sl-selected-category-preview") ||
      $("#sl-category-preview"),

    // Auth UI
    emailInput: byId("sl-email") || $("#sl-email"),
    sendLinkBtn: byId("sl-sendlink") || byId("sl-send-btn") || $("#sl-sendlink") || $("#sl-send-btn"),
    hint: byId("sl-email-hint") || $("#sl-email-hint") || byId("sl-status") || $("#sl-status"),
    signedInAs: byId("sl-signed-in-as") || $("#sl-signed-in-as"),
    signoutBtn: byId("sl-signout") || $("#sl-signout"),

    // Checkout page CTA
    checkoutBtn: byId("sl-checkout") || $("#sl-checkout"),
    accountBtn: byId("sl-account") || $("#sl-account"),
    chooseDifferentBtn:
      byId("sl-choose-different") ||
      byId("sl-choose-category") ||
      $("#sl-choose-different") ||
      $("#sl-choose-category"),
  };

  // -----------------------------
  // Category preview text (keep simple)
  // (You can expand these later; this is just to keep UI stable.)
  // -----------------------------
  const CATEGORY_COPY = {
    power: {
      title: "Power",
      body: "Unlock Pro tools for Power (current + future).\n\n• All current Pro tools in this category\n• All future Pro tools added here\n• No renewals",
    },
    wireless: {
      title: "Wireless",
      body: "Link planning, channel assumptions, and reliability headroom.\n\n• Link budget & margin checks\n• Coverage + capacity planning\n• Interference risk helpers",
    },
    thermal: {
      title: "Thermal",
      body: "Heat load planning, airflow assumptions, and environment constraints.\n\n• BTU/Watt conversion helpers\n• Room/rack thermal planning\n• Cooling headroom checks",
    },
    infrastructure: {
      title: "Infrastructure",
      body: "Unlock Pro tools for Infrastructure (current + future).\n\n• All current Pro tools in this category\n• All future Pro tools added here\n• No renewals",
    },
    network: {
      title: "Network",
      body: "Unlock Pro tools for Network (current + future).\n\n• All current Pro tools in this category\n• All future Pro tools added here\n• No renewals",
    },
    video: {
      title: "Video & Storage",
      body: "Unlock Pro tools for Video & Storage (current + future).\n\n• All current Pro tools in this category\n• All future Pro tools added here\n• No renewals",
    },
  };

  function renderCategory(cat) {
    const c = normalizeCategory(cat);
    const pillLabel = c || "None selected";
    safeText(els.selectedPill, pillLabel);

    // If preview card exists, update its contents without assuming structure
    if (els.previewCard) {
      // Try to find a title node; otherwise just replace innerText safely
      const titleNode =
        els.previewCard.querySelector("h3, h4, .title, .card-title") || null;
      const bodyNode =
        els.previewCard.querySelector("p, .muted, .body, .card-body") || null;

      const info = CATEGORY_COPY[c] || { title: c ? c[0].toUpperCase() + c.slice(1) : "—", body: c ? `You are unlocking ${c}.` : "" };

      if (titleNode) safeText(titleNode, info.title);
      if (bodyNode) safeText(bodyNode, info.body);

      // Fallback if we can’t find child nodes: set textContent
      if (!titleNode && !bodyNode) {
        els.previewCard.textContent = info.title + (info.body ? "\n\n" + info.body : "");
      }
    }

    // Checkout button enabled state depends on BOTH session + category; handled in renderAuth()
  }

  function renderAuth(session) {
    const email = session && session.user && session.user.email ? session.user.email : "";

    // Signed in label
    if (els.signedInAs) {
      safeText(els.signedInAs, email ? `Signed in as ${email}` : "");
      setVisible(els.signedInAs, !!email);
    }

    // Show signout if signed in
    setVisible(els.signoutBtn, !!email);

    // Enable checkout button only if signed in and category present
    const cat = getCategory();
    const canCheckout = !!email && !!cat;

    if (els.checkoutBtn) {
      setDisabled(els.checkoutBtn, !canCheckout);
    }

    // Optional: status/hint line
    if (els.hint) {
      if (!email) {
        // only show “sign in” hint on checkout card; avoid noisy messages elsewhere
        // (still lets you keep the “magic link sent” confirmation)
        // If hint already contains "Magic link sent", don't overwrite it.
        const txt = String(els.hint.textContent || "");
        if (!/magic link sent/i.test(txt)) {
          safeText(els.hint, IS_CHECKOUT_PAGE ? "Sign in to continue." : "");
        }
      } else {
        // clear generic hint once signed in
        const txt = String(els.hint.textContent || "");
        if (!/magic link sent/i.test(txt)) safeText(els.hint, "");
      }
    }
  }

  // -----------------------------
  // Navigation helpers
  // -----------------------------
  async function goToCheckoutFor(cat) {
    const c = normalizeCategory(cat);
    if (!c) return;

    setCategory(c);

    // If we have a session, go straight to checkout
    let session = null;
    try {
      const sb = window.SL_AUTH && window.SL_AUTH.sb;
      if (sb) {
        const res = await sb.auth.getSession();
        session = res && res.data ? res.data.session : null;
      }
    } catch {}

    if (session && session.user) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(c);
    } else {
      location.href = "/upgrade/?category=" + encodeURIComponent(c) + "#checkout";
    }
  }

  function bindCategoryButtons() {
    // Any element with data-category should route
    const nodes = document.querySelectorAll("[data-category]");
    nodes.forEach((btn) => {
      if (btn.__sl_bound) return;
      btn.__sl_bound = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const c = btn.getAttribute("data-category");
        goToCheckoutFor(c);
      });
    });

    // Also support ids like sl-unlock-<cat>
    const idNodes = document.querySelectorAll("[id^='sl-unlock-']");
    idNodes.forEach((btn) => {
      if (btn.__sl_bound) return;
      btn.__sl_bound = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const c = btn.id.replace("sl-unlock-", "");
        goToCheckoutFor(c);
      });
    });
  }

  function bindChangeCategoryButtons() {
    if (els.changeCategoryBtn && !els.changeCategoryBtn.__sl_bound) {
      els.changeCategoryBtn.__sl_bound = true;
      els.changeCategoryBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // default behavior: go back to categories section on upgrade page
        location.href = "/upgrade/#choose";
      });
    }

    if (els.chooseDifferentBtn && !els.chooseDifferentBtn.__sl_bound) {
      els.chooseDifferentBtn.__sl_bound = true;
      els.chooseDifferentBtn.addEventListener("click", (e) => {
        e.preventDefault();
        location.href = "/upgrade/?return=checkout#choose";
      });
    }
  }

  // -----------------------------
  // Checkout button wiring
  // -----------------------------
  async function bindCheckoutButton() {
    if (!els.checkoutBtn || els.checkoutBtn.__sl_bound) return;
    els.checkoutBtn.__sl_bound = true;

    els.checkoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const sb = window.SL_AUTH && window.SL_AUTH.sb;
      if (!sb) return;

      const cat = getCategory();
      let session = null;
      try {
        const res = await sb.auth.getSession();
        session = res && res.data ? res.data.session : null;
      } catch {}

      if (!session || !session.user || !session.user.email) return;
      if (!cat) return;

      setDisabled(els.checkoutBtn, true);
      if (els.hint) safeText(els.hint, "Opening Stripe Checkout…");

      try {
        const r = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: cat, email: session.user.email }),
        });

        if (!r.ok) throw new Error("Bad status: " + r.status);

        const j = await r.json();
        if (!j || !j.url) throw new Error("No url returned");

        location.href = j.url;
      } catch (err) {
        console.error(err);
        setDisabled(els.checkoutBtn, false);
        if (els.hint) safeText(els.hint, "Failed to start checkout");
      }
    });
  }

  // -----------------------------
  // Main boot
  // -----------------------------
  async function boot() {
    // Wait for auth.js readiness
    if (!window.SL_AUTH || !window.SL_AUTH.ready) {
      console.warn("[SL_APP] SL_AUTH not ready (auth.js missing or loaded after app.js).");
      return;
    }

    await window.SL_AUTH.ready;
    const sb = window.SL_AUTH.sb;
    if (!sb) return;

    // Category render first (prevents “None selected” after redirects)
    const cat = getCategory();
    renderCategory(cat);

    // Always render from current session on load
    try {
      const res = await sb.auth.getSession();
      const session = res && res.data ? res.data.session : null;
      renderAuth(session);
    } catch {
      renderAuth(null);
    }

    // Re-render immediately on any auth change
    sb.auth.onAuthStateChange((_event, session) => {
      try {
        renderAuth(session || null);
        // category might come from redirect URL changes; re-read it
        renderCategory(getCategory());
      } catch {}
    });

    // Bindings
    bindCategoryButtons();
    bindChangeCategoryButtons();
    if (IS_CHECKOUT_PAGE) await bindCheckoutButton();

    // If we landed on upgrade page with #checkout, help scroll
    if (!IS_CHECKOUT_PAGE && location.hash === "#checkout") {
      setTimeout(scrollToCheckout, 50);
    }

    // If return=checkout and user is signed in, selecting a category should jump to checkout
    const ret = getParam("return");
    if (!IS_CHECKOUT_PAGE && ret === "checkout") {
      // If a category already exists, bounce immediately
      const existing = getCategory();
      if (existing) {
        try {
          const res = await sb.auth.getSession();
          const s = res && res.data ? res.data.session : null;
          if (s && s.user) {
            location.href = "/upgrade/checkout/?category=" + encodeURIComponent(existing);
            return;
          }
        } catch {}
      }
    }
  }

  // Start
  boot().catch((e) => console.error(e));
})();

