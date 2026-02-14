/* ScopedLabs Upgrade App Logic — FULL FILE OVERWRITE
   - Uses window.SL_AUTH.sb from auth.js
   - Reads ?category= from URL
   - Enables checkout only if:
       (signed in AND category selected)
   - Creates Stripe Checkout Session
   - Scrolls to #checkout on return
*/

(() => {
  "use strict";

  const sb = window.SL_AUTH?.sb;
  if (!sb) {
    console.error("[app] Supabase client not found. auth.js must load first.");
    return;
  }

  // ===== Helpers =====
  const $ = (sel) => document.querySelector(sel);

  function getCategoryFromURL() {
    const url = new URL(window.location.href);
    return url.searchParams.get("category");
  }

  function setText(el, txt) {
    if (el) el.textContent = txt || "";
  }

  function enable(el, on) {
    if (!el) return;
    el.disabled = !on;
    el.classList.toggle("disabled", !on);
  }

  // ===== Elements =====
  const els = {
    categoryLabel: $("#selectedCategory"),
    checkoutBtn: $("#checkoutBtn"),
    checkoutStatus: $("#checkoutStatus"),
  };

  // ===== State =====
  let currentCategory = getCategoryFromURL();

  // ===== UI =====
  function updateCategoryUI() {
    if (currentCategory) {
      setText(els.categoryLabel, currentCategory);
    } else {
      setText(els.categoryLabel, "None");
    }
  }

  async function isSignedIn() {
    const { data } = await sb.auth.getSession();
    return !!data?.session;
  }

  async function updateCheckoutState() {
    const signedIn = await isSignedIn();
    const ready = signedIn && !!currentCategory;
    enable(els.checkoutBtn, ready);
  }

  // ===== Checkout =====
  async function startCheckout() {
    try {
      if (!(await isSignedIn())) {
        els.checkoutStatus.textContent = "Please sign in first.";
        return;
      }
      if (!currentCategory) {
        els.checkoutStatus.textContent = "Select a category first.";
        return;
      }

      els.checkoutStatus.textContent = "Redirecting to checkout…";

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: currentCategory,
        }),
      });

      if (!res.ok) throw new Error("Checkout session failed");

      const data = await res.json();
      if (!data?.url) throw new Error("Missing Stripe URL");

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      els.checkoutStatus.textContent =
        "Checkout failed. Please try again.";
    }
  }

  // ===== Init =====
  function wireEvents() {
    els.checkoutBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      startCheckout();
    });

    // Update state if auth changes
    sb.auth.onAuthStateChange(() => {
      updateCheckoutState();
    });
  }

  (async () => {
    updateCategoryUI();
    await updateCheckoutState();

    // If returning from Stripe success, jump user to checkout section
    if (window.location.hash === "#checkout") {
      const el = document.getElementById("checkout");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }

    wireEvents();
  })();
})();
