/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Goals:
   - Keep a "current category" in sync between:
     URL ?category=, localStorage(sl_selected_category), and UI label(s)
   - Bind all category unlock buttons/links:
     data-category OR id sl-unlock-<cat> OR href with ?category=
   - Routing rules:
       * If signed in: selecting a category goes straight to /upgrade/checkout/?category=CAT
       * If NOT signed in: selecting a category goes to /upgrade/?category=CAT#checkout
   - Checkout page:
       * Requires a valid session
       * Checkout button calls /api/create-checkout-session
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");

  // Must be created by auth.js
  const SL = window.SL_AUTH || {};
  const sb = SL.sb || null;

  const LS_CAT = "sl_selected_category";

  // ---------- helpers ----------
  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function setQs(name, val) {
    const u = new URL(location.href);
    if (val === null || val === undefined || val === "") u.searchParams.delete(name);
    else u.searchParams.set(name, String(val));
    return u;
  }

  function normalizeCategory(cat) {
    if (!cat) return "";
    return String(cat).trim().toLowerCase();
  }

  function readCategoryFromUrlOrStorage() {
    const urlCat = normalizeCategory(qs("category"));
    if (urlCat) return urlCat;

    try {
      const ls = normalizeCategory(localStorage.getItem(LS_CAT));
      if (ls) return ls;
    } catch {}

    return "";
  }

  function writeCategory(cat) {
    const c = normalizeCategory(cat);
    if (!c) return;

    try {
      localStorage.setItem(LS_CAT, c);
    } catch {}

    // keep URL in sync on both pages
    const u = setQs("category", c);
    // preserve hash
    u.hash = location.hash || "";
    history.replaceState({}, "", u.toString());
  }

  function isChoosingSection() {
    const h = (location.hash || "").toLowerCase();
    return h === "#choose" || h === "#categories";
  }

  function scrollToChooser() {
    const el =
      document.getElementById("choose") ||
      document.getElementById("categories") ||
      document.querySelector("#choose") ||
      document.querySelector("#categories");

    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setStatus(text) {
    if (els.status) els.status.textContent = text || "";
  }

  function enable(el, on) {
    if (!el) return;
    if (el.tagName === "A") {
      el.classList.toggle("disabled", !on);
      el.setAttribute("aria-disabled", on ? "false" : "true");
    } else {
      el.disabled = !on;
    }
  }

  // ---------- DOM ----------
  const els = {
    selectedLabel: document.getElementById("sl-selected-category-label"),
    selectedPill: document.getElementById("sl-selected-category-pill"),
    price: document.getElementById("sl-price"),

    email: document.getElementById("sl-email"),
    sendLinkBtn: document.getElementById("sl-sendlink"),
    signOutBtn: document.getElementById("sl-signout"),
    accountBtn:
      document.getElementById("sl-account") ||
      document.querySelector('a[href="/account/"]'),

    checkoutBtn: document.getElementById("sl-checkout"),
    checkoutCard: document.getElementById("sl-checkout-card"),
    bootHint: document.getElementById("sl-boot-hint"),

    changeCategoryBtn: document.getElementById("sl-change-category"),
    status: document.getElementById("sl-status"),
  };

  let currentCategory = normalizeCategory(readCategoryFromUrlOrStorage());
  let currentSession = null;

  // ---------- UI refresh ----------
  function updateCategoryUI() {
    const cat = currentCategory;

    if (els.selectedLabel) {
      els.selectedLabel.textContent = cat ? cat : "None selected";
    }
    if (els.selectedPill) {
      els.selectedPill.textContent = cat ? cat : "None";
    }

    // keep URL/storage synced
    if (cat) writeCategory(cat);
  }

  async function refreshSession() {
    if (!sb) return null;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) return null;
      return data && data.session ? data.session : null;
    } catch {
      return null;
    }
  }

  function refreshUI() {
    updateCategoryUI();

    // signed-in UX
    const signedIn = !!(currentSession && currentSession.user);
    const email = signedIn ? (currentSession.user.email || "") : "";

    // Email input: editable when signed out, locked when signed in (optional)
    if (els.email) {
      if (signedIn) {
        // keep visible, but avoid making it annoying
        els.email.value = email || els.email.value || "";
        els.email.readOnly = true;
      } else {
        els.email.readOnly = false;
      }
    }

    // Show/hide auth buttons
    if (els.sendLinkBtn) els.sendLinkBtn.style.display = signedIn ? "none" : "";
    if (els.signOutBtn) els.signOutBtn.style.display = signedIn ? "" : "none";

    // Account button behavior
    if (els.accountBtn) {
      if (signedIn) {
        enable(els.accountBtn, true);
      } else {
        enable(els.accountBtn, true); // clickable, but we’ll intercept if needed
      }
    }

    // Checkout enablement
    const canCheckout = signedIn && !!currentCategory;

    if (els.checkoutBtn) enable(els.checkoutBtn, canCheckout);

    // Checkout page: card visibility
    if (IS_CHECKOUT_PAGE) {
      if (els.checkoutCard) els.checkoutCard.style.display = signedIn ? "" : "none";
      if (els.bootHint) els.bootHint.style.display = signedIn ? "none" : "";
    }

    // Clear “Signing you in…” style messages when session exists
    if (signedIn && els.status) {
      const t = (els.status.textContent || "").toLowerCase();
      if (t.includes("signing you in")) setStatus("");
    }
  }

  // ---------- navigation ----------
  function goToCheckoutFor(cat) {
    const c = normalizeCategory(cat);
    if (!c) return;

    // save choice
    try {
      localStorage.setItem(LS_CAT, c);
    } catch {}

    // If signed in => checkout page
    if (currentSession && currentSession.user) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(c);
    } else {
      // signed out => upgrade page anchored at checkout
      location.href =
        "/upgrade/?category=" + encodeURIComponent(c) + "#checkout";
    }
  }

  function getCatFromElement(el) {
    if (!el) return "";
    const dc = el.getAttribute("data-category");
    if (dc) return normalizeCategory(dc);

    const id = el.id || "";
    if (id.startsWith("sl-unlock-")) {
      return normalizeCategory(id.replace("sl-unlock-", ""));
    }

    // href ?category=
    const href = el.getAttribute("href") || "";
    if (href.includes("category=")) {
      try {
        const u = new URL(href, location.origin);
        const c = normalizeCategory(u.searchParams.get("category"));
        if (c) return c;
      } catch {}
    }

    return "";
  }

  function bindCategoryButtons() {
    // common patterns: data-category, id sl-unlock-<cat>, or links with ?category=
    const candidates = Array.from(
      document.querySelectorAll(
        '[data-category], [id^="sl-unlock-"], a[href*="?category="]'
      )
    );

    candidates.forEach((el) => {
      const c = getCatFromElement(el);
      if (!c) return;

      // only bind once
      if (el.__slBound) return;
      el.__slBound = true;

      el.addEventListener("click", (e) => {
        // Only intercept category chooser clicks.
        // If it’s an anchor to somewhere else, don’t break it.
        const href = (el.getAttribute("href") || "").trim();
        const looksLikeUpgradeCategory =
          href.startsWith("/upgrade/") && href.includes("category=");

        if (el.hasAttribute("data-category") || el.id.startsWith("sl-unlock-") || looksLikeUpgradeCategory) {
          e.preventDefault();
          currentCategory = c;
          refreshUI();
          goToCheckoutFor(c);
        }
      });
    });
  }

  function wireChangeCategoryButton() {
    if (!els.changeCategoryBtn) return;

    // only bind once
    if (els.changeCategoryBtn.__slBound) return;
    els.changeCategoryBtn.__slBound = true;

    els.changeCategoryBtn.addEventListener("click", (e) => {
      e.preventDefault();

      if (IS_CHECKOUT_PAGE) {
        // go to upgrade chooser and DO NOT auto-bounce back while choosing
        const c = normalizeCategory(currentCategory || readCategoryFromUrlOrStorage());
        const u = new URL("/upgrade/", location.origin);
        u.searchParams.set("return", "checkout");
        if (c) u.searchParams.set("category", c);
        u.hash = "choose"; // your page uses id="choose"
        location.href = u.toString();
        return;
      }

      // On upgrade page: just scroll to chooser
      const u = new URL(location.href);
      u.hash = "choose";
      history.replaceState({}, "", u.toString());
      scrollToChooser();
    });
  }

  function wireAccountButton() {
    if (!els.accountBtn) return;

    if (els.accountBtn.__slBound) return;
    els.accountBtn.__slBound = true;

    els.accountBtn.addEventListener("click", (e) => {
      const signedIn = !!(currentSession && currentSession.user);
      if (signedIn) {
        // allow normal navigation to /account/
        return;
      }

      // signed out: keep them on upgrade and prompt sign-in
      e.preventDefault();
      setStatus("Sign in first to access your account.");
      if (!IS_CHECKOUT_PAGE) {
        const u = new URL(location.href);
        u.hash = "checkout";
        history.replaceState({}, "", u.toString());
        document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        location.href = "/upgrade/#checkout";
      }
    });
  }

  async function wireCheckoutButton() {
    if (!IS_CHECKOUT_PAGE) return;
    if (!els.checkoutBtn) return;

    if (els.checkoutBtn.__slBound) return;
    els.checkoutBtn.__slBound = true;

    els.checkoutBtn.addEventListener("click", async () => {
      if (!currentSession || !currentSession.user) return;
      if (!currentCategory) return;

      enable(els.checkoutBtn, false);
      setStatus("Opening Stripe Checkout…");

      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: currentCategory,
            email: currentSession.user.email,
          }),
        });

        if (!res.ok) throw new Error("bad_response");
        const data = await res.json();
        if (!data || !data.url) throw new Error("no_url");

        location.href = data.url;
      } catch (err) {
        console.error(err);
        enable(els.checkoutBtn, true);
        setStatus("Failed to start checkout");
      }
    });
  }

  // ---------- boot ----------
  async function init() {
    // category first
    currentCategory = normalizeCategory(readCategoryFromUrlOrStorage());
    refreshUI();
    bindCategoryButtons();
    wireChangeCategoryButton();
    wireAccountButton();

    // wait for auth.js readiness if provided
    try {
      if (SL.ready && typeof SL.ready.then === "function") {
        await SL.ready;
      }
    } catch {}

    currentSession = await refreshSession();
    refreshUI();

    // Auth state changes (login/logout)
    if (sb && sb.auth && sb.auth.onAuthStateChange) {
      sb.auth.onAuthStateChange(async (_event, session) => {
        currentSession = session || (await refreshSession());
        refreshUI();
      });
    }

    // Return-to-checkout behavior:
    // If you land on /upgrade/?return=checkout&category=... and you're signed in,
    // redirect to checkout ONLY if you're NOT currently on the chooser section.
    const RETURN_TO_CHECKOUT = qs("return") === "checkout";
    if (
      RETURN_TO_CHECKOUT &&
      !IS_CHECKOUT_PAGE &&
      currentSession &&
      currentSession.user &&
      currentCategory &&
      !isChoosingSection()
    ) {
      location.replace("/upgrade/checkout/?category=" + encodeURIComponent(currentCategory));
      return;
    }

    await wireCheckoutButton();
  }

  init().catch((e) => console.error(e));
})();

