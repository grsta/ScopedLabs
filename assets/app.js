/* ScopedLabs Upgrade App
   - Waits for sl-auth-ready before gating checkout
   - Reads ?category= from URL and reflects in UI
   - Enables checkout only if: signed in AND category selected
   - Calls /api/create-checkout-session and redirects to Stripe
*/

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  // Upgrade page elements (only exist on /upgrade/)
  const elCategory = () => $("#selected-category");
  const elCheckoutBtn = () => $("#btn-checkout");
  const elCheckoutStatus = () => $("#checkout-status");

  // Optional: category picker buttons
  const elCategoryBtns = () => document.querySelectorAll("[data-category]");

  function setCheckoutStatus(msg, isError = false) {
    const s = elCheckoutStatus();
    if (!s) return;
    s.textContent = msg || "";
    s.classList.toggle("error", !!isError);
  }

  function getCategoryFromUrl() {
    const url = new URL(window.location.href);
    const c = url.searchParams.get("category");
    return (c || "").trim().toLowerCase();
  }

  function setCategoryInUrl(category) {
    const url = new URL(window.location.href);
    if (category) url.searchParams.set("category", category);
    else url.searchParams.delete("category");
    window.history.replaceState({}, "", url.toString());
  }

  function reflectCategory(category) {
    const el = elCategory();
    if (!el) return;
    el.textContent = category ? category : "None selected";
    el.classList.toggle("muted", !category);
  }

  function getSignedInEmail() {
    const sb = window.SL_AUTH?.sb;
    // If auth isn't available, treat as signed out
    if (!sb) return "";
    // We rely on getSession() for current truth (async), but for quick gating
    // we can use the signed-in UI value (auth.js keeps it updated).
    const emailEl = $("#auth-user-email");
    return (emailEl?.textContent || "").trim();
  }

  async function isSignedIn() {
    const sb = window.SL_AUTH?.sb;
    if (!sb) return false;
    try {
      const { data } = await sb.auth.getSession();
      return !!data?.session?.user;
    } catch (_e) {
      return false;
    }
  }

  async function refreshGateState() {
    const btn = elCheckoutBtn();
    if (!btn) return; // not on this page

    const category = getCategoryFromUrl();
    reflectCategory(category);

    // Disable by default until checks complete
    btn.disabled = true;

    // Wait on real auth truth
    const signedIn = await isSignedIn();

    if (!category) {
      setCheckoutStatus("Select a category to continue.");
      return;
    }
    if (!signedIn) {
      setCheckoutStatus("Sign in to unlock Pro access.");
      return;
    }

    // All good
    setCheckoutStatus("");
    btn.disabled = false;
  }

  async function createCheckoutSession(category) {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category })
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Checkout session failed (${res.status}): ${txt}`);
    }

    const data = await res.json();
    // Expect: { url: "https://checkout.stripe.com/..." }
    if (!data || !data.url) throw new Error("Checkout session did not return a URL.");
    return data.url;
  }

  function wireCategoryButtons() {
    const buttons = elCategoryBtns();
    if (!buttons || !buttons.length) return;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const category = (btn.getAttribute("data-category") || "").trim().toLowerCase();
        if (!category) return;
        setCategoryInUrl(category);
        refreshGateState();
        // If you have a checkout section, we can scroll to it
        const checkout = $("#checkout");
        if (checkout) checkout.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function wireCheckoutButton() {
    const btn = elCheckoutBtn();
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const category = getCategoryFromUrl();
      if (!category) {
        setCheckoutStatus("Select a category first.", true);
        return;
      }

      btn.disabled = true;
      setCheckoutStatus("Redirecting to checkout…");

      try {
        const url = await createCheckoutSession(category);
        window.location.href = url;
      } catch (e) {
        console.warn("[SL_APP] checkout error:", e);
        setCheckoutStatus("Could not start checkout. Try again.", true);
        btn.disabled = false;
      }
    });
  }

  function scrollToCheckoutIfHash() {
    // If returning or linking directly to #checkout, honor it.
    if (window.location.hash === "#checkout") {
      const el = $("#checkout");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function init() {
    // Only run on upgrade pages that have checkout UI
    if (!elCheckoutBtn() && !elCategory()) return;

    wireCategoryButtons();
    wireCheckoutButton();
    scrollToCheckoutIfHash();
    await refreshGateState();

    // Re-check whenever auth changes
    window.addEventListener("sl-auth-changed", () => {
      refreshGateState();
    });

    // If URL changes via replaceState elsewhere, a manual call is enough
    window.addEventListener("popstate", () => {
      refreshGateState();
    });
  }

  // IMPORTANT: Wait for sl-auth-ready to kill the race condition
  function bootWhenAuthReady() {
    // If auth already ready, go now
    if (window.SL_AUTH?.ready) {
      init();
      return;
    }
    // Otherwise wait once
    window.addEventListener(
      "sl-auth-ready",
      () => {
        init();
      },
      { once: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootWhenAuthReady);
  } else {
    bootWhenAuthReady();
  }
})();

