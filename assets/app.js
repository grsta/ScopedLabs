/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Goals:
   - Always keep a "current category" in sync between:
     URL ?category=, localStorage(sl_selected_category), and UI label(s)
   - Bind all category unlock buttons/links (data-category OR id sl-unlock-<cat> OR href ?category=)
   - Routing rules:
       * If signed in: clicking a category unlock goes straight to /upgrade/checkout/?category=CAT
       * If NOT signed in: clicking a category unlock goes to /upgrade/?category=CAT#checkout
   - Checkout page:
       * Requires a valid session
       * Checkout button calls /api/create-checkout-session
*/

(() => {
  "use strict";

  const LS_KEY = "sl_selected_category";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function safeSlug(v) {
    return (v || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "");
  }

  function getUrlParam(name) {
    try {
      return new URL(location.href).searchParams.get(name) || "";
    } catch {
      return "";
    }
  }

  function getCategory() {
    const fromUrl = safeSlug(getUrlParam("category"));
    if (fromUrl) return fromUrl;

    try {
      const fromLs = safeSlug(localStorage.getItem(LS_KEY));
      if (fromLs) return fromLs;
    } catch {}

    return "";
  }

  function setCategory(cat) {
    const c = safeSlug(cat);
    try {
      if (c) localStorage.setItem(LS_KEY, c);
      else localStorage.removeItem(LS_KEY);
    } catch {}
    return c;
  }

  function scrollToHash(hash) {
    try {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {}
  }

  function showSignedIn(email) {
    const signed = $("#sl-signed-in");
    const signedOut = $("#sl-signed-out");
    if (signed) signed.style.display = "";
    if (signedOut) signedOut.style.display = "none";

    const who = $("#sl-user-email");
    if (who) who.textContent = email || "Signed in";
  }

  function showSignedOut() {
    const signed = $("#sl-signed-in");
    const signedOut = $("#sl-signed-out");
    if (signed) signed.style.display = "none";
    if (signedOut) signedOut.style.display = "";

    const who = $("#sl-user-email");
    if (who) who.textContent = "";
  }

  function syncCategoryUI(cat) {
    const label = $("#sl-selected-category") || $("#selected-category");
    if (label) label.textContent = cat ? cat : "None selected";

    // preview card bits (if present)
    const prevTitle = $("#sl-preview-title");
    if (prevTitle) prevTitle.textContent = cat ? cat : "Select a category";

    const prevList = $("#sl-preview-list");
    if (prevList) {
      // If your HTML already builds bullets dynamically elsewhere, leave as-is.
      // Otherwise provide a minimal placeholder.
      if (!cat) {
        prevList.innerHTML = "";
      }
    }

    // checkout button enable/disable is handled in wireCheckoutButton()
  }

  async function getSession(sb) {
    if (!sb) return null;
    try {
      const { data } = await sb.auth.getSession();
      return data && data.session ? data.session : null;
    } catch {
      return null;
    }
  }

  function wireCheckoutButton(sb) {
    const btn = $("#sl-checkout");
    const status = $("#sl-status");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const currentCategory = getCategory();
      const session = await getSession(sb);

      if (!session || !session.user) return;
      if (!currentCategory) return;

      btn.disabled = true;
      if (status) status.textContent = "Opening Stripe Checkout…";

      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: currentCategory,
            email: session.user.email,
          }),
        });

        if (!res.ok) throw new Error("bad status");
        const data = await res.json();
        if (!data || !data.url) throw new Error("missing url");

        location.href = data.url;
      } catch (e) {
        if (status) status.textContent = "Failed to start checkout";
        btn.disabled = false;
      }
    });
  }

  function wireChangeCategoryButton() {
    const btn = $("#sl-change-category");
    if (!btn) return;

    btn.addEventListener("click", (e) => {
      // Always route to the Upgrade page category picker (works from BOTH pages).
      // Keep return=checkout so selecting a category can bounce back to checkout.
      try {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      } catch {}

      const currentCategory = getCategory();

      let url = "/upgrade/?return=checkout";
      if (currentCategory) {
        url += "&category=" + encodeURIComponent(currentCategory);
      }
      url += "#categories";

      location.href = url;
    });
  }

  function getCategoryFromHref(href) {
    if (!href) return "";
    try {
      const u = new URL(href, location.origin);
      return u.searchParams.get("category") || "";
    } catch {
      return "";
    }
  }

  function wireCategoryButtons() {
    // Any element with data-category or id sl-unlock-<cat>
    const btns = $$("[data-category], a[href*='?category='], button[id^='sl-unlock-']");
    btns.forEach((el) => {
      const cat =
        safeSlug(el.getAttribute("data-category")) ||
        safeSlug((el.id || "").replace(/^sl-unlock-/, "")) ||
        safeSlug(getCategoryFromHref(el.getAttribute("href")));

      if (!cat) return;

      el.addEventListener("click", () => {
        // Let normal nav happen, but make sure we persist the category
        setCategory(cat);
      });
    });
  }

  async function goToCheckoutFor(cat, sessionExists) {
    const c = setCategory(cat);

    if (sessionExists) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(c);
    } else {
      location.href = "/upgrade/?category=" + encodeURIComponent(c) + "#checkout";
    }
  }

  function isCheckoutPage() {
    return location.pathname.startsWith("/upgrade/checkout");
  }

  async function handleReturnFlow(sb) {
    const returnMode = safeSlug(getUrlParam("return"));
    const currentCategory = getCategory();
    const session = sb ? await getSession(sb) : null;

    // If we’re on upgrade and return=checkout and already have session + category -> go straight to checkout page
    // BUT: if we are explicitly at #categories, do NOT bounce (user is choosing a different category).
    if (
      !isCheckoutPage() &&
      returnMode === "checkout" &&
      session &&
      currentCategory &&
      (location.hash || "") !== "#categories"
    ) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(currentCategory);
      return true;
    }

    // If we’re on checkout page and no session -> kick back to upgrade checkout section
    if (isCheckoutPage() && !session) {
      location.href =
        "/upgrade/?category=" + encodeURIComponent(currentCategory || "") + "#checkout";
      return true;
    }

    return false;
  }

  async function init() {
    // 1) category sync
    const cat = setCategory(getCategory());
    syncCategoryUI(cat);

    // 2) change-category return flow
    wireChangeCategoryButton();

    // 3) wire category buttons (persist selection)
    wireCategoryButtons();

    // 4) auth readiness
    const auth = window.SL_AUTH || {};
    const sb = auth.sb || null;

    if (auth.ready && typeof auth.ready.then === "function") {
      try {
        await auth.ready;
      } catch {}
    }

    if (sb) {
      // return flow may navigate away
      const navigated = await handleReturnFlow(sb);
      if (navigated) return;

      // reflect initial signed-in state
      const s = await getSession(sb);
      if (s) showSignedIn(s.user && s.user.email);
      else showSignedOut();

      // keep UI in sync on auth state changes
      try {
        sb.auth.onAuthStateChange((_event, session) => {
          if (session) showSignedIn(session.user && session.user.email);
          else showSignedOut();
        });
      } catch {}

      // sign out button (if present)
      const signout = $("#sl-signout");
      if (signout) {
        signout.addEventListener("click", async () => {
          try {
            await sb.auth.signOut();
          } catch {}
          try {
            localStorage.removeItem(LS_KEY);
          } catch {}
          location.href = "/upgrade/#checkout";
        });
      }

      // checkout wiring
      wireCheckoutButton(sb);

      // If on upgrade page and user clicks a category unlock while signed in, go straight to checkout page
      const unlockedBtns = $$("[data-category], button[id^='sl-unlock-']");
      unlockedBtns.forEach((btn) => {
        const cat =
          safeSlug(btn.getAttribute("data-category")) ||
          safeSlug((btn.id || "").replace(/^sl-unlock-/, ""));
        if (!cat) return;

        btn.addEventListener("click", async (e) => {
          // Only take over if we’re on /upgrade and signed in
          if (isCheckoutPage()) return;

          const s = await getSession(sb);
          if (!s) return;

          e.preventDefault();
          await goToCheckoutFor(cat, true);
        });
      });
    }

    // 5) If URL has #checkout, scroll there
    if (location.hash === "#checkout") {
      setTimeout(() => scrollToHash("#checkout"), 50);
    }
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      init().catch(() => {});
    });
  } else {
    init().catch(() => {});
  }
})();

