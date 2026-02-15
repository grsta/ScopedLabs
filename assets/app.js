/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   - Reads ?category= from URL (or saved selection)
   - On /upgrade/: shows category picker + login + checkout gating
   - On /upgrade/checkout/: SESSION-ONLY checkout view (no email box)
     * If arriving from magic link, WAIT for session exchange before redirecting
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

  // Some pages still have legacy IDs; support both.
  function bindLegacyIdsToNewIds() {
    try {
      // Auth legacy -> new IDs
      if (!$("#sl-email") && $("#authEmail")) $("#authEmail").id = "sl-email";
      if (!$("#sl-sendlink") && $("#authSendLink")) $("#authSendLink").id = "sl-sendlink";
      if (!$("#sl-status") && $("#authStatus")) $("#authStatus").id = "sl-status";

      // Optional legacy containers (if they exist)
      if (!$("#sl-login-card") && $("#authCard")) $("#authCard").id = "sl-login-card";
    } catch (_) {}
  }

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

  function redirectToUpgrade() {
    const cat = currentCategory || getCategoryFromURL() || getCategoryFromStorage();
    const url = cat ? `/upgrade/?category=${encodeURIComponent(cat)}#checkout` : `/upgrade/#categories`;
    location.replace(url);
  }

  function hideLoginUIOnCheckout() {
    // Hide the whole login card if present
    if (els.loginCard) els.loginCard.style.display = "none";

    // Hide individual legacy/new auth controls if they exist (belt + suspenders)
    const hideIds = ["sl-email", "sl-sendlink", "sl-email-hint", "authEmail", "authSendLink"];
    hideIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });

    // Clear email field if present
    if (els.emailInput) els.emailInput.value = "";
  }

  function hasSupabaseAuthParams() {
    // Supabase magic link / OTP exchange can arrive via query params or hash fragments
    const u = new URL(location.href);
    const qp = u.searchParams;

    if (qp.has("code")) return true;
    if (qp.has("token_hash")) return true;
    if (qp.has("type")) return true;
    if (qp.has("access_token")) return true;
    if (qp.has("refresh_token")) return true;

    // Some flows use hash fragments like #access_token=...
    const h = (location.hash || "").toLowerCase();
    if (h.includes("access_token=") || h.includes("refresh_token=") || h.includes("type=recovery")) return true;

    return false;
  }

  async function waitForSessionExchange(timeoutMs = 8000) {
    // Wait for auth.js to exchange the code for a session.
    // Use onAuthStateChange + polling fallback.
    if (!sb) return null;

    const start = Date.now();

    // quick check
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

  async function init() {
    if (!sb) {
      setStatus("Auth not ready. (auth.js must load before app.js)");
      return;
    }

    // Make legacy IDs behave like the new ones (important!)
    bindLegacyIdsToNewIds();

    // Refresh element refs after binding legacy IDs
    els.loginCard = $("sl-login-card");
    els.emailInput = $("sl-email");
    els.sendLinkBtn = $("sl-sendlink");
    els.status = $("sl-status");

    // Category resolution
    const urlCat = getCategoryFromURL();
    const storedCat = getCategoryFromStorage();
    setCategory(urlCat || storedCat || "");
    updateCategoryUI();

    // Change category buttons
    if (els.changeCatBtn) {
      els.changeCatBtn.addEventListener("click", () => {
        const cat = currentCategory || getCategoryFromStorage();
        const url = cat ? `/upgrade/?category=${encodeURIComponent(cat)}#categories` : `/upgrade/#categories`;
        location.href = url;
      });
    }

    if (els.chooseCatBtn) {
      els.chooseCatBtn.addEventListener("click", () => {
        location.href = `/upgrade/#categories`;
      });
    }

    // CHECKOUT PAGE BEHAVIOR
    if (IS_CHECKOUT_PAGE) {
      hideLoginUIOnCheckout();
      updateCategoryUI();

      const cameFromAuth = hasSupabaseAuthParams();

      // If we arrived from the magic link, don't bounce immediately.
      if (cameFromAuth) {
        setStatus("Signing you in…");
        currentSession = await waitForSessionExchange(9000);
      } else {
        // Normal visit: require existing session
        currentSession = await refreshSession();
        if (!currentSession) {
          // tiny grace window in case auth params were already cleaned by auth.js
          currentSession = await waitForSessionExchange(2500);
        }
      }

      // Still not signed in? send them back to upgrade
      if (!currentSession) {
        redirectToUpgrade();
        return;
      }

      // Signed in: show checkout UI
      setStatus(`Signed in as ${currentSession.user?.email || "user"}`);

      if (els.checkoutCard) els.checkoutCard.style.display = "";
      if (els.signoutBtn) els.signoutBtn.style.display = "";

      // If category missing, force them to choose
      if (!currentCategory) {
        setStatus(`Signed in as ${currentSession.user?.email || "user"} — choose a category to continue.`);
        if (els.checkoutBtn) els.checkoutBtn.disabled = true;
      } else {
        if (els.checkoutBtn) els.checkoutBtn.disabled = false;
      }

      if (els.signoutBtn) {
        els.signoutBtn.addEventListener("click", async () => {
          try {
            await sb.auth.signOut();
          } catch {}
          location.href = "/upgrade/#checkout";
        });
      }

      return; // checkout page done
    }

    // UPGRADE PAGE BEHAVIOR
    currentSession = await refreshSession();
    if (currentSession) {
      setStatus(`Signed in as ${currentSession.user?.email || "user"}`);
      if (els.checkoutCard) els.checkoutCard.style.display = "";
      if (els.signoutBtn) els.signoutBtn.style.display = "";
      if (els.loginCard) els.loginCard.style.display = "none";
    } else {
      setStatus("Not signed in");
      if (els.checkoutCard) els.checkoutCard.style.display = "none";
      if (els.signoutBtn) els.signoutBtn.style.display = "none";
      if (els.loginCard) els.loginCard.style.display = "";
    }
  }

  // boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

