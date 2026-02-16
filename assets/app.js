/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Rules:
   - Category is synced between: URL ?category=, localStorage(sl_selected_category), and UI label(s)
   - Clicking a category unlock:
       * If signed in -> /upgrade/checkout/?category=CAT
       * If not signed in -> /upgrade/?category=CAT#checkout
   - Checkout page requires session; otherwise bounce to /upgrade/#checkout
   - Sign out button works (sb.auth.signOut()) and returns to /upgrade/#checkout
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");

  const sb =
    (window.SL_AUTH && window.SL_AUTH.sb) ||
    (window.SL_AUTH && window.SL_AUTH.client) ||
    null;

  const $ = (id) => document.getElementById(id);

  const els = {
    selectedLabel: $("sl-selected-category"),
    catPill: $("sl-category-pill"),
    catCardSelected: $("sl-checkout-selected"),
    changeCatBtn: $("sl-change-category"),

    loginCard: $("sl-login-card"),

    checkoutCard: $("sl-checkout-card"),
    checkoutBtn: $("sl-checkout"),
    signoutBtn: $("sl-signout"),
    status: $("sl-status"),
  };

  let currentCategory = "";
  let currentSession = null;

  function normCategory(v) {
    return (v || "").toString().trim().toLowerCase();
  }

  function getCategoryFromURL() {
    const u = new URL(location.href);
    return normCategory(u.searchParams.get("category"));
  }

  function getCategoryFromStorage() {
    try { return normCategory(localStorage.getItem("sl_selected_category")); } catch { return ""; }
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

    if (IS_CHECKOUT_PAGE && els.checkoutBtn) {
      els.checkoutBtn.disabled = !cat;
    }
  }

  async function refreshSession() {
    if (!sb) return null;
    const { data, error } = await sb.auth.getSession();
    if (error) return null;
    return data?.session || null;
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
    if (els.signoutBtn) els.signoutBtn.style.display = "none";
    if (els.loginCard) els.loginCard.style.display = IS_CHECKOUT_PAGE ? "none" : "";
    if (els.checkoutCard) els.checkoutCard.style.display = IS_CHECKOUT_PAGE ? "" : "none";
  }

  function extractCategoryFromNode(node) {
    if (!node) return "";

    const dc = normCategory(node.dataset && node.dataset.category);
    if (dc) return dc;

    const id = (node.id || "").trim();
    if (id.startsWith("sl-unlock-")) return normCategory(id.slice("sl-unlock-".length));

    const href = (node.getAttribute && node.getAttribute("href")) || "";
    if (href && href.includes("category=")) {
      try {
        const u = new URL(href, location.origin);
        const c = normCategory(u.searchParams.get("category"));
        if (c) return c;
      } catch {}
    }

    return "";
  }

  function goToCheckoutFor(cat) {
    const c = normCategory(cat);
    if (!c) return;

    setCategory(c);
    updateCategoryUI();

    if (currentSession) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(c);
    } else {
      location.href = "/upgrade/?category=" + encodeURIComponent(c) + "#checkout";
    }
  }

  function bindCategoryUnlockButtons() {
    // Delegation; only intercept if we can extract a category.
    document.addEventListener("click", (e) => {
      const t = e.target && e.target.closest ? e.target.closest("a,button") : null;
      if (!t) return;

      const cat = extractCategoryFromNode(t);
      if (!cat) return;

      try { e.preventDefault(); } catch {}
      goToCheckoutFor(cat);
    });
  }

  function bindChangeCategoryButton() {
    if (!els.changeCatBtn) return;
    els.changeCatBtn.addEventListener("click", () => {
      const known = normCategory(currentCategory || getCategoryFromStorage());
      const url = known
        ? `/upgrade/?category=${encodeURIComponent(known)}#categories`
        : `/upgrade/#categories`;
      location.href = url;
    });
  }

  function bindCheckoutButton() {
    if (!els.checkoutBtn) return;
    if (els.checkoutBtn.dataset.boundCheckout) return;
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
            email: currentSession?.user?.email || null,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data?.url) throw new Error("Missing url");

        location.href = data.url;
      } catch (err) {
        console.error("[checkout] create session failed:", err);
        els.checkoutBtn.disabled = false;
        setStatus("Failed to start checkout");
      }
    });
  }

  function bindSignOut() {
    if (!els.signoutBtn) return;

    els.signoutBtn.addEventListener("click", async (e) => {
      try { e.preventDefault(); } catch {}
      if (!sb) return;

      setStatus("Signing out…");
      try { await sb.auth.signOut(); } catch (err) { console.error("[auth] signOut failed:", err); }

      currentSession = null;
      applySignedOutUI();

      const known = normCategory(currentCategory || getCategoryFromStorage());
      location.href = known ? `/upgrade/?category=${encodeURIComponent(known)}#checkout` : `/upgrade/#checkout`;
    });
  }

  async function init() {
    if (!sb) {
      setStatus("Auth not ready. (auth.js must load before app.js)");
      return;
    }

    // Category sync on load
    setCategory(getCategoryFromURL() || getCategoryFromStorage() || "");
    updateCategoryUI();

    if (!IS_CHECKOUT_PAGE) bindCategoryUnlockButtons();
    bindChangeCategoryButton();

    // session restore (auth.js handles exchange; here we only read)
    currentSession = await refreshSession();

    if (IS_CHECKOUT_PAGE) {
      if (!currentSession) {
        const known = normCategory(currentCategory || getCategoryFromStorage());
        location.replace(known ? `/upgrade/?category=${encodeURIComponent(known)}#checkout` : `/upgrade/#checkout`);
        return;
      }

      applySignedInUI(currentSession);
      updateCategoryUI();
      bindCheckoutButton();
      bindSignOut();
      return;
    }

    // upgrade page
    if (currentSession) applySignedInUI(currentSession);
    else applySignedOutUI();

    sb.auth.onAuthStateChange((_evt, sess) => {
      currentSession = sess || null;
      if (currentSession) applySignedInUI(currentSession);
      else applySignedOutUI();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

