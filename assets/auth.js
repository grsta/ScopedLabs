/* /assets/auth.js
   Supabase v2 auth + magic link
   - Single client: window.SL_AUTH.sb
   - Prevent double sends / double init
   - exchangeCodeForSession when returning with ?code=
*/

(() => {
  "use strict";

  // Hard guard to prevent double-init across hot reloads / multiple script includes
  if (window.__SL_AUTH_INIT_DONE) return;
  window.__SL_AUTH_INIT_DONE = true;

  const LOG = "[auth]";
  const log = (...a) => console.log(LOG, ...a);
  const err = (...a) => console.error(LOG, ...a);

  const $ = (id) => document.getElementById(id);

  // Pull config from stripe-map.js (what you already have)
  const SUPABASE_URL = window.SL_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.SL_SUPABASE_ANON_KEY || "";

  if (!window.supabase || !window.supabase.createClient) {
    err("Supabase JS v2 not loaded. Ensure supabase-js loads BEFORE auth.js");
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    err("Missing SL_SUPABASE_URL / SL_SUPABASE_ANON_KEY (from stripe-map.js).");
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });

  window.SL_AUTH = { sb };

  const emailInput = $("sl-email");
  const sendBtn = $("sl-sendlink");
  const hintEl = $("sl-email-hint");
  const statusEl = $("sl-status");

  let sending = false;

  function setStatus(t) {
    if (statusEl) statusEl.textContent = t || "";
  }
  function setHint(t) {
    if (hintEl) hintEl.textContent = t || "";
  }

  function getCategory() {
    try {
      const u = new URL(location.href);
      return (u.searchParams.get("category") || "").trim();
    } catch {
      return "";
    }
  }

  function buildRedirectToCheckout() {
    const origin = location.origin;
    const cat = getCategory();
    return cat
      ? `${origin}/upgrade/checkout/?category=${encodeURIComponent(cat)}`
      : `${origin}/upgrade/checkout/`;
  }

  function cleanAuthParamsFromUrl() {
    try {
      const u = new URL(location.href);
      const hadCode = u.searchParams.has("code");
      u.searchParams.delete("code");
      u.searchParams.delete("type");
      u.searchParams.delete("token_hash");
      u.searchParams.delete("error");
      u.searchParams.delete("error_description");
      if (hadCode) history.replaceState({}, document.title, u.toString());
    } catch {}
  }

  async function exchangeIfNeeded() {
    // If we have ?code=..., we MUST exchange it for a session
    const u = new URL(location.href);
    const code = u.searchParams.get("code");
    if (!code) return;

    setStatus("Finishing sign-in…");
    log("Exchanging code for session…");

    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      err("exchangeCodeForSession failed:", error);
      setStatus("Sign-in failed. Please request a new magic link.");
      return;
    }

    cleanAuthParamsFromUrl();
    setStatus(""); // app.js will render signed-in state
    log("Session established.");
  }

  async function refreshStatusLine() {
    const { data } = await sb.auth.getSession();
    const session = data?.session || null;
    if (session?.user?.email) {
      setStatus(`Signed in as ${session.user.email}`);
    } else {
      setStatus("Not signed in");
    }
  }

  async function sendMagicLink() {
    if (!sendBtn) return;
    if (sending) return;

    const email = (emailInput?.value || "").trim();
    if (!email) {
      setHint("Enter an email address first.");
      return;
    }

    sending = true;
    sendBtn.disabled = true;

    try {
      const redirectTo = buildRedirectToCheckout();
      log("Sending magic link. redirect_to:", redirectTo);

      setHint("Sending magic link…");
      setStatus("");

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) throw error;

      setHint("Check your email for the sign-in link.");
    } catch (e) {
      err("signInWithOtp failed:", e);
      setStatus(e?.message || "Failed to send link.");
    } finally {
      // small cooldown to prevent accidental double click spam
      setTimeout(() => {
        sending = false;
        if (sendBtn) sendBtn.disabled = false;
      }, 1200);
    }
  }

  async function boot() {
    // Handle magic-link return *before* anything else
    await exchangeIfNeeded();

    // Bind send button ONCE
    if (sendBtn && !sendBtn.__slBound) {
      sendBtn.__slBound = true;
      sendBtn.addEventListener("click", (e) => {
        e.preventDefault();
        sendMagicLink();
      });
    }

    // Keep status up to date
    sb.auth.onAuthStateChange(() => refreshStatusLine());
    refreshStatusLine();

    log("Auth ready.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

