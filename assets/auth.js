/* /assets/auth.js
   Supabase auth helper for ScopedLabs.
   - Exactly ONE client
   - Expose window.SL_AUTH = { sb, ready }
*/

(() => {
  "use strict";

  const SUPABASE_URL = (window.SL_SUPABASE_URL || "").trim();
  const SUPABASE_ANON_KEY = (window.SL_SUPABASE_ANON_KEY || "").trim();

  if (!window.supabase || !window.supabase.createClient) {
    console.error("[auth.js] Supabase v2 not loaded");
    window.SL_AUTH = { sb: null, ready: Promise.resolve() };
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[auth.js] Missing SUPABASE_URL / SUPABASE_ANON_KEY");
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
  const basePath = "/account/";
  const cat = getCategoryForRedirect();
  const url = new URL(basePath, location.origin);
  if (cat) url.searchParams.set("category", cat);

  // IMPORTANT: do not set url.hash at all
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

  async function cleanupTokenHashIfPresent() {
    // detectSessionInUrl restores; we just clean URL hash afterwards if it contains tokens
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) {
        if (location.hash && location.hash.includes("access_token")) {
          history.replaceState({}, "", location.pathname + location.search);
        }
      }
    } catch {}
  }

  (async () => {
    try {
      await cleanupTokenHashIfPresent();
      await wireSendLink();
      await wireSignOut();
    } finally {
      readyResolve();
    }
  })();
})();







