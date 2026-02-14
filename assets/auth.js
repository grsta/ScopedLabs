/* /assets/auth.js
   Upgrade/Auth controller for /upgrade/
   - Magic link sign-in
   - Keeps category + scroll position (#checkout)
   - Shows Checkout / Account / Sign out when signed in
*/

(function () {
  "use strict";

  // ---- REQUIRED: injected in HTML before this file ----
  // window.SUPABASE_URL
  // window.SUPABASE_ANON_KEY

  const LS_LAST_CAT = "sl_last_category";
  const LS_PENDING_CAT = "sl_pending_category";
  const LS_PENDING_SCROLL = "sl_pending_scroll"; // "checkout" marker

  const $ = (id) => document.getElementById(id);

  const elEmail = $("sl-email");
  const elSend = $("sl-sendlink");
  const elCheckout = $("sl-checkout");
  const elAccount = $("sl-account");
  const elSignOut = $("sl-signout");
  const elStatus = $("sl-status");

  const elCatPill = $("sl-category-pill");
  const elPrice = $("sl-price");
  const elTitle = $("sl-title");

  function setStatus(msg) {
    if (elStatus) elStatus.textContent = msg || "";
  }

  function getUrl() {
    return new URL(window.location.href);
  }

  function getCategoryFromUrlOrStorage() {
    const url = getUrl();
    const cat = url.searchParams.get("category");
    if (cat) return cat;

    // If magic-link nuked the query, restore the last/pending category
    return (
      localStorage.getItem(LS_PENDING_CAT) ||
      localStorage.getItem(LS_LAST_CAT) ||
      ""
    );
  }

  function saveCategory(cat) {
    if (!cat) return;
    localStorage.setItem(LS_LAST_CAT, cat);
  }

  function normalizeHashToCheckout() {
    // Always drive the user back to checkout area after auth
    // but don't break the page if there's no anchor.
    if (window.location.hash !== "#checkout") {
      window.location.hash = "#checkout";
    }
    const node = document.getElementById("checkout");
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function ensureCategoryParam(cat) {
    if (!cat) return;

    const url = getUrl();
    if (url.searchParams.get("category") === cat) return;

    url.searchParams.set("category", cat);

    // Keep any existing hash (may include tokens temporarily) — we will clean later.
    history.replaceState({}, "", url.toString());
  }

  function cleanAuthTokensFromHashKeepCheckout() {
    // Supabase implicit flow drops tokens in the hash (#access_token=...)
    // After getSession() stores it, we can clean it for UX + safety.
    const url = new URL(window.location.href);
    // Preserve query string, force hash to #checkout if user was headed there
    url.hash = "#checkout";
    history.replaceState({}, "", url.toString());
  }

  function priceForCategory(cat) {
    // Your upgrade page shows $19.99 — keep single price for now
    // (Stripe priceId mapping is in /assets/stripe-map.js used elsewhere)
    return "$19.99";
  }

  function titleForCategory(cat) {
    if (!cat) return "Unlock a category";
    // Human-ish title
    return "Unlock " + cat.charAt(0).toUpperCase() + cat.slice(1);
  }

  function updateCheckoutUI(cat) {
    const pretty = cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : "None selected";

    if (elTitle) elTitle.textContent = titleForCategory(cat);
    if (elCatPill) elCatPill.textContent = pretty;
    if (elPrice) elPrice.textContent = priceForCategory(cat);

    if (cat) saveCategory(cat);
  }

  function mustHaveSupabaseConfig() {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      setStatus("Missing Supabase config (SUPABASE_URL / SUPABASE_ANON_KEY).");
      return false;
    }
    if (!window.supabase || !window.supabase.createClient) {
      setStatus("Supabase client library not loaded.");
      return false;
    }
    return true;
  }

  function createClientOnce() {
    // Prevent “Multiple GoTrueClient instances detected”
    if (window.__SCOPEDLABS_SB) return window.__SCOPEDLABS_SB;

    window.__SCOPEDLABS_SB = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
    return window.__SCOPEDLABS_SB;
  }

  async function refreshAuthUI(sb) {
    const { data, error } = await sb.auth.getSession();
    if (error) {
      setStatus("Auth error: " + error.message);
      return { signedIn: false, email: "" };
    }

    const session = data?.session;
    const signedIn = !!session?.user;
    const email = session?.user?.email || "";

    // Toggle controls
    if (signedIn) {
      setStatus(`Signed in as ${email}`);
      if (elSend) elSend.style.display = "none";
      if (elEmail) elEmail.style.display = "none";
      if (elCheckout) elCheckout.style.display = "";
      if (elAccount) elAccount.style.display = "";
      if (elSignOut) elSignOut.style.display = "";
    } else {
      setStatus("Not signed in");
      if (elSend) elSend.style.display = "";
      if (elEmail) elEmail.style.display = "";
      if (elCheckout) elCheckout.style.display = "none";
      if (elAccount) elAccount.style.display = "none";
      if (elSignOut) elSignOut.style.display = "none";
    }

    return { signedIn, email };
  }

  async function sendMagicLink(sb, cat) {
    const email = (elEmail?.value || "").trim();
    if (!email) {
      setStatus("Enter your email first.");
      return;
    }

    // Preserve category + intent across the email click
    localStorage.setItem(LS_PENDING_CAT, cat || "");
    localStorage.setItem(LS_PENDING_SCROLL, "checkout");

    // Build redirect with category + checkout anchor
    const redirectTo = new URL(window.location.origin + "/upgrade/");
    if (cat) redirectTo.searchParams.set("category", cat);
    redirectTo.hash = "#checkout";

    setStatus("Sending magic link...");

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo.toString(),
      },
    });

    if (error) {
      setStatus("Error: " + error.message);
      return;
    }

    setStatus("Magic link sent. Check your email.");
  }

  async function goToCheckout(sb, cat) {
    // This function only navigates to Stripe (your Worker endpoint creates the session)
    // It assumes your Worker uses STRIPE_SECRET_KEY and SITE_ORIGIN.
    if (!cat) {
      setStatus("Pick a category first.");
      return;
    }

    setStatus("Creating checkout session...");

    try {
      const resp = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat }),
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok || !json?.url) {
        const detail = json?.detail || json?.error || resp.statusText;
        setStatus("Checkout error: " + detail);
        return;
      }

      window.location.href = json.url;
    } catch (e) {
      setStatus("Checkout error: " + (e?.message || "Try again."));
    }
  }

  async function main() {
    if (!mustHaveSupabaseConfig()) return;
    const sb = createClientOnce();

    // Restore category if the email link came back without ?category=
    const cat = getCategoryFromUrlOrStorage();
    if (cat) {
      ensureCategoryParam(cat);
      updateCheckoutUI(cat);
    } else {
      updateCheckoutUI("");
    }

    // If we returned from auth, Supabase will parse tokens from hash.
    // After session is stored, clean the URL + return to checkout.
    const authState = await refreshAuthUI(sb);

    if (authState.signedIn) {
      // If we had a pending scroll intent, honor it
      if (localStorage.getItem(LS_PENDING_SCROLL) === "checkout") {
        // clear the flag so it doesn't keep firing
        localStorage.removeItem(LS_PENDING_SCROLL);
        localStorage.removeItem(LS_PENDING_CAT);
        cleanAuthTokensFromHashKeepCheckout();
        normalizeHashToCheckout();
      }
    }

    // Button wiring
    if (elSend) {
      elSend.addEventListener("click", (e) => {
        e.preventDefault();
        const c = getCategoryFromUrlOrStorage();
        sendMagicLink(sb, c);
      });
    }

    if (elCheckout) {
      elCheckout.addEventListener("click", (e) => {
        e.preventDefault();
        const c = getCategoryFromUrlOrStorage();
        goToCheckout(sb, c);
      });
    }

    if (elAccount) {
      elAccount.addEventListener("click", (e) => {
        e.preventDefault();
        // For now: just show session email in status
        refreshAuthUI(sb);
        normalizeHashToCheckout();
      });
    }

    if (elSignOut) {
      elSignOut.addEventListener("click", async (e) => {
        e.preventDefault();
        await sb.auth.signOut();
        await refreshAuthUI(sb);
        setStatus("Signed out");
      });
    }

    // React to auth changes (magic link completes in same tab sometimes)
    sb.auth.onAuthStateChange(async () => {
      await refreshAuthUI(sb);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
