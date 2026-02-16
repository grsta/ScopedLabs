/* ScopedLabs Upgrade App (Race-safe + selector-safe)
   - Waits for sl-auth-ready before gating checkout
   - Reads ?category= from URL and reflects in UI
   - Enables checkout only if: signed in AND category selected
*/

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  // ---------- Robust element finders ----------
  function findSelectedCategoryEl() {
    return (
      $("#selected-category") ||
      $("#selectedCategory") ||
      document.querySelector("[data-selected-category]") ||
      document.querySelector(".selected-category")
    );
  }

  function findCheckoutBtn() {
    return (
      $("#btn-checkout") ||
      $("#checkout-btn") ||
      $("#checkoutBtn") ||
      document.querySelector("[data-checkout]")
    );
  }

  function findCheckoutStatusEl() {
    return (
      $("#checkout-status") ||
      $("#checkoutStatus") ||
      document.querySelector("[data-checkout-status]")
    );
  }

  function setCheckoutStatus(msg, isError = false) {
    const s = findCheckoutStatusEl();
    if (!s) return;
    s.textContent = msg || "";
    s.classList.toggle("error", !!isError);
  }

  function getCategoryFromUrl() {
  const url = new URL(window.location.href);
  const c = (url.searchParams.get("category") || "").trim().toLowerCase();
  if (c) {
    try { localStorage.setItem("sl_last_category", c); } catch (_) {}
    return c;
  }
  
  try {
    return (localStorage.getItem("sl_last_category") || "").trim().toLowerCase();
  } catch (_) {
    return "";
  }
}


  function setCategoryInUrl(category) {
    const url = new URL(window.location.href);
    if (category) url.searchParams.set("category", category);
    else url.searchParams.delete("category");
    window.history.replaceState({}, "", url.toString());
  }

  function reflectCategory(category) {
    // Primary: known targets
    const el = findSelectedCategoryEl();
    if (el) {
      el.textContent = category ? category : "None selected";
      el.classList.toggle("muted", !category);
      return;
    }

    // Fallback: find the element currently showing "None selected" and update it
    const fallback = Array.from(document.querySelectorAll("button, span, div, p, a"))
      .find((n) => (n.textContent || "").trim() === "None selected");

    if (fallback) {
      fallback.textContent = category ? category : "None selected";
      fallback.classList.toggle("muted", !category);
    }
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
    const btn = findCheckoutBtn();
    const category = getCategoryFromUrl();

    reflectCategory(category);

    if (!btn) {
      // Not signed in yet? The button may not be rendered. That’s fine.
      return;
    }

    btn.disabled = true;

    const signedIn = await isSignedIn();

    if (!category) {
      setCheckoutStatus("Select a category to continue.");
      return;
    }
    if (!signedIn) {
      setCheckoutStatus("Sign in to unlock Pro access.");
      return;
    }

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
    if (!data || !data.url) throw new Error("Checkout session did not return a URL.");
    return data.url;
  }

  function wireCategoryButtons() {
    const buttons = document.querySelectorAll("[data-category]");
    if (!buttons || !buttons.length) return;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const category = (btn.getAttribute("data-category") || "").trim().toLowerCase();
        if (!category) return;
        setCategoryInUrl(category);
        refreshGateState();

        const checkout = $("#checkout");
        if (checkout) checkout.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function wireCheckoutButton() {
    const btn = findCheckoutBtn();
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

  function boot() {
    // Run even if signed out — category reflection should still work.
    wireCategoryButtons();
    wireCheckoutButton();
    refreshGateState();

    window.addEventListener("sl-auth-changed", () => refreshGateState());
    window.addEventListener("popstate", () => refreshGateState());
  }

  function bootWhenAuthReady() {
    // If auth is missing, still boot for URL/category reflection
    if (!window.SL_AUTH) {
      boot();
      return;
    }

    if (window.SL_AUTH.ready) {
      boot();
      return;
    }

    window.addEventListener("sl-auth-ready", () => boot(), { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootWhenAuthReady);
  } else {
    bootWhenAuthReady();
  }
})();


