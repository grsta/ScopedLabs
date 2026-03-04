/* /assets/auth.js
   ScopedLabs Supabase auth (v2) — implicit flow, Upgrade-first redirect.

   Key behavior:
   - Magic link always returns to /upgrade/?category=<cat>#checkout (NOT /upgrade/checkout)
   - Handles poisoned hash "#checkout#access_token=..." by normalizing before Supabase parses
   - Removes auth hash after session is established (prevents re-processing on refresh/back)
   - Exposes: window.SL_AUTH = { sb, ready }
*/

(() => {
  "use strict";

  // ---- Fix poisoned hash before Supabase reads it ----
  // Example bad hash: "#checkout#access_token=...."
  try {
    const h = String(location.hash || "");
    if (h.startsWith("#checkout#access_token=")) {
      const fixed = "#" + h.slice("#checkout#".length); // "#access_token=..."
      history.replaceState({}, "", location.pathname + location.search + fixed);
    }
  } catch {}

  // Supabase globals provided by your HTML
  const SUPABASE_URL = String(window.SL_SUPABASE_URL || "").trim();
  const SUPABASE_ANON_KEY = String(window.SL_SUPABASE_ANON_KEY || "").trim();

  if (!window.supabase || !window.supabase.createClient) {
    console.error("[auth.js] Supabase v2 not loaded");
    window.SL_AUTH = { sb: null, ready: Promise.resolve() };
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[auth.js] Missing SL_SUPABASE_URL / SL_SUPABASE_ANON_KEY");
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

  function normKebab(cat) {
    return String(cat || "").trim().toLowerCase().replace(/_/g, "-");
  }

  function getCategoryForRedirect() {
    try {
      const u = new URL(location.href);
      const fromUrl = normKebab(u.searchParams.get("category"));
      const fromLs = normKebab(localStorage.getItem("sl_selected_category"));
      return fromUrl || fromLs || "";
    } catch {
      return normKebab(localStorage.getItem("sl_selected_category")) || "";
    }
  }

  function buildUpgradeRedirectUrl() {
    // IMPORTANT: No hash other than #checkout.
    // Implicit flow uses hash for tokens, so DO NOT add other hashes.
    const cat = getCategoryForRedirect();
    const u = new URL("/upgrade/", location.origin);
    if (cat) u.searchParams.set("category", cat);
    u.hash = "#checkout";
    return u.toString();
  }

  async function wireSendLink() {
    const btn = document.getElementById("sl-sendlink");
    const emailEl = document.getElementById("sl-email");
    if (!btn || !emailEl) return;

    btn.addEventListener("click", async () => {
      const email = String(emailEl.value || "").trim();
      if (!email) return;

      // lock category before sending link
      const cat = getCategoryForRedirect();
      if (cat) localStorage.setItem("sl_selected_category", cat);

      btn.disabled = true;
      try {
        const redirectTo = buildUpgradeRedirectUrl();

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
    // After Supabase reads tokens and establishes session, remove hash tokens
    // so refresh/back doesn't re-run session parsing.
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

      // Let Supabase process URL hash first, then clean it
      setTimeout(() => cleanAuthHashOnceSessionExists(), 50);
    } finally {
      readyResolve();
    }
  })();
})();





