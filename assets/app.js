/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller — FULL FILE OVERWRITE
   Works with auth.js implicit flow + waits for SL_AUTH.ready so no race conditions.
*/

(() => {
  "use strict";

  const PATH = location.pathname || "/";
  const IS_CHECKOUT_PAGE = PATH.startsWith("/upgrade/checkout");

  const sb =
    (window.SL_AUTH && window.SL_AUTH.sb) ||
    (window.SL_AUTH && window.SL_AUTH.client) ||
    null;

  const readyPromise = (window.SL_AUTH && window.SL_AUTH.ready) || Promise.resolve();

  const $ = (id) => document.getElementById(id);

  const els = {
    selectedLabel: $("sl-selected-category"),
    catPill: $("sl-category-pill"),
    changeCatBtn: $("sl-change-category"),
    chooseCatBtn: $("sl-choose-category"),

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
    const label = currentCategory ? currentCategory : "None selected";
    if (els.selectedLabel) els.selectedLabel.textContent = label;
    if (els.catPill) els.catPill.textContent = label;
    if (els.checkoutBtn) els.checkoutBtn.disabled = !currentCategory;
  }

  async function refreshSession() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  }

  async function waitForSession(timeoutMs = 6000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const s = await refreshSession();
      if (s) return s;
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
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

  function redirectToUpgrade(reason) {
    const cat = currentCategory || getCategoryFromStorage();
    const url = cat
      ? `/upgrade/?category=${encodeURIComponent(cat)}#checkout`
      : `/upgrade/#checkout`;
    console.warn("[app] redirectToUpgrade:", reason);
    location.href = url;
  }

  async function startCheckout() {
    if (!currentCategory) {
      setStatus("Select a category first.");
      return;
    }

    currentSession = await refreshSession();
    if (!currentSession) {
      setStatus("Sign in first.");
      if (IS_CHECKOUT_PAGE) redirectToUpgrade("checkout clicked without session");
      return;
    }

    setStatus("Starting checkout…");
    if (els.checkoutBtn) els.checkoutBtn.disabled = true;

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: currentCategory }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setStatus(`Checkout failed (${res.status}). ${t}`);
        if (els.checkoutBtn) els.checkoutBtn.disabled = false;
        return;
      }

      const data = await res.json().catch(() => ({}));
      const url = data?.url || data?.checkout_url;
      if (!url) {
        setStatus("Checkout failed: missing URL in response.");
        if (els.checkoutBtn) els.checkoutBtn.disabled = false;
        return;
      }

      location.href = url;
    } catch (e) {
      setStatus(`Checkout error: ${e.message || e}`);
      if (els.checkoutBtn) els.checkoutBtn.disabled = false;
    }
  }

  async function signOut() {
    if (!sb) return;
    try {
      await sb.auth.signOut();
    } catch (e) {
      setStatus(`Sign out failed: ${e?.message || e}`);
      return;
    }
    setStatus("Signed out.");
    if (IS_CHECKOUT_PAGE) redirectToUpgrade("signed out from checkout page");
    else applySignedOutUI();
  }

  function wireOnce() {
    if (els.checkoutBtn && !els.checkoutBtn.__slBound) {
      els.checkoutBtn.__slBound = true;
      els.checkoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        startCheckout();
      });
    }

    if (els.signoutBtn && !els.signoutBtn.__slBound) {
      els.signoutBtn.__slBound = true;
      els.signoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        signOut();
      });
    }

    if (els.changeCatBtn && !els.changeCatBtn.__slBound) {
      els.changeCatBtn.__slBound = true;
      els.changeCatBtn.addEventListener("click", () => {
        const cat = currentCategory || getCategoryFromStorage();
        const url = cat
          ? `/upgrade/?category=${encodeURIComponent(cat)}#categories`
          : `/upgrade/#categories`;
        location.href = url;
      });
    }

    if (els.chooseCatBtn && !els.chooseCatBtn.__slBound) {
      els.chooseCatBtn.__slBound = true;
      els.chooseCatBtn.addEventListener("click", () => {
        location.href = "/upgrade/#categories";
      });
    }

    if (sb) {
      sb.auth.onAuthStateChange(async () => {
        const s = await refreshSession();
        if (s) applySignedInUI(s);
        else applySignedOutUI();
      });
    }
  }

  async function init() {
    if (!sb) {
      setStatus("Auth not ready. (auth.js must load before app.js)");
      if (IS_CHECKOUT_PAGE) redirectToUpgrade("Supabase client missing on checkout page");
      return;
    }

    // Category
    const urlCat = getCategoryFromURL();
    const storedCat = getCategoryFromStorage();
    setCategory(urlCat || storedCat || "");
    updateCategoryUI();

    // ✅ Wait for auth.js to finish its own initialization
    await readyPromise;

    if (IS_CHECKOUT_PAGE) {
      // ✅ After clicking email link, session may appear a moment later
      setStatus("Signing you in…");
      currentSession = await waitForSession(7000);

      if (!currentSession) {
        // If still no session, send them back to the upgrade page.
        redirectToUpgrade("checkout session not established");
        return;
      }

      applySignedInUI(currentSession);
      updateCategoryUI();
      wireOnce();
      return;
    }

    // Upgrade page
    currentSession = await refreshSession();
    if (currentSession) applySignedInUI(currentSession);
    else applySignedOutUI();

    wireOnce();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();


