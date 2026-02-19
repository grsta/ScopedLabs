/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Fixed behaviors:
   - Upgrade page always shows the full categories list (HTML controls that).
   - Category selection updates:
       URL ?category=
       localStorage sl_selected_category
       UI label/pill + preview card
   - Signed-in UI is correct on BOTH pages:
       Upgrade page: show login section OR checkout actions section
       Checkout page: show checkout button + signout + signed-in label
   - Change Category:
       Upgrade page button -> scrolls to #choose
       Checkout page button -> goes to /upgrade/?return=checkout#choose
   - Signed-in users clicking a category "Unlock ____ Pro" go directly to checkout page.
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");
  const ANCHOR_CHOOSE = "choose";     // upgrade page categories section id
  const ANCHOR_CHECKOUT = "checkout"; // upgrade page checkout card id

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const pick = (...els) => els.find(Boolean) || null;

  const els = {
    // Shared
    status: () => pick($("sl-status"), $("sl-auth-status"), $("status")),

    // Category UI
    selectedCategoryPill: () => pick($("sl-selected-category"), $("sl-selected-category-preview")),
    selectedCategoryLabel: () => pick($("sl-selected-category-preview-label"), $("sl-selected-category-label")),
    selectedCategoryPreviewCard: () => $("sl-selected-category-preview-card"),
    selectedCategoryName: () => $("sl-selected-category-name"),
    selectedCategoryDesc: () => $("sl-selected-category-desc"),

    // Upgrade page sections
    loginSection: () => $("sl-login"),
    checkoutSection: () => $("sl-checkout"),
    checkoutCard: () => $("sl-checkout-card"),

    // Auth / account UI
    signedInAs: () => pick($("sl-signed-in-as"), $("sl-auth-user")),
    emailInput: () => pick($("sl-email"), $("sl-email-input"), $("email")),
    sendLinkBtn: () => pick($("sl-sendlink"), $("sl-send-btn")),
    signoutBtn: () => $("sl-signout"),

    // Checkout page controls
    checkoutBtn: () => $("sl-checkout"),
    changeCategoryBtn: () => $("sl-change-category"),
    goAccountBtn: () => $("sl-account"),
  };

  function setStatus(msg) {
    const st = els.status();
    if (!st) return;
    st.textContent = msg || "";
  }

  function getUrlCategory() {
    const u = new URL(location.href);
    return (u.searchParams.get("category") || "").trim();
  }

  function setUrlCategory(cat) {
    const u = new URL(location.href);
    if (cat) u.searchParams.set("category", cat);
    else u.searchParams.delete("category");
    history.replaceState({}, document.title, u.toString());
  }

  function getStoredCategory() {
    try {
      return (localStorage.getItem("sl_selected_category") || "").trim();
    } catch {
      return "";
    }
  }

  function setStoredCategory(cat) {
    try {
      if (cat) localStorage.setItem("sl_selected_category", cat);
      else localStorage.removeItem("sl_selected_category");
    } catch {}
  }

  function getCurrentCategory() {
    return getUrlCategory() || getStoredCategory() || "";
  }

  function setCurrentCategory(cat) {
    const c = (cat || "").trim();
    setStoredCategory(c);
    setUrlCategory(c);
    refreshCategoryUI(c);
  }

  function refreshCategoryUI(cat) {
    const c = (cat || "").trim();

    const pill = els.selectedCategoryPill();
    if (pill) pill.textContent = c ? c : "None";

    const label = els.selectedCategoryLabel();
    if (label) label.textContent = c ? c : "None";

    // Optional preview card content (upgrade page)
    const nameEl = els.selectedCategoryName();
    const descEl = els.selectedCategoryDesc();
    if (nameEl) nameEl.textContent = c ? titleize(c) : "None selected";
    if (descEl) {
      descEl.textContent = c
        ? "You’ll unlock this category forever (one-time purchase)."
        : "Pick a category to unlock. Then sign in to continue.";
    }

    // Show/hide preview card if it exists
    const card = els.selectedCategoryPreviewCard();
    if (card) card.style.display = c ? "" : "";
  }

  function titleize(slug) {
    return String(slug)
      .split("-")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
      .join(" ");
  }

  function getReturnMode() {
    const u = new URL(location.href);
    return (u.searchParams.get("return") || "").trim(); // "checkout" or ""
  }

  function setReturnMode(val) {
    const u = new URL(location.href);
    if (val) u.searchParams.set("return", val);
    else u.searchParams.delete("return");
    history.replaceState({}, document.title, u.toString());
  }

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- Auth / session helpers ----------
  async function getSb() {
    // Wait for auth.js to expose the client
    if (!window.SL_AUTH || !window.SL_AUTH.ready) return null;
    try {
      await window.SL_AUTH.ready;
    } catch {}
    return window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null;
  }

  async function getSession() {
    const sb = await getSb();
    if (!sb) return null;
    try {
      const { data } = await sb.auth.getSession();
      return data && data.session ? data.session : null;
    } catch {
      return null;
    }
  }

  function showSignedOutUI() {
    // Upgrade page: show login section, hide checkout actions
    const login = els.loginSection();
    const checkout = els.checkoutSection();
    const card = els.checkoutCard();

    if (!IS_CHECKOUT_PAGE) {
      if (card) card.style.display = "";
      if (login) login.style.display = "";
      if (checkout) checkout.style.display = "none";
    }

    // Checkout page: disable checkout button
    const btn = els.checkoutBtn();
    if (btn) btn.disabled = true;

    const signed = els.signedInAs();
    if (signed) signed.textContent = "";

    // Keep status quiet; auth.js handles "Check your email…" etc.
  }

  function showSignedInUI(session) {
    const email = session && session.user ? session.user.email : "";

    const signed = els.signedInAs();
    if (signed) signed.textContent = email ? `Signed in as ${email}` : "Signed in";

    if (!IS_CHECKOUT_PAGE) {
      const login = els.loginSection();
      const checkout = els.checkoutSection();
      const card = els.checkoutCard();

      if (card) card.style.display = "";
      if (login) login.style.display = "none";
      if (checkout) checkout.style.display = "";
    }

    // Checkout page: enable checkout button only if category exists
    const btn = els.checkoutBtn();
    const cat = getCurrentCategory();
    if (btn) btn.disabled = !cat;
  }

  // ---------- Navigation ----------
  function goToCheckoutFor(cat) {
    const c = (cat || "").trim();
    setCurrentCategory(c);

    // If signed in -> straight to checkout page
    // If signed out -> stay on upgrade page and scroll to checkout card
    getSession().then((sess) => {
      if (sess) {
        location.href = `/upgrade/checkout/?category=${encodeURIComponent(c)}`;
      } else {
        // Ensure we're on upgrade page
        if (IS_CHECKOUT_PAGE) {
          location.href = `/upgrade/?category=${encodeURIComponent(c)}#${ANCHOR_CHECKOUT}`;
          return;
        }
        // Stay and scroll
        location.hash = `#${ANCHOR_CHECKOUT}`;
        scrollToId(ANCHOR_CHECKOUT);
        const emailEl = els.emailInput();
        if (emailEl) emailEl.focus();
      }
    });
  }

  function wireCategoryLinks() {
    // Any category unlock CTA links like: /upgrade/?category=wireless#checkout
    const links = $$('a.btn[href^="/upgrade/?category="], a[href^="/upgrade/?category="]');
    links.forEach((a) => {
      const href = a.getAttribute("href") || "";
      const m = href.match(/[?&]category=([^&#]+)/);
      if (!m) return;
      const cat = decodeURIComponent(m[1]);

      a.addEventListener("click", (e) => {
        // Always set the category locally + UI
        setCurrentCategory(cat);

        // If signed in, force direct checkout page (no loop, no stale state)
        e.preventDefault();
        goToCheckoutFor(cat);
      });
    });

    // Also support any element that has data-category
    const dataBtns = $$("[data-category]");
    dataBtns.forEach((el) => {
      const cat = (el.getAttribute("data-category") || "").trim();
      if (!cat) return;
      el.addEventListener("click", (e) => {
        e.preventDefault();
        goToCheckoutFor(cat);
      });
    });
  }

  function wireChangeCategoryButtons() {
    // Upgrade page "Change Category" button (inside checkout card)
    const btn = els.changeCategoryBtn();
    if (!btn) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();

      if (IS_CHECKOUT_PAGE) {
        // Checkout page -> go back to upgrade page categories list
        const cat = getCurrentCategory();
        const qs = cat ? `?return=checkout&category=${encodeURIComponent(cat)}` : `?return=checkout`;
        location.href = `/upgrade/${qs}#${ANCHOR_CHOOSE}`;
        return;
      }

      // Upgrade page -> just scroll to categories list
      location.hash = `#${ANCHOR_CHOOSE}`;
      scrollToId(ANCHOR_CHOOSE);
    });
  }

  function wireContinueToCheckout() {
    // Upgrade page "Continue to checkout" button (id=sl-checkout)
    const btn = els.checkoutBtn();
    if (!btn) return;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const cat = getCurrentCategory();
      if (!cat) {
        setStatus("Choose a category first.");
        location.hash = `#${ANCHOR_CHOOSE}`;
        scrollToId(ANCHOR_CHOOSE);
        return;
      }

      const sess = await getSession();
      if (!sess) {
        // Not signed in -> scroll to checkout so they can send magic link
        location.hash = `#${ANCHOR_CHECKOUT}`;
        scrollToId(ANCHOR_CHECKOUT);
        const emailEl = els.emailInput();
        if (emailEl) emailEl.focus();
        return;
      }

      // Signed in -> go to checkout page
      location.href = `/upgrade/checkout/?category=${encodeURIComponent(cat)}`;
    });
  }

  function wireCheckoutPageStripeButton() {
    if (!IS_CHECKOUT_PAGE) return;

    const btn = els.checkoutBtn();
    if (!btn) return;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();

      const sess = await getSession();
      const cat = getCurrentCategory();

      if (!sess) return;
      if (!cat) {
        setStatus("Choose a category to continue.");
        btn.disabled = true;
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
            email: sess.user.email,
          }),
        });

        if (!res.ok) throw new Error("checkout_failed");

        const data = await res.json();
        if (!data || !data.url) throw new Error("missing_url");

        location.href = data.url;
      } catch (err) {
        console.warn("[SL_APP] checkout error:", err);
        btn.disabled = false;
        setStatus("Failed to start checkout");
      }
    });
  }

  function wireSignOut() {
    const btn = els.signoutBtn();
    if (!btn) return;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const sb = await getSb();
        if (sb) await sb.auth.signOut();
      } catch {}

      // Keep category selection (optional) — but you can clear if you prefer:
      // setStoredCategory("");

      if (IS_CHECKOUT_PAGE) {
        const cat = getCurrentCategory();
        location.href = cat
          ? `/upgrade/?category=${encodeURIComponent(cat)}#${ANCHOR_CHECKOUT}`
          : `/upgrade/#${ANCHOR_CHECKOUT}`;
      } else {
        // Just refresh UI on upgrade page
        showSignedOutUI();
      }
    });
  }

  // ---------- Boot ----------
  async function init() {
    // Category init
    const initialCat = getCurrentCategory();
    if (initialCat) setCurrentCategory(initialCat);
    else refreshCategoryUI("");

    // If return=checkout is present on upgrade page and signed in,
    // selecting any category should go straight to checkout (we already enforce this).
    // If return=checkout present and category exists and signed in, go to checkout immediately.
    if (!IS_CHECKOUT_PAGE) {
      const ret = getReturnMode();
      if (ret === "checkout") {
        const sess = await getSession();
        const cat = getCurrentCategory();
        if (sess && cat) {
          location.href = `/upgrade/checkout/?category=${encodeURIComponent(cat)}`;
          return;
        }
      }
    }

    // Wire UI
    wireCategoryLinks();
    wireChangeCategoryButtons();
    wireContinueToCheckout();
    wireCheckoutPageStripeButton();
    wireSignOut();

    // Reflect signed-in state now + on changes
    const sb = await getSb();
    if (sb) {
      const s = await getSession();
      if (s) showSignedInUI(s);
      else showSignedOutUI();

      sb.auth.onAuthStateChange((_event, session) => {
        if (session) showSignedInUI(session);
        else showSignedOutUI();
      });
    } else {
      // No supabase client -> treat as signed out
      showSignedOutUI();
    }
  }

  init();
})();
