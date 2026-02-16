// FILE: /assets/app.js
/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller — FULL FILE OVERWRITE
*/

(() => {
  "use strict";

  const PATH = location.pathname || "/";
  const IS_CHECKOUT_PAGE = PATH.startsWith("/upgrade/checkout");

  const $ = (id) => document.getElementById(id);

  const els = {
    selectedLabel: $("sl-selected-category"),
    changeCatBtn: $("sl-change-category"),

    loginCard: $("sl-login-card"),
    checkoutCard: $("sl-checkout-card"),

    checkoutBtn: $("sl-checkout"),
    signoutBtn: $("sl-signout"),

    status: $("sl-status"),
  };

  const readyPromise = (window.SL_AUTH && window.SL_AUTH.ready) || Promise.resolve();
  const sb = (window.SL_AUTH && window.SL_AUTH.sb) || null;

  let currentCategory = "";

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
    if (els.checkoutBtn) els.checkoutBtn.disabled = !currentCategory;
  }

  async function getSession() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  }

  async function waitForSession(timeoutMs = 7000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const s = await getSession();
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

  function redirectToUpgradeCheckout() {
    location.href = "/upgrade/#checkout";
  }

  async function startCheckout() {
    if (!currentCategory) {
      setStatus("None selected");
      return;
    }

    const session = await getSession();
    if (!session) {
      if (IS_CHECKOUT_PAGE) redirectToUpgradeCheckout();
      else setStatus("Not signed in");
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error || `Checkout failed (${res.status}).`);
        if (els.checkoutBtn) els.checkoutBtn.disabled = false;
        return;
      }

      const url = data?.url;
      if (!url) {
        setStatus("Checkout failed: missing URL in response.");
        if (els.checkoutBtn) els.checkoutBtn.disabled = false;
        return;
      }

      location.href = url;
    } catch (e) {
      setStatus(`Checkout error: ${e?.message || e}`);
      if (els.checkoutBtn) els.checkoutBtn.disabled = false;
    }
  }

  async function signOutAndRedirect() {
    if (!sb) {
      redirectToUpgradeCheckout();
      return;
    }
    try {
      await sb.auth.signOut();
    } catch (e) {
      setStatus(`Sign out failed: ${e?.message || e}`);
      return;
    }
    redirectToUpgradeCheckout();
  }

  function wireOnce() {
    if (els.checkoutBtn && !els.checkoutBtn.__slBound) {
      els.checkoutBtn.__slBound = true;
      els.checkoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        startCheckout();
      });
    }

    if (els.changeCatBtn && !els.changeCatBtn.__slBound) {
      els.changeCatBtn.__slBound = true;
      els.changeCatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        location.href = "/upgrade/#categories";
      });
    }

    if (els.signoutBtn && !els.signoutBtn.__slBound) {
      els.signoutBtn.__slBound = true;
      els.signoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        signOutAndRedirect();
      });
    }

    if (sb) {
      sb.auth.onAuthStateChange(async () => {
        const s = await getSession();
        if (s) applySignedInUI(s);
        else applySignedOutUI();
      });
    }
  }

  async function init() {
    if (!sb) {
      if (IS_CHECKOUT_PAGE) redirectToUpgradeCheckout();
      return;
    }

    const urlCat = getCategoryFromURL();
    const storedCat = getCategoryFromStorage();
    setCategory(urlCat || storedCat || "");
    updateCategoryUI();

    await readyPromise;

    if (IS_CHECKOUT_PAGE) {
      setStatus("Signing you in…");
      const session = await waitForSession(7000);
      if (!session) {
        redirectToUpgradeCheckout();
        return;
      }
      applySignedInUI(session);
      updateCategoryUI();
      wireOnce();
      return;
    }

    const session = await getSession();
    if (session) applySignedInUI(session);
    else applySignedOutUI();

    wireOnce();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();


