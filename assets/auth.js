// FILE: /assets/auth.js
/* /assets/auth.js
   ScopedLabs Upgrade Auth (Supabase v2) — IMPLICIT FLOW (NO PKCE)
   FULL FILE OVERWRITE
*/

(() => {
  "use strict";

  if (window.__SL_AUTH_INIT_DONE) return;
  window.__SL_AUTH_INIT_DONE = true;

  const $ = (id) => document.getElementById(id);

  const SUPABASE_URL = window.SL_SUPABASE_URL || window.SUPABASE_URL || "";
  const SUPABASE_ANON_KEY =
    window.SL_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || "";

  if (!window.supabase || !window.supabase.createClient) {
    console.error("[auth] Supabase JS v2 not loaded. Ensure supabase-js loads BEFORE auth.js");
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[auth] Missing SL_SUPABASE_URL / SL_SUPABASE_ANON_KEY.");
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

  function normCategory(v) {
    return (v || "").toString().trim();
  }

  function getCategory() {
    try {
      const u = new URL(location.href);
      const fromUrl = normCategory(u.searchParams.get("category"));
      if (fromUrl) return fromUrl;
    } catch {}

    try {
      const fromStorage = normCategory(localStorage.getItem("sl_selected_category"));
      if (fromStorage) return fromStorage;
    } catch {}

    return "";
  }

  function buildRedirectToCheckout() {
    const cat = getCategory();
    return `https://scopedlabs.com/upgrade/checkout/?category=${encodeURIComponent(cat || "")}`;
  }

  function stripAuthNoiseFromUrl() {
    try {
      const h = location.hash || "";
      if (!h) return;
      const looksLikeTokens =
        h.includes("access_token=") ||
        h.includes("refresh_token=") ||
        h.includes("token_type=") ||
        h.includes("expires_in=");
      if (looksLikeTokens) {
        history.replaceState({}, document.title, location.pathname + location.search);
      }
    } catch {}
  }

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

  async function refreshStatusLine() {
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
      console.error("[auth] signInWithOtp failed:", e);
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
      console.error("[auth] signOut failed:", e);
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

    sb.auth.onAuthStateChange(async () => {
      stripAuthNoiseFromUrl();
      await refreshStatusLine();
    });
  }

  async function boot() {
    wireOnce();
    stripAuthNoiseFromUrl();
    await refreshStatusLine();
    stripAuthNoiseFromUrl();
  }

  window.SL_AUTH.ready = boot();
})();
