/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   PRINCIPLES
   - auth.js creates ONE Supabase client and exposes it as: window.SL_AUTH.sb
   - auth.js is responsible for magic-link sending + code exchange on the page that receives the link.
   - app.js only:
       * reads category (URL -> localStorage)
       * shows/hides UI based on (session + category)
       * routes: Upgrade page buttons -> Checkout page (ONLY if signed in)
       * wires Checkout + Sign out buttons

   IMPORTANT
   - Do NOT try to "exchangeCodeForSession" here. If the magic-link arrives on /upgrade/checkout/
     without the PKCE verifier in storage, Supabase will throw:
       AuthPKCECodeVerifierMissingError
     and you'll get stuck in "Signing you in...".
     Instead: if no session is present, bounce back to /upgrade/#checkout to re-send the link.
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");
  const sb =
    (window.SL_AUTH && window.SL_AUTH.sb) ||
    (window.SL_AUTH && window.SL_AUTH.client) ||
    null;

  const $ = (id) => document.getElementById(id);

  // Elements (IDs may or may not exist depending on page)
  const els = {
    // Category UI (varies by page)
    selectedLabel: $("sl-selected-category"), // checkout page pill
    catPill: $("sl-category-pill"),           // upgrade page pill
    catCardSelected: $("sl-checkout-selected"),
    changeCatBtn: $("sl-change-category"),
    chooseCatBtn: $("sl-choose-category"),

    // Auth UI (upgrade page)
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

  // --------------- helpers ---------------
  function normCategory(v) {
    return (v || "").toString().trim().toLowerCase();
  }

  function getCategoryFromURL() {
    const u = new URL(location.href);
    return normCategory(u.searchParams.get("category"));
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

    if (els.selectedLabel) els.selectedLabel.textContent = cat ? cat : "None selected";
    if (els.catPill) els.catPill.textContent = cat ? cat : "None selected";
    if (els.catCardSelected) els.catCardSelected.textContent = cat ? cat : "None selected";

    // On checkout page we only show "change category" (no "choose" button)
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

  function goUpgradeAnchor(anchor) {
    const cat = normCategory(currentCategory || getCategoryFromStorage() || getCategoryFromURL());
    const url = cat
      ? `/upgrade/?category=${encodeURIComponent(cat)}#${anchor}`
      : `/upgrade/#${anchor}`;
    location.href = url;
  }

  function goCheckout(cat) {
    const c = normCategory(cat);
    if (!c) return;
    try { localStorage.setItem("sl_selected_category", c); } catch {}
    location.href = `/upgrade/checkout/?category=${encodeURIComponent(c)}`;
  }

  // --------------- UI state ---------------
  function applySignedInUI(session) {
    currentSession = session;
    const email = session?.user?.email || "user";
    setStatus(`Signed in as ${email}`);

    if (els.checkoutCard) els.checkoutCard.style.display = "";
    if (els.signoutBtn) els.signoutBtn.style.display = "";
    if (els.loginCard) els.loginCard.style.display = "none";

    // Upgrade page: once signed in, keep checkout button disabled until category exists
    if (!IS_CHECKOUT_PAGE && els.checkoutBtn) {
      els.checkoutBtn.disabled = !currentCategory;
    }
  }

  function applySignedOutUI() {
    currentSession = null;
    setStatus("Not signed in");

    if (els.checkoutCard) els.checkoutCard.style.display = "none";
    if (els.signoutBtn) els.signoutBtn.style.display = "none";
    if (els.loginCard) els.loginCard.style.display = "";
    if (els.checkoutBtn) els.checkoutBtn.disabled = true;
  }

  // --------------- binding ---------------
  function bindCategoryUnlockButtons() {
    // Buttons/links on upgrade page should have: data-category="network"
    // Fallback: id="sl-unlock-network"
    const nodes = [];

    // Prefer scoping to a categories container if present
    const roots = [];
    const r1 = document.getElementById("categories");
    const r2 = document.getElementById("sl-categories");
    if (r1) roots.push(r1);
    if (r2) roots.push(r2);

    if (roots.length) {
      roots.forEach((r) => {
        r.querySelectorAll("button[data-category], a[data-category]").forEach((n) => nodes.push(n));
      });
    } else {
      document.querySelectorAll("button[data-category], a[data-category]").forEach((n) => nodes.push(n));
    }

    if (!nodes.length) {
      document.querySelectorAll('button[id^="sl-unlock-"], a[id^="sl-unlock-"]').forEach((n) => nodes.push(n));
    }

    nodes.forEach((btn) => {
      if (btn.dataset.boundGoToCheckout) return;
      btn.dataset.boundGoToCheckout = "1";

      let cat = btn.dataset.category || "";
      if (!cat && btn.id && btn.id.startsWith("sl-unlock-")) cat = btn.id.slice("sl-unlock-".length);
      cat = normCategory(cat);
      if (!cat) return;

      btn.addEventListener("click", (e) => {
        // Stop <a> default nav so we control flow consistently
        try { if ((btn.tagName || "").toLowerCase() === "a") e.preventDefault(); } catch {}

        setCategory(cat);
        updateCategoryUI();

        // Requirement: ONLY go to checkout page if already signed in.
        if (currentSession) {
          goCheckout(cat);
        } else {
          // Not signed in: stay on upgrade checkout section (so user can send link)
          goUpgradeAnchor("checkout");
        }
      });
    });
  }

  function bindChangeCategoryButtons() {
    if (els.changeCatBtn) {
      els.changeCatBtn.addEventListener("click", () => goUpgradeAnchor("categories"));
    }
    if (els.chooseCatBtn) {
      els.chooseCatBtn.addEventListener("click", () => goUpgradeAnchor("categories"));
    }
  }

  function bindCheckoutButton() {
    if (!els.checkoutBtn || els.checkoutBtn.dataset.boundCheckout) return;
    els.checkoutBtn.dataset.boundCheckout = "1";

    els.checkoutBtn.addEventListener("click", async () => {
      // On upgrade page this button should route to checkout page (if signed in)
      if (!IS_CHECKOUT_PAGE) {
        if (!currentSession) return;
        if (!currentCategory) return;
        goCheckout(currentCategory);
        return;
      }

      // On checkout page this button starts Stripe Checkout
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
            email: currentSession.user?.email || null,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (!data || !data.url) throw new Error("Missing url");

        location.href = data.url;
      } catch (err) {
        console.error("[checkout] failed", err);
        els.checkoutBtn.disabled = false;
        setStatus("Failed to start checkout");
      }
    });
  }

  function bindSignOutButton() {
    if (!els.signoutBtn || els.signoutBtn.dataset.boundSignout) return;
    els.signoutBtn.dataset.boundSignout = "1";

    els.signoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await sb.auth.signOut();
      } catch (err) {
        console.warn("[auth] signOut failed", err);
      }

      // Keep category selection; return to upgrade checkout so user can sign back in.
      goUpgradeAnchor("checkout");
    });
  }

  // --------------- init ---------------
  async function init() {
    if (!sb) {
      setStatus("Auth not ready. (auth.js must load before app.js)");
      return;
    }

    // Category: URL wins, else localStorage
    const urlCat = getCategoryFromURL();
    const storedCat = getCategoryFromStorage();
    setCategory(urlCat || storedCat || "");
    updateCategoryUI();

    bindChangeCategoryButtons();
    bindCheckoutButton();
    bindSignOutButton();

    // Keep session UI in sync
    sb.auth.onAuthStateChange((_event, session) => {
      if (session) applySignedInUI(session);
      else applySignedOutUI();
    });

    // On load, try to restore session (NO PKCE exchange here)
    currentSession = await refreshSession();

    if (IS_CHECKOUT_PAGE) {
      // Checkout page MUST have an active session.
      if (!currentSession) {
        setStatus("Not signed in — returning to Upgrade…");
        setTimeout(() => goUpgradeAnchor("checkout"), 700);
        return;
      }

      applySignedInUI(currentSession);

      // Category gating on checkout page
      if (!currentCategory) {
        setStatus("Choose a category to continue.");
        if (els.checkoutBtn) els.checkoutBtn.disabled = true;
      } else {
        if (els.checkoutBtn) els.checkoutBtn.disabled = false;
      }

      return;
    }

    // Upgrade page behavior
    bindCategoryUnlockButtons();

    if (currentSession) applySignedInUI(currentSession);
    else applySignedOutUI();

    // If user is signed in and has a category, enable the checkout button.
    if (els.checkoutBtn) els.checkoutBtn.disabled = !(currentSession && currentCategory);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

