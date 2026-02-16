/* /assets/auth.js
   ScopedLabs Upgrade Auth (Supabase v2) — FULL FILE OVERWRITE

   Goals:
   - Single Supabase client exposed as: window.SL_AUTH.sb
   - Send magic link -> return to /upgrade/checkout/?category=...
   - Handle callback exchange (PKCE) if ?code= is present
   - Gracefully handle PKCE verifier missing (common with incognito/profile mismatch)
   - Wire Sign out
   - Validate session so we don’t show “ghost logged-in” state after deleting users in Supabase
*/

(() => {
  "use strict";

  // Hard guard (prevents double init if script loaded twice)
  if (window.__SL_AUTH_INIT_DONE) return;
  window.__SL_AUTH_INIT_DONE = true;

  const LOG = "[auth]";
  const log = (...a) => console.log(LOG, ...a);
  const warn = (...a) => console.warn(LOG, ...a);
  const err = (...a) => console.error(LOG, ...a);

  const $ = (id) => document.getElementById(id);

  // Config (from stripe-map.js)
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

  // Elements (shared IDs you’re using)
  const emailInput = $("sl-email");
  const sendBtn = $("sl-sendlink");
  const hintEl = $("sl-email-hint");
  const statusEl = $("sl-status");
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
    // Force https in production (prevents mixed origin weirdness)
    const origin = (location.origin || "").replace("http://", "https://");
    const cat = getCategory();
    return cat
      ? `${origin}/upgrade/checkout/?category=${encodeURIComponent(cat)}`
      : `${origin}/upgrade/checkout/`;
  }

  function cleanAuthParamsFromUrl() {
    try {
      const u = new URL(location.href);
      const changed =
        u.searchParams.has("code") ||
        u.searchParams.has("type") ||
        u.searchParams.has("token_hash") ||
        u.searchParams.has("error") ||
        u.searchParams.has("error_description");

      u.searchParams.delete("code");
      u.searchParams.delete("type");
      u.searchParams.delete("token_hash");
      u.searchParams.delete("error");
      u.searchParams.delete("error_description");

      if (changed) history.replaceState({}, document.title, u.toString());
    } catch {}
  }

  // Create ONE client, globally shared
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Keep pkce (your current flow), but we’ll handle verifier-missing gracefully.
      flowType: "pkce",
    },
  });

  window.SL_AUTH = { sb };

  async function validateOrClearGhostSession() {
    // If a user was deleted in Supabase, local tokens can still exist.
    // getUser() will fail; we then sign out to avoid “I’m logged in” lies.
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

  async function exchangeIfNeeded() {
    // If we have ?code=, attempt exchange. If verifier missing, tell user to resend link.
    let code = "";
    try {
      const u = new URL(location.href);
      code = u.searchParams.get("code") || "";
    } catch {}

    if (!code) return;

    setStatus("Finishing sign-in…");
    log("Exchanging code for session…");

    const { error } = await sb.auth.exchangeCodeForSession(code);

    if (error) {
      err("exchangeCodeForSession failed:", error);

      const msg = (error?.message || "").toLowerCase();
      const looksLikePkceMissing =
        msg.includes("code verifier") ||
        msg.includes("pkce") ||
        msg.includes("missing");

      if (looksLikePkceMissing) {
        setStatus(
          "Sign-in link opened in a different browser/profile (PKCE verifier missing). Go back and send a NEW magic link from this same browser window."
        );
      } else {
        setStatus("Sign-in failed. Please send a new magic link.");
      }
      // Important: clean URL so we don’t keep retrying the broken code
      cleanAuthParamsFromUrl();
      return;
    }

    cleanAuthParamsFromUrl();
    setStatus("");
    log("Session established.");
  }

  async function refreshStatusLine() {
    // Validate session (prevents ghost state)
    await validateOrClearGhostSession();

    const { data } = await sb.auth.getSession();
    const session = data?.session || null;
    if (session?.user?.email) {
      setStatus(`Signed in as ${session.user.email}`);
    } else {
      setStatus("Not signed in");
    }
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
        options: { emailRedirectTo: redirectTo },
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
      refreshStatusLine();
    });
  }

  async function boot() {
    await exchangeIfNeeded();
    wireOnce();
    await refreshStatusLine();
    log("Auth ready.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

