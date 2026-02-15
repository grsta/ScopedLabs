/* ScopedLabs Upgrade / Checkout Controller
 *
 * - Uses the single Supabase client from /assets/auth.js: window.SL_AUTH.sb
 * - Upgrade page (/upgrade/): category select + auth UI + checkout enablement
 * - Checkout page (/upgrade/checkout/): SESSION-ONLY checkout view (no email box)
 *   - If arriving via magic link, we may briefly have NO session while exchange completes.
 *     We WAIT for auth to settle before redirecting.
 */

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");

  // Must be created by /assets/auth.js (loaded before this)
  const sb = window.SL_AUTH && window.SL_AUTH.sb;

  const LOG_PREFIX = "[app]";
  const log = (...a) => console.log(LOG_PREFIX, ...a);

  // ---- DOM helpers / ids (supports new + legacy ids) ----
  const $ = (id) => document.getElementById(id);

  const els = {
    // Category UI
    selectedCategoryPill: $("sl-selected-category") || $("selected-category"),
    changeCatBtn: $("sl-change-category") || $("change-category"),
    // Price UI
    priceLine: $("sl-price") || $("price"),
    // Auth UI status line
    authLine: $("sl-auth-line") || $("auth-line") || $("sl-status"),
    // Checkout button
    checkoutBtn: $("sl-checkout-btn") || $("checkout-btn"),
    // Card wrapper (optional)
    checkoutCard: $("sl-checkout-card") || $("checkout-card"),
  };

  // ---- category storage ----
  const CAT_KEY = "sl_selected_category";

  function getCategoryFromURL() {
    try {
      const u = new URL(location.href);
      return u.searchParams.get("category") || "";
    } catch {
      return "";
    }
  }

  function getCategoryFromStorage() {
    try {
      return localStorage.getItem(CAT_KEY) || "";
    } catch {
      return "";
    }
  }

  function setCategory(cat) {
    if (!cat) return;
    try {
      localStorage.setItem(CAT_KEY, cat);
    } catch {}
    if (els.selectedCategoryPill) els.selectedCategoryPill.textContent = cat;
  }

  // ---- session helpers ----
  async function refreshSession() {
    if (!sb) return null;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) {
        log("getSession error:", error.message);
        return null;
      }
      return data ? data.session : null;
    } catch (e) {
      log("getSession exception:", e);
      return null;
    }
  }

  function setAuthLine(text) {
    if (els.authLine) els.authLine.textContent = text;
  }

  // ---- IMPORTANT: wait for auth to settle on magic-link return ----
  function urlLooksLikeAuthReturn() {
    // Supabase magic-link can return with:
    // ?code=... (PKCE) or ?token_hash=...&type=magiclink, or #access_token=...
    try {
      const u = new URL(location.href);
      if (u.searchParams.get("code")) return true;
      if (u.searchParams.get("token_hash")) return true;
      if (u.searchParams.get("type")) return true;
      if (u.searchParams.get("error")) return true;
      if (u.hash && (u.hash.includes("access_token=") || u.hash.includes("refresh_token="))) return true;
      return false;
    } catch {
      return false;
    }
  }

  async function waitForSession({ timeoutMs = 6000, intervalMs = 200 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const s = await refreshSession();
      if (s) return s;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return null;
  }

  function redirectToUpgrade(reason) {
    const cat = getCategoryFromURL() || getCategoryFromStorage();
    const url = cat ? `/upgrade/?category=${encodeURIComponent(cat)}#checkout` : `/upgrade/#categories`;
    log("redirectToUpgrade:", reason, "->", url);
    location.replace(url);
  }

  // Checkout page is session-only; the login step happens on /upgrade/
  function hideLoginUIOnCheckout() {
    // If your checkout HTML still has leftover email inputs/buttons,
    // you can hide them by CSS or by IDs — but this keeps it logic-only.
  }

  // ---- checkout action (calls your backend) ----
  async function startCheckoutFlow() {
    let session = await refreshSession();
    if (!session) {
      // If user just clicked magic link, wait a moment before punting them back
      if (IS_CHECKOUT_PAGE && urlLooksLikeAuthReturn()) {
        setAuthLine("Finishing sign-in…");
        session = await waitForSession();
      }
    }

    if (!session) {
      if (IS_CHECKOUT_PAGE) redirectToUpgrade("checkout clicked without session");
      else setAuthLine("Sign in first.");
      return;
    }

    const cat = getCategoryFromURL() || getCategoryFromStorage();
    if (!cat) {
      if (IS_CHECKOUT_PAGE) redirectToUpgrade("checkout clicked without category");
      else setAuthLine("Pick a category first.");
      return;
    }

    setAuthLine("Starting checkout…");

    try {
      // Expecting your server to create a Stripe Checkout session
      // and return { url: "https://checkout.stripe.com/..." }
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Checkout API failed (${res.status}). ${t}`);
      }

      const data = await res.json();
      if (!data || !data.url) throw new Error("Checkout API did not return a URL.");

      location.href = data.url;
    } catch (e) {
      log("checkout error:", e);
      setAuthLine("Checkout failed. Try again.");
      alert(e.message || String(e));
    }
  }

  // ---- main state update ----
  async function updateCheckoutState() {
    const urlCat = getCategoryFromURL();
    if (urlCat) setCategory(urlCat);
    else {
      const stored = getCategoryFromStorage();
      if (stored) setCategory(stored);
    }

    // Checkout requires a category
    const currentCategory = getCategoryFromURL() || getCategoryFromStorage();

    if (IS_CHECKOUT_PAGE) {
      hideLoginUIOnCheckout();

      // If we arrived from email link, give auth time to settle BEFORE redirecting.
      let session = await refreshSession();
      if (!session && urlLooksLikeAuthReturn()) {
        setAuthLine("Finishing sign-in…");
        session = await waitForSession();
      }

      if (!currentCategory) {
        redirectToUpgrade("checkout page without category");
        return;
      }

      if (!session) {
        // At this point we waited (if needed) — safe to redirect
        redirectToUpgrade("checkout page requires session");
        return;
      }

      setAuthLine(`Signed in as ${session.user.email}`);
      if (els.checkoutBtn) els.checkoutBtn.disabled = false;
      return;
    }

    // Upgrade page behavior:
    const session = await refreshSession();
    if (session) {
      setAuthLine(`Signed in as ${session.user.email}`);
      if (els.checkoutBtn) els.checkoutBtn.disabled = !currentCategory;
    } else {
      setAuthLine("Not signed in");
      if (els.checkoutBtn) els.checkoutBtn.disabled = true;
    }

    if (els.selectedCategoryPill) {
      els.selectedCategoryPill.textContent = currentCategory || "None selected";
    }
  }

  function wire() {
    if (els.changeCatBtn) {
      els.changeCatBtn.addEventListener("click", () => {
        // Always send them back to upgrade to change category
        redirectToUpgrade("user clicked change category");
      });
    }

    if (els.checkoutBtn) {
      els.checkoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        startCheckoutFlow();
      });
    }
  }

  async function boot() {
    if (!sb) {
      // If auth.js isn't loaded, checkout page will break. Redirect to upgrade to recover.
      if (IS_CHECKOUT_PAGE) {
        redirectToUpgrade("Supabase client missing on checkout page");
        return;
      }
      setAuthLine("Auth not ready. (auth.js must load before app.js)");
      return;
    }

    wire();
    await updateCheckoutState();

    // Keep UI updated when auth state changes
    sb.auth.onAuthStateChange(async (event) => {
      log("auth event:", event);
      await updateCheckoutState();
    });
  }

  boot();
})();

