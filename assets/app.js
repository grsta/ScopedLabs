/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Goals:
   1) Preserve Supabase session across navigation (upgrade <-> checkout).
   2) On /upgrade/checkout/:
      - hide login UI always
      - require session; if missing, bounce to /upgrade/#checkout
      - disable Checkout if category missing
      - wire Checkout -> POST /api/create-checkout-session -> redirect to Stripe
   3) On /upgrade/:
      - wait for session restore before showing "Not signed in"
      - if already signed in, category buttons go straight to /upgrade/checkout/?category=...
      - if not signed in, category buttons go to /upgrade/?category=...#checkout
*/

(() => {
  "use strict";

  const PATH = location.pathname || "/";
  const IS_CHECKOUT_PAGE = PATH.startsWith("/upgrade/checkout");

  // Supabase client must be created by /assets/auth.js (loaded BEFORE this)
  const sb =
    (window.SL_AUTH && window.SL_AUTH.sb) ||
    (window.SL_AUTH && window.SL_AUTH.client) ||
    null;

  const $ = (id) => document.getElementById(id);

  // Elements (may or may not exist depending on page)
  const els = {
    // Category UI
    selectedLabel: $("sl-selected-category"),
    catPill: $("sl-category-pill"),
    catCardSelected: $("sl-checkout-selected"),
    changeCatBtn: $("sl-change-category"),
    chooseCatBtn: $("sl-choose-category"),

    // Auth UI
    loginCard: $("sl-login-card"),
    emailInput: $("sl-email"),
    sendLinkBtn: $("sl-sendlink"),
    emailHint: $("sl-email-hint"),

    // Checkout UI
    checkoutCard: $("sl-checkout-card"),
    checkoutBtn: $("sl-checkout"),
    signoutBtn: $("sl-signout"),
    status: $("sl-status"),
  };

  // State
  let currentCategory = "";
  let currentSession = null;

  // ---- helpers ----
  function normCategory(v) {
    return (v || "").toString().trim().toLowerCase();
  }

  function getCategoryFromURL() {
    try {
      const u = new URL(location.href);
      return normCategory(u.searchParams.get("category"));
    } catch {
      return "";
    }
  }

  function getCategoryFromStorage() {
    try {
      return normCategory(localStorage.getItem("sl_selected_category"));
    } catch {
      return "";
    }
  }

  function setCategory(cat) {
    currentCategory = normCategory(cat);
    try {
      if (currentCategory) localStorage.setItem("sl_selected_category", currentCategory);
    } catch {}
  }

  function setStatus(msg) {
    if (els.status) els.status.textContent = msg || "";
  }

  function updateCategoryUI() {
    const cat = currentCategory || "";
    const label = cat ? cat : "None selected";

    if (els.selectedLabel) els.selectedLabel.textContent = label;
    if (els.catPill) els.catPill.textContent = label;
    if (els.catCardSelected) els.catCardSelected.textContent = label;

    // checkout page usually doesn't have "choose category" button; upgrade page might
    if (IS_CHECKOUT_PAGE) {
      if (els.chooseCatBtn) els.chooseCatBtn.style.display = "none";
      if (els.changeCatBtn) els.changeCatBtn.style.display = "";
    }
  }

  async function refreshSession() {
    if (!sb) return null;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) return null;
      return data ? data.session : null;
    } catch {
      return null;
    }
  }

  function hasSupabaseAuthParams() {
    // magic link exchange might include these params temporarily
    try {
      const u = new URL(location.href);
      const qp = u.searchParams;

      if (qp.has("code")) return true;
      if (qp.has("token_hash")) return true;
      if (qp.has("type")) return true;
      if (qp.has("access_token")) return true;
      if (qp.has("refresh_token")) return true;

      const h = (location.hash || "").toLowerCase();
      if (h.includes("access_token=") || h.includes("refresh_token=") || h.includes("type=recovery"))
        return true;

      return false;
    } catch {
      return false;
    }
  }

  async function waitForSessionExchange(timeoutMs = 9000) {
    if (!sb) return null;

    const start = Date.now();

    // quick check first
    let s = await refreshSession();
    if (s) return s;

    return await new Promise((resolve) => {
      let done = false;
      let unsub = null; // MUST exist before finish()

      const finish = (val) => {
        if (done) return;
        done = true;

        try {
          if (unsub) unsub();
        } catch {}

        resolve(val || null);
      };

      const sub = sb.auth.onAuthStateChange((_event, session) => {
        if (session) finish(session);
      });

      // attach unsubscribe safely
      try {
        unsub =
          sub &&
          sub.data &&
          sub.data.subscription &&
          sub.data.subscription.unsubscribe
            ? () => sub.data.subscription.unsubscribe()
            : null;
      } catch {
        unsub = null;
      }

      const tick = async () => {
        if (done) return;

        const elapsed = Date.now() - start;
        if (elapsed > timeoutMs) return finish(null);

        const ss = await refreshSession();
        if (ss) return finish(ss);

        setTimeout(tick, 250);
      };

      tick();
    });
  }

  function applySignedInUI(session) {
    const email = session?.user?.email || "user";
    setStatus(`Signed in as ${email}`);

    if (els.checkoutCard) els.checkoutCard.style.display = "";
    if (els.signoutBtn) els.signoutBtn.style.display = "";
    if (els.loginCard) els.loginCard.style.display = "none";
  }

  function applySignedOutUI() {
    setStatus("Not signed in");

    if (els.checkoutCard) els.checkoutCard.style.display = "none";
    if (els.signoutBtn) els.signoutBtn.style.display = "none";
    if (els.loginCard) els.loginCard.style.display = "";
  }

  function hideLoginUIOnCheckout() {
    if (els.loginCard) els.loginCard.style.display = "none";
    if (els.emailInput) els.emailInput.value = "";
  }

  function goToCheckoutFor(cat) {
    const c = normCategory(cat);
    if (!c) return;

    try {
      localStorage.setItem("sl_selected_category", c);
    } catch {}

    // If signed in -> go straight to checkout page
    if (currentSession) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(c);
    } else {
      // Not signed in -> stay on upgrade and show login + checkout section
      location.href = "/upgrade/?category=" + encodeURIComponent(c) + "#checkout";
    }
  }

  function bindCategoryButtonsOnUpgrade() {
    // We support:
    // 1) elements with data-category
    // 2) ids like sl-unlock-thermal
    // 3) anchors/buttons whose href contains ?category=<cat>
    const nodes = new Set();

    document.querySelectorAll("[data-category]").forEach((n) => nodes.add(n));
    document.querySelectorAll('[id^="sl-unlock-"]').forEach((n) => nodes.add(n));
    document.querySelectorAll('a[href*="category="], button[onclick*="category="]').forEach((n) =>
      nodes.add(n)
    );

    nodes.forEach((el) => {
      if (!el || el.dataset.boundGoToCheckout) return;
      el.dataset.boundGoToCheckout = "1";

      let cat = "";

      if (el.dataset.category) cat = el.dataset.category;
      if (!cat && el.id && el.id.startsWith("sl-unlock-")) cat = el.id.slice("sl-unlock-".length);

      // Try parsing href if it exists
      if (!cat) {
        try {
          const href = el.getAttribute("href");
          if (href && href.includes("category=")) {
            const u = new URL(href, location.origin);
            cat = u.searchParams.get("category") || "";
          }
        } catch {}
      }

      cat = normCategory(cat);
      if (!cat) return;

      el.addEventListener("click", (e) => {
        // prevent anchor navigation so we control destination
        try {
          if (el.tagName && el.tagName.toLowerCase() === "a") e.preventDefault();
        } catch {}
        goToCheckoutFor(cat);
      });
    });
  }

  async function init() {
    if (!sb) {
      setStatus("Auth not ready. (auth.js must load before app.js)");
      return;
    }

    // Category resolution
    const urlCat = getCategoryFromURL();
    const storedCat = getCategoryFromStorage();
    setCategory(urlCat || storedCat || "");
    updateCategoryUI();

    // Change/Choose category buttons
    if (els.changeCatBtn) {
      els.changeCatBtn.addEventListener("click", () => {
        const known = normCategory(currentCategory || getCategoryFromStorage());
        const url = known
          ? `/upgrade/?category=${encodeURIComponent(known)}#categories`
          : `/upgrade/#categories`;
        location.href = url;
      });
    }

    if (els.chooseCatBtn) {
      els.chooseCatBtn.addEventListener("click", () => {
        location.href = `/upgrade/#categories`;
      });
    }

    // Keep UI synced without flicker on upgrade page
    sb.auth.onAuthStateChange((_event, session) => {
      // checkout page does its own flow below
      if (IS_CHECKOUT_PAGE) return;

      if (session) {
        currentSession = session;
        applySignedInUI(session);
        // after signed in, ensure category buttons route to checkout
        bindCategoryButtonsOnUpgrade();
      } else {
        // do NOT force signed-out UI instantly; init() will handle with a delay
      }
    });

    // =============================
    // CHECKOUT PAGE
    // =============================
    if (IS_CHECKOUT_PAGE) {
      hideLoginUIOnCheckout();

      // If arriving from magic link, allow time for exchange
      const cameFromAuth = hasSupabaseAuthParams();
      if (cameFromAuth) setStatus("Signing you in…");

      currentSession = await (cameFromAuth ? waitForSessionExchange(9000) : refreshSession());

      // If auth params were already cleaned but session restore is mid-flight, wait a little
      if (!currentSession) currentSession = await waitForSessionExchange(3500);

      if (!currentSession) {
        // Must be signed in to use checkout page
        const known = normCategory(currentCategory || getCategoryFromStorage());
        const url = known
          ? `/upgrade/?category=${encodeURIComponent(known)}#checkout`
          : `/upgrade/#checkout`;
        location.replace(url);
        return;
      }

      // Signed in on checkout
      applySignedInUI(currentSession);

      // Category gate
      if (!currentCategory) {
        setStatus("Choose a category to continue.");
        if (els.checkoutBtn) els.checkoutBtn.disabled = true;
      } else {
        if (els.checkoutBtn) els.checkoutBtn.disabled = false;
      }

      // Wire checkout button (only once)
      if (els.checkoutBtn && !els.checkoutBtn.dataset.boundCheckout) {
        els.checkoutBtn.dataset.boundCheckout = "1";

        els.checkoutBtn.addEventListener("click", async () => {
          if (!currentSession) return;
          if (!currentCategory) return;

          els.checkoutBtn.disabled = true;
          setStatus("Opening Stripe Checkout…");

          try {
            const res = await fetch("/api/create-checkout-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                category: currentCategory,
                email: (currentSession.user && currentSession.user.email) || null,
              }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (!data || !data.url) throw new Error("Missing url");

            location.href = data.url;
          } catch (err) {
            els.checkoutBtn.disabled = false;
            setStatus("Failed to start checkout");
            console.warn("[checkout] start failed:", err);
          }
        });
      }

      // Sign out button (if present)
      if (els.signoutBtn && !els.signoutBtn.dataset.boundSignout) {
        els.signoutBtn.dataset.boundSignout = "1";
        els.signoutBtn.addEventListener("click", async () => {
          try {
            await sb.auth.signOut();
          } catch {}
          location.href = "/upgrade/#checkout";
        });
      }

      return; // done with checkout page
    }

    // =============================
    // UPGRADE PAGE
    // =============================
    setStatus("Restoring session…");

    // Bind buttons now (works whether signed in or not; destination differs)
    bindCategoryButtonsOnUpgrade();

    // Wait longer before declaring "Not signed in" (prevents the lie/flicker)
    currentSession = await refreshSession();
    if (!currentSession) currentSession = await waitForSessionExchange(8000);

    if (currentSession) {
      applySignedInUI(currentSession);
      bindCategoryButtonsOnUpgrade();
    } else {
      applySignedOutUI();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
