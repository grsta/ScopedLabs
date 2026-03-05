/* /assets/auth.js
   Supabase v2 implicit magic-link auth.
   - Creates ONE client and exposes: window.SL_AUTH = { sb, ready }
   - Handles session restore from email link
   - Owns Sign out click and forces a clean redirect to avoid stale UI
*/

(() => {
  "use strict";

  const SUPABASE_URL = window.SL_SUPABASE_URL || window.SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.SL_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || "";

  if (!window.supabase || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[auth.js] Missing Supabase config or library.");
    window.SL_AUTH = { sb: null, ready: Promise.resolve() };
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  let readyResolve;
  const ready = new Promise((res) => (readyResolve = res));

  window.SL_AUTH = { sb, ready };

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, v) {
    const el = $(id);
    if (el) el.textContent = v == null ? "" : String(v);
  }

  function getCategoryForRedirect() {
    try {
      const u = new URL(location.href);
      return u.searchParams.get("category") || localStorage.getItem("sl_selected_category") || "";
    } catch {
      return localStorage.getItem("sl_selected_category") || "";
    }
  }

  async function refreshUi() {
    const { data } = await sb.auth.getSession();
    const session = data?.session || null;
    const email = session?.user?.email || "";

    // Upgrade page uses these; checkout page may use a subset
    const signed = $("sl-signedin");
    const status = $("sl-auth-status");

    if (signed) signed.textContent = email ? `Signed in as ${email}` : "Not signed in";
    if (status) status.textContent = email ? `Signed in as ${email}` : "Not signed in";

    // hide email input when signed in (if it exists)
    const emailWrap = $("sl-email-wrap");
    const emailInput = $("sl-email");
    if (emailWrap) emailWrap.style.display = email ? "none" : "";
    if (emailInput) emailInput.disabled = !!email;

    return session;
  }

  async function wireMagicLink() {
    const btn = $("sl-sendlink");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const emailEl = $("sl-email");
      const email = emailEl ? String(emailEl.value || "").trim() : "";
      if (!email) return;

      btn.disabled = true;
      setText("sl-auth-status", "Sending magic link…");

      try {
        const cat = getCategoryForRedirect();
        const redirectTo = `${location.origin}/upgrade/checkout/?category=${encodeURIComponent(
          cat || ""
        )}`;

        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });

        if (error) throw error;

        setText("sl-auth-status", "Check your email for the sign-in link.");
      } catch (e) {
        console.error(e);
        setText("sl-auth-status", "Failed to send magic link.");
      } finally {
        btn.disabled = false;
      }
    });
  }

  async function wireSignOut() {
    const btn = $("sl-signout");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      setText("sl-auth-status", "Signing out…");

      try {
        // IMPORTANT: app.js does NOT also sign out (avoids lock/race errors)
        await sb.auth.signOut();
      } catch (e) {
        console.warn("[auth.js] signOut error (continuing):", e);
      } finally {
        try {
          // Optional: keep category selection, or clear it — your call.
          // localStorage.removeItem("sl_selected_category");
        } catch {}

        // Force a clean page load so UI never shows stale "Signed in"
        location.replace("/upgrade/#checkout");
      }
    });
  }

  async function cleanupAuthHashIfPresent() {
    // After implicit flow, Supabase tokens may appear in URL hash; clean it.
    const hash = location.hash || "";
    if (!hash) return;

    // If it's our normal #checkout/#categories, keep it.
    if (hash === "#checkout" || hash === "#categories") return;

    // Otherwise remove hash junk while preserving search params
    try {
      const u = new URL(location.href);
      u.hash = "";
      history.replaceState({}, "", u.toString());
    } catch {}
  }

  (async () => {
    try {
      // Ensure session exchange happens
      await refreshUi();
      await cleanupAuthHashIfPresent();

      // Keep UI in sync
      sb.auth.onAuthStateChange(async () => {
        await refreshUi();
      });

      await wireMagicLink();
      await wireSignOut();
    } finally {
      readyResolve();
    }
  })();
})();




