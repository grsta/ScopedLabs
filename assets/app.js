/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   - Reads ?category= from URL (or saved selection)
   - On /upgrade/: shows category picker + login + checkout gating
   - On /upgrade/checkout/: SESSION-ONLY checkout view (no email box)
     * If not signed in -> redirect back to /upgrade/?category=...#checkout
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

  function log(...args) {
    // keep quiet in prod; uncomment if needed
    // console.log("[app]", ...args);
  }

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

    // On checkout page, "change category" should always exist (if the element is present)
    // but the main "choose category" button should usually be hidden there.
    if (IS_CHECKOUT_PAGE) {
      if (els.chooseCatBtn) els.chooseCatBtn.style.display = "none";
      if (els.changeCatBtn) els.changeCatBtn.style.display = "";
    }
  }

  async function refreshSession() {
    if (!sb) return null;
    const { data, error } = await sb.auth.getSession();
    if (error) {
      log("getSession error", error);
      return null;
    }
    return data ? data.session : null;
  }

  function redirectToUpgrade(reason) {
    // Preserve category if we have it
    const cat = currentCategory || getCategoryFromURL() || getCategoryFromStorage();
    const url = cat ? `/upgrade/?category=${encodeURIComponent(cat)}#checkout` : `/upgrade/#categories`;
    log("redirectToUpgrade:", reason, "->", url);
    location.replace(url);
  }

  function hideLoginUIOnCheckout() {
    // Checkout page: no email box, no send-link flow. That step happens on /upgrade/.
    if (els.loginCard) els.loginCard.style.display = "none";
    if (els.emailInput) els.emailInput.value = "";
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

    currentSession = await refreshSession();

    // If this is the dedicated checkout page, require session.
    if (IS_CHECKOUT_PAGE) {
      hideLoginUIOnCheckout();

      if (!currentSession) {
        redirectToUpgrade("checkout page requires session");
        return;
      }

      // Signed in: show only checkout controls
      if (els.checkoutCard) els.checkoutCard.style.display = "";
      if (els.signoutBtn) els.signoutBtn.style.display = ""; // optional

      const email = currentSession.user?.email || "Signed in";
      setStatus(`Signed in as ${email}`);
      return;
    }

    // Otherwise (normal /upgrade/ page): show/hide login + checkout based on session
    if (currentSession) {
      // hide login
      if (els.loginCard) els.loginCard.style.display = "none";
      if (els.checkoutCard) els.checkoutCard.style.display = "";
      if (els.signoutBtn) els.signoutBtn.style.display = "";
      const email = currentSession.user?.email || "Signed in";
      setStatus(`Signed in as ${email}`);
    } else {
      // show login
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
    const email = (els.emailInput?.value || "").trim();
    if (!email) {
      setStatus("Enter an email address first.");
      return;
    }

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
      return;
    }

    if (els.emailHint) els.emailHint.textContent = "Check your email for the sign-in link.";
    setStatus("Magic link sent.");
  }

  async function startCheckout() {
    const cat = currentCategory || getCategoryFromURL() || getCategoryFromStorage();
    if (!cat) {
      setStatus("Select a category first.");
      return;
    }

    // On checkout page we *should* already have a session; on upgrade page we still gate
    currentSession = await refreshSession();
    if (!currentSession) {
      if (IS_CHECKOUT_PAGE) {
        redirectToUpgrade("checkout clicked without session");
      } else {
        setStatus("Sign in first.");
      }
      return;
    }

    setStatus("Starting checkout…");

    // Your backend should use session to associate customer + category, then return Stripe URL
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
    // If on checkout page, bounce to upgrade (since checkout requires session)
    if (IS_CHECKOUT_PAGE) redirectToUpgrade("signed out from checkout page");
    else await updateCheckoutState();
  }

  function wire() {
    // Category change buttons
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

    // Auth
    if (els.sendLinkBtn) els.sendLinkBtn.addEventListener("click", sendMagicLink);

    // Checkout
    if (els.checkoutBtn) els.checkoutBtn.addEventListener("click", startCheckout);

    // Sign out (optional)
    if (els.signoutBtn) els.signoutBtn.addEventListener("click", signOut);

    // React to auth state changes
    if (sb) {
      sb.auth.onAuthStateChange(async () => {
        await updateCheckoutState();
      });
    }
  }

  (async function init() {
    // Sync category from URL or storage
    const urlCat = getCategoryFromURL();
    if (urlCat) setCategory(urlCat);
    else setCategory(getCategoryFromStorage());

    // If Supabase client isn't ready, we can still render category, but auth won't work
    if (!sb) {
      // On checkout page, if auth is missing, still redirect (otherwise it's a dead end)
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

