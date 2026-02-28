/* /assets/auth.js
   ScopedLabs Supabase auth (v2) — bulletproof implicit flow.

   Fixes:
   - If magic link arrives as: #checkout#access_token=...
     normalize to: #access_token=...
     BEFORE Supabase reads the hash.
   - Never appends UI hashes (like #checkout) to emailRedirectTo.
   - Uses current origin so preview domains / www mismatches don't break.
*/

(() => {
  "use strict";

  // ---- HARD FIX: normalize poisoned hash BEFORE createClient runs ----
  // Example bad hash: "#checkout#access_token=...."
  try {
    const h = String(location.hash || "");
    if (h.startsWith("#checkout#access_token=")) {
      const fixed = "#" + h.slice("#checkout#".length); // "#access_token=..."
      history.replaceState({}, "", location.pathname + location.search + fixed);
    }
  } catch {}

  const SUPABASE_URL = (window.SL_SUPABASE_URL || "").trim();
  const SUPABASE_ANON_KEY = (window.SL_SUPABASE_ANON_KEY || "").trim();

  if (!window.supabase || !window.supabase.createClient) {
    console.error("[auth.js] Supabase v2 not loaded");
    window.SL_AUTH = { sb: null, ready: Promise.resolve() };
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[auth.js] Missing SL_SUPABASE_URL / SL_SUPABASE_ANON_KEY globals");
    window.SL_AUTH = { sb: null, ready: Promise.resolve() };
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  });

  let readyResolve;
  const ready = new Promise((resolve) => (readyResolve = resolve));
  window.SL_AUTH = { sb, ready };

  function getCategoryForRedirect() {
    try {
      const u = new URL(location.href);
      return (
        (u.searchParams.get("category") || "").trim() ||
        (localStorage.getItem("sl_selected_category") || "").trim() ||
        ""
      );
    } catch {
      return (localStorage.getItem("sl_selected_category") || "").trim() || "";
    }
  }

  function buildRedirectUrl() {
    // IMPORTANT: NO HASH HERE. Supabase uses hash for tokens in implicit flow.
    const basePath = "/account/"; // keep trailing slash
    const cat = getCategoryForRedirect();
    const url = new URL(basePath, location.origin);
    if (cat) url.searchParams.set("category", cat);
    return url.toString();
  }

  async function wireSendLink() {
    const btn = document.getElementById("sl-sendlink");
    const emailEl = document.getElementById("sl-email");
    if (!btn || !emailEl) return;

    btn.addEventListener("click", async () => {
      const email = (emailEl.value || "").trim();
      if (!email) return;

      btn.disabled = true;
      try {
        const redirectTo = buildRedirectUrl();

        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
      } catch (e) {
        console.error("[auth.js] signInWithOtp failed", e);
      } finally {
        btn.disabled = false;
      }
    });
  }

  async function wireSignOut() {
    const btn = document.getElementById("sl-signout");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      try {
        await sb.auth.signOut();
      } catch (e) {
        console.error("[auth.js] signOut failed", e);
      }
    });
  }

  async function cleanAuthHashOnceSessionExists() {
    // After Supabase reads tokens and establishes session,
    // clean the hash so refresh/back doesn't re-trigger weirdness.
    try {
      const { data } = await sb.auth.getSession();
      if (data?.session && location.hash && location.hash.includes("access_token=")) {
        history.replaceState({}, "", location.pathname + location.search);
      }
    } catch {}
  }

  (async () => {
    try {
      await wireSendLink();
      await wireSignOut();
      // Give Supabase a tick to process URL hash if present, then clean it.
      setTimeout(() => { cleanAuthHashOnceSessionExists(); }, 50);
    } finally {
      readyResolve();
    }
  })();
})();






