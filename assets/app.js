/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   - Reads ?category= from URL (or saved selection)
   - On /upgrade/: shows category picker + login + checkout gating
   - On /upgrade/checkout/: SESSION-ONLY checkout view (no email box)
     * If arriving from magic link, WAIT for session exchange before redirecting
     * Also: /upgrade waits briefly for session restore before showing "Not signed in"
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

  // Elements (IDs may or may not exist depending on page)
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

  // State
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

    if (els.selectedLabel) els.selectedLabel.textContent = cat ? cat : "None selected";
    if (els.catPill) els.catPill.textContent = cat ? cat : "None selected";
    if (els.catCardSelected) els.catCardSelected.textContent = cat ? cat : "None selected";

    if (IS_CHECKOUT_PAGE) {
      if (els.chooseCatBtn) els.chooseCatBtn.style.display = "none";
      if (els.changeCatBtn) els.changeCatBtn.style.display = "";
    }
  }

  async function refreshSession() {
    if (!sb) return null;
    const { data, error } = await sb.auth.getSession();
    if (error) return null;
    return data ? data.session : null;
  }

  function redirectToUpgrade(_reason) {
    const cat = currentCategory || getCategoryFromURL() || getCategoryFromStorage();
    const url = cat
      ? `/upgrade/?category=${encodeURIComponent(cat)}#checkout`
      : `/upgrade/#categories`;
    location.replace(url);
  }

  function hideLoginUIOnCheckout() {
    if (els.loginCard) els.loginCard.style.display = "none";
    if (els.emailInput) els.emailInput.value = "";
  }

  function hasSupabaseAuthParams() {
    const u = new URL(location.href);
    const qp = u.searchParams;

    if (qp.has("code")) return true;
    if (qp.has("token_hash")) return true;
    if (qp.has("type")) return true;
    if (qp.has("access_token")) return true;
    if (qp.has("refresh_token")) return true;

    const h = (location.hash || "").toLowerCase();
    if (
      h.includes("access_token=") ||
      h.includes("refresh_token=") ||
      h.includes("type=recovery")
    )
      return true;

    return false;
  }

  async function waitForSessionExchange(timeoutMs = 7000) {
    if (!sb) return null;

    const start = Date.now();

    let s = await refreshSession();
    if (s) return s;

    return await new Promise((resolve) => {
      let done = false;

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

  async function init() {
    if (!sb) {
      setStatus("Auth not ready. (auth.js must load before app.js)");
      return;
    }

    const urlCat = getCategoryFromURL();
    const storedCat = getCategoryFromStorage();
    setCategory(urlCat || storedCat || "");
    updateCategoryUI();

    if (els.changeCatBtn) {
      els.changeCatBtn.addEventListener("click", () => {
        const cat = currentCategory || getCategoryFromStorage();
        const url = cat
          ? `/upgrade/?category=${encodeURIComponent(cat)}#categories`
          : `/upgrade/#categories`;
        location.href = url;
      });
    }

    if (els.chooseCatBtn) {
      els.chooseCatBtn.addEventListener("click", () => {
        location.href = `/upgrade/#categories`;
      });
    }

    sb.auth.onAuthStateChange((_event, session) => {
      if (IS_CHECKOUT_PAGE) return;
      if (session) {
        currentSession = session;
        applySignedInUI(session);
      }
    });

    // =============================
    // CHECKOUT PAGE BEHAVIOR
    // =============================
    if (IS_CHECKOUT_PAGE) {
      hideLoginUIOnCheckout();

      const cameFromAuth = hasSupabaseAuthParams();

      if (cameFromAuth) {
        setStatus("Signing you in…");
        currentSession = await waitForSessionExchange(8000);
      } else {
        currentSession = await refreshSession();
        if (!currentSession) {
          currentSession = await waitForSessionExchange(2500);
        }
      }

      if (!currentSession) {
        redirectToUpgrade("checkout_requires_session");
        return;
      }

      setStatus(`Signed in as ${currentSession.user?.email || "user"}`);

      if (els.checkoutCard) els.checkoutCard.style.display = "";
      if (els.signoutBtn) els.signoutBtn.style.display = "";

      if (!currentCategory) {
        setStatus(
          `Signed in as ${currentSession.user?.email || "user"} — choose a category to continue.`
        );
        if (els.checkoutBtn) els.checkoutBtn.disabled = true;
      } else {
        if (els.checkoutBtn) els.checkoutBtn.disabled = false;
      }

      // =============================
      // 🔥 CHECKOUT BUTTON WIRING
      // =============================
      if (els.checkoutBtn && !els.checkoutBtn.dataset.boundCheckout) {
        els.checkoutBtn.dataset.boundCheckout = "1";

        els.checkoutBtn.addEventListener("click", async () => {
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
                email:
                  (currentSession.user && currentSession.user.email) || null,
              }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (!data || !data.url) throw new Error("Missing url");

            location.href = data.url;
          } catch {
            els.checkoutBtn.disabled = false;
            setStatus("Failed to start checkout");
          }
        });
      }

      if (els.signoutBtn) {
        els.signoutBtn.addEventListener("click", async () => {
          try {
            await sb.auth.signOut();
          } catch {}
          location.href = "/upgrade/#checkout";
        });
      }

      return;
    }

    // =============================
    // UPGRADE PAGE BEHAVIOR
    // =============================
    currentSession = await refreshSession();

    if (!currentSession) {
      currentSession = await waitForSessionExchange(2500);
    }

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

