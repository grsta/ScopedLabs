/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Goals:
   - Session persists across /upgrade/ and /upgrade/checkout/
   - Checkout page never hangs forever on PKCE mismatch (incognito/different profile)
   - Change Category returns to /upgrade/#categories without breaking session
   - Sign out always works and clears local state
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");

  // Must be created by /assets/auth.js (loaded BEFORE this)
  const sb =
    (window.SL_AUTH && window.SL_AUTH.sb) ||
    (window.SL_AUTH && window.SL_AUTH.client) ||
    null;

  const $ = (id) => document.getElementById(id);

  const els = {
    // Category UI
    selectedLabel: $("sl-selected-category"),
    catPill: $("sl-category-pill"),
    catCardSelected: $("sl-checkout-selected"),
    changeCatBtn: $("sl-change-category"),
    chooseCatBtn: $("sl-choose-category"),

    // Auth UI
    loginCard: $("sl-login-card"),
    emailInput: $("sl-email"),
    sendLinkBtn: $("sl-sendlink"),
    emailHint: $("sl-email-hint"),

    // Checkout UI
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
    const cat = currentCategory || "";
    const label = cat ? cat : "None selected";
    if (els.selectedLabel) els.selectedLabel.textContent = label;
    if (els.catPill) els.catPill.textContent = label;
    if (els.catCardSelected) els.catCardSelected.textContent = label;
  }

  async function refreshSession() {
    if (!sb) return null;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) return null;
      return data ? data.session : null;
    } catch {
      return null;
    }
  }

  function hasSupabaseAuthParams() {
    const u = new URL(location.href);
    const qp = u.searchParams;

    // Supabase magic link params can vary by flow
    if (qp.has("code")) return true;
    if (qp.has("token_hash")) return true;
    if (qp.has("type")) return true;
    if (qp.has("access_token")) return true;
    if (qp.has("refresh_token")) return true;
    if (qp.has("error")) return true;
    if (qp.has("error_description")) return true;

    const h = (location.hash || "").toLowerCase();
    if (
      h.includes("access_token=") ||
      h.includes("refresh_token=") ||
      h.includes("type=recovery") ||
      h.includes("error=") ||
      h.includes("error_description=")
    ) {
      return true;
    }
    return false;
  }

  async function waitForSession(timeoutMs = 3500) {
    if (!sb) return null;

    // quick check
    let s = await refreshSession();
    if (s) return s;

    return await new Promise((resolve) => {
      let done = false;
      const start = Date.now();

      const finish = (val) => {
        if (done) return;
        done = true;
        try {
          unsub && unsub();
        } catch {}
        resolve(val || null);
      };

      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        if (session) finish(session);
      });

      const unsub =
        data && data.subscription && data.subscription.unsubscribe
          ? () => data.subscription.unsubscribe()
          : null;

      const tick = async () => {
        if (done) return;
        const elapsed = Date.now() - start;
        if (elapsed > timeoutMs) return finish(null);

        const ss = await refreshSession();
        if (ss) return finish(ss);

        setTimeout(tick, 250);
      };

      tick();
    });
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

  function goToUpgradeCategories() {
    const known = normCategory(currentCategory || getCategoryFromURL() || getCategoryFromStorage());
    const url = known ? `/upgrade/?category=${encodeURIComponent(known)}#categories` : `/upgrade/#categories`;
    location.href = url;
  }

  function goToUpgradeCheckout() {
    const known = normCategory(currentCategory || getCategoryFromURL() || getCategoryFromStorage());
    const url = known ? `/upgrade/?category=${encodeURIComponent(known)}#checkout` : `/upgrade/#checkout`;
    location.href = url;
  }

  function goToUpgradeCheckoutRoot() {
    location.replace("/upgrade/#checkout");
  }

  async function signOutEverywhere() {
    try {
      await sb.auth.signOut();
    } catch {}
    try {
      localStorage.removeItem("sl_selected_category");
    } catch {}
    currentCategory = "";
    currentSession = null;
  }

  async function init() {
    if (!sb) {
      setStatus("Auth not ready. (auth.js must load before app.js)");
      return;
    }

    // category resolution
    const urlCat = getCategoryFromURL();
    const storedCat = getCategoryFromStorage();
    setCategory(urlCat || storedCat || "");
    updateCategoryUI();

    // If user selected category on upgrade page and we came from checkout,
// automatically return to checkout
try {
  const returnFlag = localStorage.getItem("sl_return_to_checkout");
  if (returnFlag === "1" && currentCategory) {
    localStorage.removeItem("sl_return_to_checkout");
    location.href = "/upgrade/checkout/?category=" + encodeURIComponent(currentCategory);
    return;
  }
} catch {}


    // Change category buttons
    if (els.changeCatBtn) {
      els.changeCatBtn.addEventListener("click", (e) => {
        e.preventDefault();

        
    // remember we came from checkout
        try {
          localStorage.setItem("sl_return_to_checkout", "1");
    } catch {}

    goToUpgradeCategories();
  });
}

    if (els.chooseCatBtn) {
      els.chooseCatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        goToUpgradeCategories();
      });
    }

    // Sign out button (works on BOTH pages)
    if (els.signoutBtn && !els.signoutBtn.dataset.bound) {
      els.signoutBtn.dataset.bound = "1";
      els.signoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        setStatus("Signing out…");
        await signOutEverywhere();
        goToUpgradeCheckoutRoot();
      });
    }

    // ============================
    // CHECKOUT PAGE
    // ============================
    if (IS_CHECKOUT_PAGE) {
      // Hide login form if it exists on checkout page
      if (els.loginCard) els.loginCard.style.display = "none";
      if (els.emailInput) els.emailInput.value = "";

      const cameFromAuth = hasSupabaseAuthParams();

      // Wait for session restore
      if (cameFromAuth) {
        setStatus("Signing you in…");
      } else {
        setStatus("");
      }

      currentSession = await waitForSession(cameFromAuth ? 7000 : 2500);

      // If PKCE mismatch happened, session will never appear.
      if (!currentSession) {
        if (cameFromAuth) {
          setStatus("Couldn’t finish sign-in. Redirecting…");
          setTimeout(() => goToUpgradeCheckoutRoot(), 900);
          return;
        }

        // No session and no auth params → require login
        goToUpgradeCheckout();
        return;
      }

      // Signed in
      applySignedInUI(currentSession);

      // Enable/disable checkout button based on category
      if (!currentCategory) {
        setStatus(`Signed in as ${currentSession.user?.email || "user"} — choose a category to continue.`);
        if (els.checkoutBtn) els.checkoutBtn.disabled = true;
      } else {
        if (els.checkoutBtn) els.checkoutBtn.disabled = false;
      }

      // Wire checkout button (Stripe)
      if (els.checkoutBtn && !els.checkoutBtn.dataset.boundCheckout) {
        els.checkoutBtn.dataset.boundCheckout = "1";

        els.checkoutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
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
                email: currentSession.user?.email || null,
              }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (!data || !data.url) throw new Error("Missing url");

            location.href = data.url;
          } catch (err) {
            console.error(err);
            els.checkoutBtn.disabled = false;
            setStatus("Failed to start checkout");
          }
        });
      }

      return;
    }

    // ============================
    // UPGRADE PAGE
    // ============================
    // Let auth restore before showing "Not signed in"
    currentSession = await waitForSession(2500);

    if (currentSession) {
      applySignedInUI(currentSession);
    } else {
      applySignedOutUI();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

