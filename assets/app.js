/* /assets/app.js
   ScopedLabs Upgrade / Checkout Controller (STABLE)

   Goals:
   - Preserve Supabase session across navigation
   - Checkout page requires session
   - Disable checkout when category missing
   - Category buttons route correctly
   - Checkout button creates Stripe session
   - Sign out always works
*/

(() => {
  "use strict";

  const PATH = location.pathname || "/";
  const IS_CHECKOUT_PAGE = PATH.startsWith("/upgrade/checkout");

  // Supabase client from auth.js (must load BEFORE this file)
  const sb =
    (window.SL_AUTH && window.SL_AUTH.sb) ||
    (window.SL_AUTH && window.SL_AUTH.client) ||
    null;

  const $ = (id) => document.getElementById(id);

  const els = {
    selectedLabel: $("sl-selected-category"),
    changeCatBtn: $("sl-change-category"),

    loginCard: $("sl-login-card"),
    emailInput: $("sl-email"),

    checkoutCard: $("sl-checkout-card"),
    checkoutBtn: $("sl-checkout"),
    signoutBtn: $("sl-signout"),
    status: $("sl-status"),
  };

  let currentCategory = "";
  let currentSession = null;

  // ---------------- HELPERS ----------------

  function norm(v) {
    return (v || "").toString().trim().toLowerCase();
  }

  function getCategoryFromURL() {
    try {
      return norm(new URL(location.href).searchParams.get("category"));
    } catch {
      return "";
    }
  }

  function getCategoryFromStorage() {
    try {
      return norm(localStorage.getItem("sl_selected_category"));
    } catch {
      return "";
    }
  }

  function setCategory(cat) {
    currentCategory = norm(cat);
    try {
      if (currentCategory)
        localStorage.setItem("sl_selected_category", currentCategory);
    } catch {}
  }

  function setStatus(msg) {
    if (els.status) els.status.textContent = msg || "";
  }

  async function refreshSession() {
    if (!sb) return null;
    try {
      const { data } = await sb.auth.getSession();
      return data?.session || null;
    } catch {
      return null;
    }
  }

  async function waitForSession(ms = 7000) {
    const start = Date.now();

    let s = await refreshSession();
    if (s) return s;

    return new Promise((resolve) => {
      const tick = async () => {
        const elapsed = Date.now() - start;
        if (elapsed > ms) return resolve(null);

        const ss = await refreshSession();
        if (ss) return resolve(ss);

        setTimeout(tick, 250);
      };
      tick();
    });
  }

  function applySignedIn(session) {
    setStatus(`Signed in as ${session.user.email}`);
    if (els.checkoutCard) els.checkoutCard.style.display = "";
    if (els.signoutBtn) els.signoutBtn.style.display = "";
    if (els.loginCard) els.loginCard.style.display = "none";
  }

  function applySignedOut() {
    setStatus("Not signed in");
    if (els.checkoutCard) els.checkoutCard.style.display = "none";
    if (els.signoutBtn) els.signoutBtn.style.display = "none";
    if (els.loginCard) els.loginCard.style.display = "";
  }

  function hideLoginOnCheckout() {
    if (els.loginCard) els.loginCard.style.display = "none";
    if (els.emailInput) els.emailInput.value = "";
  }

  function goToCheckout(cat) {
    const c = norm(cat);
    if (!c) return;

    try {
      localStorage.setItem("sl_selected_category", c);
    } catch {}

    if (currentSession) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(c);
    } else {
      location.href =
        "/upgrade/?category=" + encodeURIComponent(c) + "#checkout";
    }
  }

  function bindCategoryButtons() {
    document.querySelectorAll("[data-category]").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";

      const cat = norm(btn.dataset.category);
      if (!cat) return;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        goToCheckout(cat);
      });
    });
  }

  // ---------------- INIT ----------------

  async function init() {
    if (!sb) {
      console.warn("Supabase not ready");
      return;
    }

    const urlCat = getCategoryFromURL();
    const storedCat = getCategoryFromStorage();
    setCategory(urlCat || storedCat || "");

    if (els.selectedLabel)
      els.selectedLabel.textContent =
        currentCategory || "None selected";

    // ---------------- CHECKOUT PAGE ----------------
    if (IS_CHECKOUT_PAGE) {
      hideLoginOnCheckout();
      setStatus("Signing you in…");

      currentSession = await waitForSession(8000);

      if (!currentSession) {
        location.replace("/upgrade/#checkout");
        return;
      }

      applySignedIn(currentSession);

      if (!currentCategory) {
        setStatus("Choose a category to continue.");
        if (els.checkoutBtn) els.checkoutBtn.disabled = true;
      } else {
        if (els.checkoutBtn) els.checkoutBtn.disabled = false;
      }

      // CHECKOUT BUTTON
      if (els.checkoutBtn) {
        els.checkoutBtn.onclick = async () => {
          if (!currentSession || !currentCategory) return;

          els.checkoutBtn.disabled = true;
          setStatus("Opening Stripe Checkout…");

          try {
            const res = await fetch("/api/create-checkout-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                category: currentCategory,
                email: currentSession.user.email,
              }),
            });

            const data = await res.json();
            if (!data?.url) throw new Error("No url");

            location.href = data.url;
          } catch {
            els.checkoutBtn.disabled = false;
            setStatus("Failed to start checkout");
          }
        };
      }

      // SIGN OUT BUTTON
      // SIGN OUT BUTTON (works on both pages, even if initially hidden)
(function bindSignOut() {
  const btn = document.getElementById("sl-signout");
  if (!btn) return;

  // Make sure it’s visible when signed in
  btn.style.display = "";

  // Prevent double-binding
  if (btn.dataset.boundSignout) return;
  btn.dataset.boundSignout = "1";

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setStatus("Signing out…");
    } catch {}

    try {
      // Supabase signout
      await sb.auth.signOut();
    } catch (err) {
      console.warn("signOut failed:", err);
    }

    // Hard clear local state
    try {
      localStorage.removeItem("sl_selected_category");
      localStorage.removeItem("sb-access-token");
      localStorage.removeItem("sb-refresh-token");
    } catch {}

    // Force a clean reload path
    location.href = "/upgrade/#checkout";
  });
})();


      return;
    }

    // ---------------- UPGRADE PAGE ----------------

    bindCategoryButtons();

    setStatus("Restoring session…");

    currentSession = await waitForSession(7000);

    if (currentSession) {
      applySignedIn(currentSession);
      bindCategoryButtons();
    } else {
      applySignedOut();
    }

    if (els.changeCatBtn) {
      els.changeCatBtn.onclick = () => {
        location.href = "/upgrade/#categories";
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

