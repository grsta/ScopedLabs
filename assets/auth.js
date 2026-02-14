/* ScopedLabs Auth (Supabase magic link) - upgrade/account pages
   - Creates ONE Supabase client globally: window.SCOPEDLABS_SB
   - Wires: #sl-email, #sl-sendlink, #sl-whoami, #sl-login-card, #sl-checkout-card, #sl-signout
   - Returns user to /upgrade/?category=...#checkout and auto-scrolls back to checkout.
*/

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function getOrigin() {
    return (window.location && window.location.origin) ? window.location.origin : "";
  }

  function getCategoryFromUrl() {
    const u = new URL(window.location.href);
    return (u.searchParams.get("category") || "").trim();
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function show(el, yes) {
    if (!el) return;
    el.style.display = yes ? "" : "none";
  }

  function status(msg, isError) {
    const el = $("sl-status");
    if (!el) return;
    el.textContent = msg || "";
    el.style.opacity = msg ? "1" : "0";
    el.style.color = isError ? "#ffb4b4" : "";
  }

  // Create (or reuse) Supabase client
  function getSupabaseClient() {
    if (window.SCOPEDLABS_SB) return window.SCOPEDLABS_SB;

    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("[ScopedLabs] Missing SUPABASE_URL / SUPABASE_ANON_KEY on window.");
      return null;
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.warn("[ScopedLabs] Supabase JS not loaded. Ensure supabase-js <script> is included before auth.js");
      return null;
    }

    window.SCOPEDLABS_SB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    });

    return window.SCOPEDLABS_SB;
  }

  async function updateAuthUI() {
    const sb = getSupabaseClient();
    const who = $("sl-whoami");
    const loginCard = $("sl-login-card");
    const checkoutCard = $("sl-checkout-card");
    const signoutBtn = $("sl-signout");

    if (!sb) {
      setText("sl-whoami", "Auth unavailable (Supabase client not initialized).");
      show(loginCard, true);
      show(checkoutCard, false);
      show(signoutBtn, false);
      return;
    }

    const { data } = await sb.auth.getSession();
    const session = data ? data.session : null;

    if (session && session.user) {
      setText("sl-whoami", `Signed in as ${session.user.email}`);
      show(loginCard, false);
      show(checkoutCard, true);
      show(signoutBtn, true);
    } else {
      setText("sl-whoami", "Not signed in");
      show(loginCard, true);
      show(checkoutCard, false);
      show(signoutBtn, false);
    }
  }

  async function sendMagicLink(email) {
    const sb = getSupabaseClient();
    if (!sb) return;

    const category = getCategoryFromUrl();
    const origin = getOrigin();

    // Always return user to checkout area, same category
    const redirectTo = `${origin}/upgrade/?category=${encodeURIComponent(category)}#checkout`;

    status("Sending magic link…");
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    });

    if (error) {
      status(`Error: ${error.message || error}`, true);
      return;
    }

    status("Magic link sent. Check your email.");
  }

  async function signOut() {
    const sb = getSupabaseClient();
    if (!sb) return;
    status("Signing out…");
    await sb.auth.signOut();
    status("Signed out.");
    await updateAuthUI();
  }

  function scrollToCheckoutIfPresent() {
    if (window.location.hash === "#checkout") {
      const el = document.getElementById("checkout");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }

  async function initAuthUI() {
    const sb = getSupabaseClient();
    const emailEl = $("sl-email");
    const sendBtn = $("sl-sendlink");
    const signoutBtn = $("sl-signout");

    // Wire buttons (if present on this page)
    if (sendBtn && emailEl) {
      sendBtn.addEventListener("click", async () => {
        const email = String(emailEl.value || "").trim();
        if (!email) return status("Enter an email address.", true);
        await sendMagicLink(email);
      });
    }

    if (signoutBtn) {
      signoutBtn.addEventListener("click", async () => {
        await signOut();
      });
    }

    if (sb) {
      // Keep UI in sync if auth changes (magic link return, refresh, etc)
      sb.auth.onAuthStateChange(async () => {
        await updateAuthUI();
        scrollToCheckoutIfPresent();
      });
    }

    await updateAuthUI();
    scrollToCheckoutIfPresent();
  }

  // Expose small helper API for app.js
  window.SCOPEDLABS_AUTH = {
    getClient: getSupabaseClient,
    updateAuthUI,
    initAuthUI,
  };

  document.addEventListener("DOMContentLoaded", () => {
    initAuthUI().catch(err => console.error("[ScopedLabs auth init]", err));
  });
})();
