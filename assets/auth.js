/* /assets/auth.js
   ScopedLabs Upgrade Auth (Supabase v2)
   FULL FILE OVERWRITE
*/

(() => {
  "use strict";

  if (window.__SL_AUTH_INIT_DONE) return;
  window.__SL_AUTH_INIT_DONE = true;

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

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  });

  function stripAuthNoiseFromUrl() {
    try {
      const hash = location.hash || "";
      if (!hash) return;

      const looksLikeTokens =
        hash.includes("access_token=") ||
        hash.includes("refresh_token=") ||
        hash.includes("token_type=") ||
        hash.includes("expires_in=");

      if (looksLikeTokens) {
        history.replaceState(
          {},
          document.title,
          location.pathname + location.search
        );
      }
    } catch {}
  }

  sb.auth.onAuthStateChange(() => {
    stripAuthNoiseFromUrl();
  });

  window.SL_AUTH = {
    sb,
  };

  stripAuthNoiseFromUrl();
})();
