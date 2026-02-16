/* /assets/auth.js
   ScopedLabs Upgrade Auth (Supabase v2) — IMPLICIT FLOW (NO PKCE)
   FULL FILE OVERWRITE

   Why:
   - Fixes “Signing you in…” / PKCE verifier missing loops when email link opens
     in a different tab/profile/incognito.
*/

(() => {
  "use strict";

  if (window.__SL_AUTH_INIT_DONE) return;
  window.__SL_AUTH_INIT_DONE = true;

  const LOG = "[auth]";
  const log = (...a) => console.log(LOG, ...a);
  const warn = (...a) => console.warn(LOG, ...a);
  const err = (...a) => console.error(LOG, ...a);

  const $ = (id) => document.getElementById(id);

  const SUPABASE_URL = window.SL_SUPABASE_URL || window.SUPABASE_URL || "";
  const SUPABASE_ANON_KEY =
    window.SL_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || "";

  if (!window.supabase || !window.supabase.createClient) {
    err("Supabase JS v2 not loaded. Ensure supabase-js loads BEFORE auth.js");
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    err("Missing SL_SUPABASE_URL / SL_SUPABASE_ANON_KEY (from stripe-map.js).");
    return;
  }

  const statusEl = $("sl-status");
  const hintEl = $("sl-email-hint");
  const emailInput = $("sl-email");
  const sendBtn = $("sl-sendlink");
  const signOutBtn = $("sl-signout");

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
    const origin = (location.origin || "").replace("http://", "https://");
    const cat = getCategory();
    return cat
      ? `${origin}/upgrade/checkout/?category=${encodeURIComponent(cat)}`
      : `${origin}/upgrade/checkout/`;
  }

  function stripAuthNoiseFromUrl() {
    // Implicit flow may return tokens in hash: #access_token=...&refresh_token=...
    // We don’t want those sitting in the URL bar forever.
    try {
      if (location.hash && location.hash.includes("access_token=")) {
        history.replaceState({}, document.title, location.pathname + location.search);
      }
    } catch {}
  }

  // ✅ IMPLICIT FLOW (no PKCE verifier dependency)
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  });

  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.sb = sb;

  async function validateOrClearGhostSession() {
    // If you deleted the user in Supabase but browser still has tokens, this prevents fake “logged in”.
    try {
      const { data, error } = await sb.auth.getUser();
      if (error) {
        warn("getUser failed; clearing local session:", error?.message || error);
        await sb.auth.signOut();
        return null;
      }
      return data?.user || null;
    } catch (e) {
      warn("validate session exception; clearing local session:", e?.message || e);
      try {
        await sb.auth.signOut();
      } catch {}
      return null;
    }
  }

  async function refreshStatusLine() {
    await validateOrClearGhostSession();

    const { data } = await sb.auth.getSession();
    const session = data?.session || null;
    if (session?.user?.email) setStatus(`Signed in as ${session.user.email}`);
    else setStatus("Not signed in");
  }

  let sending = false;

  async function sendMagicLink() {
    if (!sendBtn || sending) return;

    const email = (emailInput?.value || "").trim();
    if (!email || !email.includes("@")) {
      setHint("Enter a valid email address first.");
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
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setHint("Check your email for the sign-in link.");
    } catch (e) {
      err("signInWithOtp failed:", e);
      setStatus(e?.message || "Failed to send link.");
    } finally {
      setTimeout(() => {
        sending = false;
        if (sendBtn) sendBtn.disabled = false;
      }, 800);
    }
  }

  async function signOut() {
    try {
      await sb.auth.signOut();
    } catch (e) {
      err("signOut failed:", e);
    }
    setStatus("Signed out");
    setHint("");
  }

  function wireOnce() {
    if (sendBtn && !sendBtn.__slBound) {
      sendBtn.__slBound = true;
      sendBtn.addEventListener("click", (e) => {
        e.preventDefault();
        sendMagicLink();
      });
    }

    if (signOutBtn && !signOutBtn.__slBound) {
      signOutBtn.__slBound = true;
      signOutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        signOut();
      });
    }

    sb.auth.onAuthStateChange(() => {
      stripAuthNoiseFromUrl();
      refreshStatusLine();
    });
  }

  async function boot() {
    wireOnce();
    stripAuthNoiseFromUrl();
    await refreshStatusLine();
    log("Auth ready.");
  }

  // Expose a ready promise so app.js can wait (prevents race conditions)
  window.SL_AUTH.ready = boot();
})();
