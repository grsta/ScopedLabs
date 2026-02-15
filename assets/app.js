/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   - Reads ?category= from URL (or saved selection)
   - On /upgrade/: shows category picker + login + checkout gating
   - On /upgrade/checkout/: SESSION-ONLY checkout view (no email box)
     * If not signed in -> redirect back to /upgrade/?category=...#checkout
     * BUT: if arriving from magic-link and auth params exist, wait for exchange first
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
  let sendingLink = false;

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

  function redirectToUpgrade(reason) {
    const cat = currentCategory || getCategoryFromURL() || getCategoryFromStorage();
    const url = cat ? `/upgrade/?category=${encodeURIComponent(cat)}#checkout` : `/upgrade/#categories`;
    // console.log("[app] redirectToUpgrade:", reason, "->", url);
    location.replace(url);
  }

  function hideLoginUIOnCheckout() {
    // Checkout page: no email box, no send-link flow.
    if (els.loginCard) els.loginCard.style.display = "none";
    if (els.emailInput) els.emailInput.value = "";
  }

  function hasAuthParamsInURL() {
    // Supabase magic-link can arrive with different param styles depending on config:
    // - query: ?code=... or ?token_hash=...&type=magiclink
    // - hash: #access_token=...&refresh_token=...
    const u = new URL(location.href);

    const q = u.searchParams;
    if (q.get("code")) return true;
    if (q.get("token_hash")) return true;
    if (q.get("type")) return true;

    const h = (location.hash || "").toLowerCase();
    if (h.includes("access_token=")) return true;
    if (h.includes("refresh_token=")) return true;
    if (h.includes("token_hash=")) return true;

    return false;
  }

  async function waitForSessionExchange({ tries = 25, delayMs = 200 } = {}) {
    // ~5 seconds max (25 * 200ms)
    for (let i = 0; i < tries; i++) {
      const s = await refreshSession();
      if (s) return s;
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return null;
  }

  async function updateCheckoutState() {
    // Always keep category UI synced
    updateCategoryUI();

    // Require a category on checkout page
    if (IS_CHECKOUT_PAGE) {
      const urlCat = getCategoryFromURL();
      if (urlCat) setCategory(urlCat);

      if (!currentCategory) {
        redirectToUpgrade("checkout page without category");
        return;
      }
    }

    // If this is the dedicated checkout page, require session.
    if (IS_CHECKOUT_PAGE) {
      hideLoginUIOnCheckout();

      // IMPORTANT: arriving from magic-link? wait for auth.js exchange to finish
      if (hasAuthParamsInURL()) {
        setStatus("Finishing sign-in…");
        currentSession = await waitForSessionExchange();
      } else {
        currentSession = await refreshSession();
      }

      if (!currentSession) {
        redirectToUpgrade("checkout page requires session");
        return;
      }

      if (els.checkoutCard) els.checkoutCard.style.display = "";
      if (els.signoutBtn) els.signoutBtn.style.display = ""; // optional

      const email = currentSession.user?.email || "Signed in";
      setStatus(`Signed in as ${email}`);
      return;
    }

    // Otherwise (normal /upgrade/ page)
    currentSession = await refreshSession();

    if (currentSession) {
      if (els.loginCard) els.loginCard.style.display = "none";
      if (els.checkoutCard) els.checkoutCard.style.display = "";
      if (els.signoutBtn) els.signoutBtn.style.display = "";
      const email = currentSession.user?.email || "Signed in";
      setStatus(`Signed in as ${email}`);
    } else {
      if (els.loginCard) els.loginCard.style.display = "";
      if (els.checkoutCard) els.checkoutCard.style.display = "none";
      if (els.signoutBtn) els.signoutBtn.style.display = "none";
      setStatus("Not signed in");
    }
  }

  async function sendMagicLink() {
    if (!sb) {
      setStatus("Auth not ready (Supabase client missing).");
      return;
    }
    if (sendingLink) return;

    const email = (els.emailInput?.value || "").trim();
    if (!email) {
      setStatus("Enter an email address first.");
      return;
    }

    // lock button to prevent double-send
    sendingLink = true;
    if (els.sendLinkBtn) els.sendLinkBtn.disabled = true;

    // Send link that returns to /upgrade/checkout/ with the chosen category
    const cat = currentCategory || getCategoryFromURL() || getCategoryFromStorage();
    const redirectTo = cat
      ? `${location.origin}/upgrade/checkout/?category=${encodeURIComponent(cat)}`
      : `${location.origin}/upgrade/checkout/`;

    setStatus("Sending magic link…");

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
      sendingLink = false;
      if (els.sendLinkBtn) els.sendLinkBtn.disabled = false;
      return;
    }

    if (els.emailHint) els.emailHint.textContent = "Check your email for the sign-in link.";
    setStatus("Magic link sent.");

    // unlock after a short cooldown (prevents accidental double click spam)
    setTimeout(() => {
      sendingLink = false;
      if (els.sendLinkBtn) els.sendLinkBtn.disabled = false;
    }, 1500);
  }

  async function startCheckout() {
    const cat = currentCategory || getCategoryFromURL() || getCategoryFromStorage();
    if (!cat) {
      setStatus("Select a category first.");
      return;
    }

    currentSession = await refreshSession();
    if (!currentSession) {
      if (IS_CHECKOUT_PAGE) redirectToUpgrade("checkout clicked without session");
      else setStatus("Sign in first.");
      return;
    }

    setStatus("Starting checkout…");

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setStatus(`Checkout failed (${res.status}). ${t}`);
        return;
      }

      const data = await res.json().catch(() => ({}));
      const url = data?.url || data?.checkout_url;
      if (!url) {
        setStatus("Checkout failed: missing URL in response.");
        return;
      }

      location.href = url;
    } catch (e) {
      setStatus(`Checkout error: ${e.message || e}`);
    }
  }

  async function signOut() {
    if (!sb) return;
    await sb.auth.signOut();
    setStatus("Signed out.");
    if (IS_CHECKOUT_PAGE) redirectToUpgrade("signed out from checkout page");
    else await updateCheckoutState();
  }

  function wire() {
    if (els.changeCatBtn) {
      els.changeCatBtn.addEventListener("click", () => {
        const cat = currentCategory || getCategoryFromURL() || getCategoryFromStorage();
        const url = cat ? `/upgrade/?category=${encodeURIComponent(cat)}#categories` : `/upgrade/#categories`;
        location.href = url;
      });
    }

    if (els.chooseCatBtn) {
      els.chooseCatBtn.addEventListener("click", () => {
        location.href = "/upgrade/#categories";
      });
    }

    if (els.sendLinkBtn) els.sendLinkBtn.addEventListener("click", sendMagicLink);
    if (els.checkoutBtn) els.checkoutBtn.addEventListener("click", startCheckout);
    if (els.signoutBtn) els.signoutBtn.addEventListener("click", signOut);

    if (sb) {
      sb.auth.onAuthStateChange(async () => {
        await updateCheckoutState();
      });
    }
  }

  (async function init() {
    const urlCat = getCategoryFromURL();
    if (urlCat) setCategory(urlCat);
    else setCategory(getCategoryFromStorage());

    if (!sb) {
      if (IS_CHECKOUT_PAGE) {
        redirectToUpgrade("Supabase client missing on checkout page");
        return;
      }
      setStatus("Auth not ready. (auth.js must load before app.js)");
    }

    await updateCheckoutState();
    wire();
  })();
})();

