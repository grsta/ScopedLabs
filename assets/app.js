/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller — FULL FILE OVERWRITE
*/

(() => {
  "use strict";

  const PATH = location.pathname || "/";
  const IS_UPGRADE_PAGE = PATH.startsWith("/upgrade/");
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

  const sb = window.SL_AUTH && window.SL_AUTH.sb
    ? window.SL_AUTH.sb
    : null;

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
      if (currentCategory) {
        localStorage.setItem("sl_selected_category", currentCategory);
      }
    } catch {}
  }

  function setStatus(msg) {
    if (els.status) els.status.textContent = msg || "";
  }

  function updateCategoryUI() {
    const label = currentCategory || "None selected";
    if (els.selectedLabel) {
      els.selectedLabel.textContent = label;
    }
    updateCheckoutEnabled();
  }

  function updateCheckoutEnabled() {
    if (!els.checkoutBtn) return;
    const enabled = !!currentSession && !!currentCategory;
    els.checkoutBtn.disabled = !enabled;
  }

  async function getSession() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  }

  async function restoreSession() {
    currentSession = await getSession();
    if (currentSession) {
      applySignedInUI(currentSession);
    } else {
      applySignedOutUI();
    }
    updateCheckoutEnabled();
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

  async function startCheckout() {
    if (!currentSession) {
      setStatus("Not signed in");
      return;
    }

    if (!currentCategory) {
      setStatus("None selected");
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
        updateCheckoutEnabled();
        return;
      }

      if (!data?.url) {
        setStatus("Checkout failed: missing URL.");
        updateCheckoutEnabled();
        return;
      }

      location.href = data.url;
    } catch (e) {
      setStatus(`Checkout error: ${e?.message || e}`);
      updateCheckoutEnabled();
    }
  }

  async function signOut() {
    if (!sb) return;
    try {
      await sb.auth.signOut();
    } catch {}
    currentSession = null;
    applySignedOutUI();
    updateCheckoutEnabled();
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
        signOut();
      });
    }

    if (sb) {
      sb.auth.onAuthStateChange(async () => {
        currentSession = await getSession();
        if (currentSession) applySignedInUI(currentSession);
        else applySignedOutUI();
        updateCheckoutEnabled();
      });
    }
  }

  async function init() {
    if (!IS_UPGRADE_PAGE) return;
    if (!sb) return;

  await restoreSession();

// Re-resolve category AFTER session restore (fix redirect race)
const urlCat = getCategoryFromURL();
const storedCat = getCategoryFromStorage();

setCategory(urlCat || storedCat || "");
updateCategoryUI();

wireOnce();


  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();


