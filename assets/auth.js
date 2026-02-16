/* /assets/auth.js
   ScopedLabs Supabase Auth (Magic Link + Session Restore)

   REQUIREMENTS:
   - supabase-js v2 must load before this file:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   - You must define these globals BEFORE auth.js loads:
     window.SL_SUPABASE_URL
     window.SL_SUPABASE_ANON_KEY

   What this file does:
   - Creates ONE Supabase client and exposes it:
       window.SL_AUTH.sb
   - Wires Magic Link send button (#sl-sendlink)
   - Exchanges magic-link `code` into a session when returning
   - Keeps UI status updated (Signed in / Not signed in)
*/

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const els = {
    email: $("sl-email"),
    sendBtn: $("sl-sendlink"),
    status: $("sl-status"),
    loginCard: $("sl-login-card"),
  };

  function log(...a) { console.log("[auth]", ...a); }
  function setStatus(msg) {
    if (els.status) els.status.textContent = msg || "";
  }
  function err(msg, e) {
    console.error("[auth]", msg, e || "");
    setStatus(msg);
  }

  const SUPABASE_URL = window.SL_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.SL_SUPABASE_ANON_KEY || "";

  if (!window.supabase || !window.supabase.createClient) {
    err("Supabase JS v2 not loaded. Ensure supabase-js loads BEFORE auth.js");
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    err("Missing SL_SUPABASE_URL / SL_SUPABASE_ANON_KEY");
    return;
  }

  // Single shared client
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // we do explicit exchange below
    },
  });

  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.sb = sb;

  // Helpers
  function normCategory(v) {
    return (v || "").toString().trim().toLowerCase();
  }
  function getCategoryFromURL() {
    const u = new URL(location.href);
    return normCategory(u.searchParams.get("category"));
  }
  function getCategoryFromStorage() {
    try { return normCategory(localStorage.getItem("sl_selected_category")); } catch { return ""; }
  }
  function buildEmailRedirectTo() {
    // Preserve category if we have it
    const cat = getCategoryFromURL() || getCategoryFromStorage();
    const base = `${location.origin}/upgrade/checkout/`;
    return cat ? `${base}?category=${encodeURIComponent(cat)}` : base;
  }
  function hasAuthCodeParam() {
    const u = new URL(location.href);
    return u.searchParams.has("code");
  }
  function stripAuthParamsFromURL() {
    const u = new URL(location.href);
    // remove code + any other auth debris you might see
    ["code", "type", "token_hash", "access_token", "refresh_token"].forEach((k) =>
      u.searchParams.delete(k)
    );
    // keep hash as-is
    history.replaceState({}, "", u.toString());
  }

  async function refreshSession() {
    const { data, error } = await sb.auth.getSession();
    if (error) return null;
    return data?.session || null;
  }

  async function exchangeCodeForSessionIfPresent() {
    if (!hasAuthCodeParam()) return null;

    setStatus("Signing you in…");
    try {
      const u = new URL(location.href);
      const code = u.searchParams.get("code");
      if (!code) return null;

      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      if (error) throw error;

      stripAuthParamsFromURL();
      return data?.session || null;
    } catch (e) {
      // IMPORTANT: If cache/storage got nuked, PKCE verifier is missing.
      // Don’t get stuck. Clean URL and fall back to whatever session exists.
      const msg = (e && (e.message || e.toString())) || "";
      if (msg.includes("PKCE") || msg.includes("CodeVerifier") || msg.includes("verifier")) {
        console.warn("[auth] PKCE verifier missing — cleaning URL and continuing");
        stripAuthParamsFromURL();
        return await refreshSession();
      }
      err("Sign-in failed. Please request a new link.", e);
      stripAuthParamsFromURL();
      return null;
    }
  }

  function applySessionUI(session) {
    if (session?.user?.email) {
      setStatus(`Signed in as ${session.user.email}`);
      // hide login card if it exists on this page
      if (els.loginCard) els.loginCard.style.display = "none";
    } else {
      setStatus("Not signed in");
      if (els.loginCard) els.loginCard.style.display = "";
    }
  }

  async function sendMagicLink() {
    const email = (els.email?.value || "").trim();
    if (!email) {
      setStatus("Enter your email first.");
      els.email?.focus?.();
      return;
    }

    // Disable button to prevent double send
    if (els.sendBtn) els.sendBtn.disabled = true;
    setStatus("Sending magic link…");

    try {
      const emailRedirectTo = buildEmailRedirectTo();

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
        },
      });

      if (error) throw error;

      setStatus("Check your email for the sign-in link.");
    } catch (e) {
      err("Failed to send magic link.", e);
    } finally {
      if (els.sendBtn) els.sendBtn.disabled = false;
    }
  }

  function bindSendButton() {
    if (!els.sendBtn) return;
    els.sendBtn.addEventListener("click", (e) => {
      try { e.preventDefault(); } catch {}
      sendMagicLink();
    });
  }

  async function init() {
    log("Auth ready.");

    bindSendButton();

    // If arriving from magic link, exchange code -> session
    let session = await exchangeCodeForSessionIfPresent();

    // Otherwise restore persisted session
    if (!session) session = await refreshSession();

    applySessionUI(session);

    // Keep UI synced
    sb.auth.onAuthStateChange((_evt, sess) => {
      applySessionUI(sess);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
