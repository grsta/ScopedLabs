/* ScopedLabs Upgrade / Checkout Controller
   Handles:
   - category selection
   - checkout routing
   - session detection
   - Stripe checkout session creation
*/

(() => {
  "use strict";

  const sb = window.SL_AUTH?.sb || null;

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");

  const els = {
    status: document.getElementById("sl-status"),
    checkoutBtn: document.getElementById("sl-checkout"),
    signoutBtn: document.getElementById("sl-signout"),
    categoryLabel: document.getElementById("sl-selected-category")
  };

  let currentSession = null;
  let currentCategory = null;

  /* --------------------------
     Category Helpers
  ---------------------------*/

  function normalizeCategory(cat) {
    return String(cat || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");
  }

  function setCategory(cat) {
    if (!cat) return;

    cat = normalizeCategory(cat);

    currentCategory = cat;

    localStorage.setItem("sl_selected_category", cat);

    if (els.categoryLabel) {
      els.categoryLabel.textContent = cat;
    }
  }

  function getCategory() {
    const urlCat = new URLSearchParams(location.search).get("category");

    if (urlCat) {
      setCategory(urlCat);
      return urlCat;
    }

    const stored = localStorage.getItem("sl_selected_category");

    if (stored) {
      setCategory(stored);
      return stored;
    }

    return null;
  }

  /* --------------------------
     Auth state
  ---------------------------*/

  async function refreshSession() {
    if (!sb) return null;

    const { data } = await sb.auth.getSession();
    currentSession = data?.session || null;

    return currentSession;
  }

  /* --------------------------
     Checkout Routing
  ---------------------------*/

  function goToCheckoutFor(cat) {
    cat = normalizeCategory(cat);

    localStorage.setItem("sl_selected_category", cat);

    if (currentSession) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(cat);
    } else {
      location.href = "/upgrade/?category=" + encodeURIComponent(cat) + "#checkout";
    }
  }

  /* --------------------------
     Checkout Button
  ---------------------------*/

  async function startCheckout() {
    if (!currentSession) return;
    if (!currentCategory) return;

    if (!els.checkoutBtn) return;

    els.checkoutBtn.disabled = true;

    if (els.status) {
      els.status.textContent = "Opening Stripe Checkout…";
    }

    try {
      const r = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + currentSession.access_token
        },
        body: JSON.stringify({
          category: currentCategory,
          email: currentSession.user.email,
          user_id: currentSession.user.id
        })
      });

      const data = await r.json();

      if (!data.ok) {
        throw new Error(data.error || "checkout_error");
      }

      location.href = data.url;

    } catch (err) {

      if (els.status) {
        els.status.textContent = "Failed to start checkout";
      }

      els.checkoutBtn.disabled = false;

      console.error(err);
    }
  }

  /* --------------------------
     Init
  ---------------------------*/

  async function init() {

    currentCategory = getCategory();

    await refreshSession();

    if (IS_CHECKOUT_PAGE) {

      if (!currentSession) {
        location.href = "/upgrade/?category=" + encodeURIComponent(currentCategory || "") + "#checkout";
        return;
      }

      if (els.checkoutBtn) {
        els.checkoutBtn.addEventListener("click", startCheckout);
      }

    }

    if (els.signoutBtn && sb) {
      els.signoutBtn.addEventListener("click", async () => {
        await sb.auth.signOut();
        localStorage.removeItem("sl_selected_category");
        location.href = "/upgrade/";
      });
    }

    /* category buttons */

    document.querySelectorAll("[data-category]").forEach(btn => {
      btn.addEventListener("click", () => {
        goToCheckoutFor(btn.dataset.category);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);

})();