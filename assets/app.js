/* /assets/app.js — FULL FILE OVERWRITE
   - Works on /upgrade/ and /upgrade/checkout/
   - Uses window.SL_AUTH.sb from auth.js (must load first)
   - Category source: URL ?category= OR localStorage(sl_selected_category)
   - Enables checkout only if signed in AND category is set
*/

(() => {
  "use strict";

  const sb = window.SL_AUTH?.sb;
  if (!sb) {
    console.error("[app] Supabase client not found. auth.js must load first.");
    return;
  }

  const LS_CAT = "sl_selected_category";
  const $ = (sel) => document.querySelector(sel);

  function getCategoryFromURL() {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get("category") || "";
    } catch {
      return "";
    }
  }

  function getCategory() {
    return getCategoryFromURL() || localStorage.getItem(LS_CAT) || "";
  }

  function setCategory(cat) {
    const c = (cat || "").trim();
    if (!c) return;
    localStorage.setItem(LS_CAT, c);
  }

  function setText(el, txt) { if (el) el.textContent = txt || ""; }

  function enable(el, on) {
    if (!el) return;
    el.disabled = !on;
    el.classList.toggle("disabled", !on);
  }

  async function isSignedIn() {
    const { data } = await sb.auth.getSession();
    return !!data?.session;
  }

  // ===== Elements (support BOTH) =====
  const els = {
    // New checkout page IDs
    categoryLabelNew: $("#sl-selected-category"),
    statusNew: $("#sl-status"),
    checkoutBtnNew: $("#sl-checkout"),

    // Upgrade page IDs (old)
    categoryLabelOld: $("#selectedCategory"),
    statusOld: $("#checkoutStatus"),
    checkoutBtnOld: $("#checkoutBtn"),

    // Optional "change category" button on checkout page
    changeCategoryBtn: $("#sl-change-category"),
  };

  let currentCategory = getCategory();

  function updateCategoryUI() {
    const label = currentCategory || "None selected";
    setText(els.categoryLabelNew, label);
    setText(els.categoryLabelOld, currentCategory || "None");
  }

  async function updateCheckoutState() {
    const signedIn = await isSignedIn();
    const ready = signedIn && !!currentCategory;

    enable(els.checkoutBtnNew, ready);
    enable(els.checkoutBtnOld, ready);

    if (els.statusNew && signedIn && currentCategory) {
      // keep status subtle; auth.js already prints "Signed in as"
      // only show errors here if needed
    }
  }

  async function startCheckout() {
    try {
      const signedIn = await isSignedIn();
      if (!signedIn) {
        setText(els.statusNew, "Please sign in first.");
        setText(els.statusOld, "Please sign in first.");
        return;
      }
      if (!currentCategory) {
        setText(els.statusNew, "Select a category first.");
        setText(els.statusOld, "Select a category first.");
        return;
      }

      setText(els.statusNew, "Redirecting to checkout…");
      setText(els.statusOld, "Redirecting to checkout…");

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: currentCategory }),
      });

      if (!res.ok) throw new Error("Checkout session failed");

      const data = await res.json();
      if (!data?.url) throw new Error("Missing Stripe URL");

      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      setText(els.statusNew, "Checkout failed. Please try again.");
      setText(els.statusOld, "Checkout failed. Please try again.");
    }
  }

  function wire() {
    els.checkoutBtnNew?.addEventListener("click", (e) => { e.preventDefault(); startCheckout(); });
    els.checkoutBtnOld?.addEventListener("click", (e) => { e.preventDefault(); startCheckout(); });

    els.changeCategoryBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      // Send back to upgrade page category picker
      const cat = getCategory();
      const url = cat ? `/upgrade/?category=${encodeURIComponent(cat)}#categories` : `/upgrade/#categories`;
      window.location.href = url;
    });

    sb.auth.onAuthStateChange(() => updateCheckoutState());
  }

  (async () => {
    // Save category from URL if present
    const urlCat = getCategoryFromURL();
    if (urlCat) {
      setCategory(urlCat);
      currentCategory = urlCat;
    }

    updateCategoryUI();
    await updateCheckoutState();
    wire();
  })();
})();

