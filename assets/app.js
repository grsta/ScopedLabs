/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Goals:
   - Keep a "current category" in sync between:
     URL ?category=, localStorage(sl_selected_category), and UI label(s)
   - Bind all category unlock buttons/links (data-category OR id sl-unlock-<cat> OR href ?category=)
   - Routing rules:
       * If signed in: selecting a category goes straight to /upgrade/checkout/?category=CAT
         when return=checkout is present (or on checkout page)
       * If NOT signed in: selecting a category stays on /upgrade/?category=CAT#checkout
   - Checkout button calls /api/create-checkout-session
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");

  const LS_KEY = "sl_selected_category";

  const $ = (id) => document.getElementById(id);

  const getUrlCategory = () => {
    const u = new URL(location.href);
    const c = (u.searchParams.get("category") || "").trim();
    return c || null;
  };

  const setUrlCategory = (cat, { replace = true } = {}) => {
    const u = new URL(location.href);
    if (cat) u.searchParams.set("category", cat);
    else u.searchParams.delete("category");

    // preserve return=checkout if present
    const ret = u.searchParams.get("return");
    if (ret === "checkout") u.searchParams.set("return", "checkout");

    if (replace) history.replaceState({}, "", u.toString());
    else history.pushState({}, "", u.toString());
  };

  const getReturnMode = () => {
    const u = new URL(location.href);
    return (u.searchParams.get("return") || "").toLowerCase() === "checkout";
  };

  const setReturnMode = (on) => {
    const u = new URL(location.href);
    if (on) u.searchParams.set("return", "checkout");
    else u.searchParams.delete("return");
    history.replaceState({}, "", u.toString());
  };

  const getStoredCategory = () => {
    try {
      const c = (localStorage.getItem(LS_KEY) || "").trim();
      return c || null;
    } catch {
      return null;
    }
  };

  const setStoredCategory = (cat) => {
    try {
      if (cat) localStorage.setItem(LS_KEY, cat);
      else localStorage.removeItem(LS_KEY);
    } catch {}
  };

  const els = {
    // upgrade page
    categoryLabel: () => $("sl-selected-category-label"),
    categoryPill: () => $("sl-category-pill"),
    changeCategory: () => $("sl-change-category"),
    checkoutCard: () => $("sl-checkout-card"),
    categoriesSection: () => $("categories"),

    // auth/status (some are owned by auth.js; we just read/update if present)
    status: () => $("sl-status") || $("sl-auth-status") || $("status"),

    // checkout page buttons
    checkoutBtn: () => $("sl-checkout"),
    signoutBtn: () => $("sl-signout"),

    // optional “Continue to checkout” button on upgrade page
    continueBtn: () => $("sl-continue") || $("sl-continue-checkout") || $("sl-continue-to-checkout"),
  };

  const setStatus = (msg) => {
    const el = els.status();
    if (!el) return;
    el.textContent = msg || "";
  };

  // Supabase client is created in auth.js
  const getSb = () => (window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null);

  const getSession = async () => {
    const sb = getSb();
    if (!sb) return null;
    try {
      const { data } = await sb.auth.getSession();
      return data && data.session ? data.session : null;
    } catch {
      return null;
    }
  };

  // ---------- UI sync ----------
  let currentCategory = null;

  const renderCategory = (cat) => {
    const pill = els.categoryPill();
    const label = els.categoryLabel();

    const pretty = cat || "None";
    if (pill) pill.textContent = cat || "None";
    if (label) {
      // Some templates use the label in the H2 like "Unlock ___"
      // Keep it simple: label shows the slug or "None selected"
      label.textContent = cat ? cat : "None selected";
    }
  };

  const syncCategoryFromSources = () => {
    const urlCat = getUrlCategory();
    const stored = getStoredCategory();
    const cat = urlCat || stored || null;

    currentCategory = cat;

    // normalize state
    if (cat) {
      setStoredCategory(cat);
      if (!urlCat) setUrlCategory(cat, { replace: true });
    }

    renderCategory(cat);
  };

  const scrollTo = (id) => {
    const el = typeof id === "string" ? $(id) : id;
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      el.scrollIntoView();
    }
  };

  // ---------- Navigation ----------
  const goToUpgradeCategories = ({ preserveCategory = true, returnToCheckout = false } = {}) => {
    const cat = preserveCategory ? (currentCategory || getStoredCategory() || getUrlCategory()) : null;

    const u = new URL(location.origin + "/upgrade/");
    if (cat) u.searchParams.set("category", cat);
    if (returnToCheckout) u.searchParams.set("return", "checkout");
    u.hash = "categories";
    location.href = u.toString();
  };

  const goToUpgradeCheckout = (cat) => {
    const u = new URL(location.origin + "/upgrade/checkout/");
    if (cat) u.searchParams.set("category", cat);
    location.href = u.toString();
  };

  const goToUpgradeCheckoutOrLogin = async (cat) => {
    const s = await getSession();
    setStoredCategory(cat || null);

    if (s) {
      // signed in -> go checkout
      goToUpgradeCheckout(cat);
      return;
    }

    // signed out -> stay on upgrade and go to checkout block
    const u = new URL(location.href);
    u.pathname = "/upgrade/";
    if (cat) u.searchParams.set("category", cat);
    u.hash = "checkout";
    location.href = u.toString();
  };

  // ---------- Bind category buttons ----------
  const extractCategoryFromEl = (el) => {
    if (!el) return null;

    // explicit dataset is best
    const dc = (el.dataset && el.dataset.category ? el.dataset.category : "").trim();
    if (dc) return dc;

    // id like sl-unlock-network
    const id = (el.id || "").trim();
    if (id.startsWith("sl-unlock-")) return id.replace("sl-unlock-", "").trim() || null;

    // href ?category=
    const href = (el.getAttribute && el.getAttribute("href") ? el.getAttribute("href") : "").trim();
    if (href && href.includes("category=")) {
      try {
        const u = new URL(href, location.origin);
        const c = (u.searchParams.get("category") || "").trim();
        return c || null;
      } catch {}
    }

    return null;
  };

  const bindCategoryPickers = () => {
    // Any element with data-category OR id sl-unlock-<cat> OR links with ?category=
    const nodes = Array.from(
      document.querySelectorAll("[data-category], [id^='sl-unlock-'], a[href*='category=']")
    );

    nodes.forEach((el) => {
      const cat = extractCategoryFromEl(el);
      if (!cat) return;

      el.addEventListener("click", async (e) => {
        // If it's a link, prevent default and route ourselves
        e.preventDefault();

        // Set state immediately
        currentCategory = cat;
        setStoredCategory(cat);
        setUrlCategory(cat, { replace: true });
        renderCategory(cat);

        const returnMode = getReturnMode();

        // If we are returning to checkout OR already on checkout page:
        // - signed in -> go /upgrade/checkout/?category=cat
        // - signed out -> go /upgrade/?category=cat#checkout
        if (returnMode || IS_CHECKOUT_PAGE) {
          await goToUpgradeCheckoutOrLogin(cat);
          return;
        }

        // Normal upgrade flow: just jump to checkout section on this page
        const u = new URL(location.href);
        u.pathname = "/upgrade/";
        u.searchParams.set("category", cat);
        u.hash = "checkout";
        location.href = u.toString();
      });
    });
  };

  // ---------- Change Category button (critical fix) ----------
  const wireChangeCategory = () => {
    // Use event delegation so it works even if DOM changes/rehydrates
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!t) return;

      const btn =
        (t.id === "sl-change-category" ? t : null) ||
        (t.closest ? t.closest("#sl-change-category") : null);

      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      if (IS_CHECKOUT_PAGE) {
        // Checkout -> ALWAYS go back to upgrade chooser, return=checkout
        goToUpgradeCategories({ preserveCategory: true, returnToCheckout: true });
        return;
      }

      // Upgrade page:
      // If we got here via return=checkout, keep it. Otherwise, don’t add it.
      if (getReturnMode()) {
        // keep return=checkout and go to chooser
        goToUpgradeCategories({ preserveCategory: true, returnToCheckout: true });
        return;
      }

      // Normal upgrade page -> just scroll to chooser section
      // Ensure we have #categories in URL for refresh stability
      try {
        location.hash = "categories";
      } catch {}
      scrollTo("categories");
    });
  };

  // ---------- Checkout page: Checkout button ----------
  const wireCheckoutButton = () => {
    if (!IS_CHECKOUT_PAGE) return;

    const btn = els.checkoutBtn();
    if (!btn) return;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();

      const sb = getSb();
      if (!sb) return;

      const session = await getSession();
      if (!session) {
        setStatus("Please sign in to continue.");
        // bounce back to upgrade checkout block
        goToUpgradeCheckoutOrLogin(currentCategory || getStoredCategory() || getUrlCategory());
        return;
      }

      const cat = currentCategory || getUrlCategory() || getStoredCategory();
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
            email: session.user.email,
          }),
        });

        if (!res.ok) throw new Error("Bad response");

        const data = await res.json();
        if (!data || !data.url) throw new Error("Missing url");

        location.href = data.url;
      } catch (err) {
        btn.disabled = false;
        setStatus("Failed to start checkout");
        console.error(err);
      }
    });
  };

  // ---------- Boot ----------
  const boot = async () => {
    // Wait for auth.js readiness if it exists
    if (window.SL_AUTH && window.SL_AUTH.ready && typeof window.SL_AUTH.ready.then === "function") {
      try {
        await window.SL_AUTH.ready;
      } catch {}
    }

    syncCategoryFromSources();
    bindCategoryPickers();
    wireChangeCategory();
    wireCheckoutButton();

    // If we are on /upgrade/ and return=checkout is present AND user is signed in
    // AND category exists -> immediately go to checkout
    if (!IS_CHECKOUT_PAGE && getReturnMode()) {
      const cat = currentCategory || getUrlCategory() || getStoredCategory();
      if (cat) {
        const s = await getSession();
        if (s) {
          goToUpgradeCheckout(cat);
          return;
        }
        // signed out -> keep user on upgrade and show them checkout area
        // (don’t loop; just scroll)
        try {
          location.hash = "checkout";
        } catch {}
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
