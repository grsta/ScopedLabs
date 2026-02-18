/* /assets/auth.js
   ScopedLabs magic-link auth (Supabase v2) — Upgrade flow

   - Wires Send magic link button(s): #sl-send-btn OR #sl-sendlink
   - Uses implicit flow (no PKCE)
   - Restores session from magic-link URL (detectSessionInUrl: true)
   - Updates UI + dispatches "sl-auth-changed" event
*/

(() => {
  "use strict";

  // ---- Supabase config ----
  // Preferred: provided by /assets/stripe-map.js as window.SL_SUPABASE = { url, anonKey }
  // Fallback: hardcode here if needed.
  const SUPABASE_URL =
    (window.SL_SUPABASE && window.SL_SUPABASE.url) ||
    "PASTE_YOUR_SUPABASE_URL_HERE";

  const SUPABASE_ANON_KEY =
    (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) ||
    "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

  // ---- DOM helpers ----
  function $(sel) {
    return document.querySelector(sel);
  }

  const els = {
    email: $("#sl-email"),
    sendBtn: $("#sl-send-btn") || $("#sl-sendlink"),
    hint: $("#sl-email-hint"),
    signout: $("#sl-signout"),
    signedInAs: $("#sl-signed-in-as"),
  };

  function setHint(msg, isError = false) {
    if (!els.hint) return;
    els.hint.textContent = msg || "";
    els.hint.style.opacity = msg ? "1" : "";
    els.hint.style.color = isError ? "#ffb4b4" : "";
  }

  function setSignedInAs(email) {
    if (!els.signedInAs) return;
    els.signedInAs.textContent = email ? `Signed in as ${email}` : "";
    els.signedInAs.style.display = email ? "block" : "none";
  }

  function dispatchAuthChanged(session) {
    try {
      window.dispatchEvent(
        new CustomEvent("sl-auth-changed", { detail: { session: session || null } })
      );
    } catch {}
  }

  function currentCategoryFromUrlOrStorage() {
    const u = new URL(window.location.href);
    const cat = (u.searchParams.get("category") || "").trim();
    if (cat) return cat;
    try {
      return (localStorage.getItem("sl_selected_category") || "").trim();
    } catch {
      return "";
    }
  }

  function buildEmailRedirectTo() {
    // Always land on the checkout page after email click
    // Keep category if we have it.
    const cat = currentCategoryFromUrlOrStorage();
    const url = new URL("/upgrade/checkout/", window.location.origin);
    if (cat) url.searchParams.set("category", cat);
    return url.toString();
  }

  function stripAuthHashPreserveIntent() {
    // With implicit flow, tokens arrive in URL hash.
    // After Supabase reads them, we should clean the URL.
    const href = window.location.href;
    if (!href.includes("#")) return;

    const hash = window.location.hash || "";
    const hasTokens =
      hash.includes("access_token=") ||
      hash.includes("refresh_token=") ||
      hash.includes("type=") ||
      hash.includes("expires_in=");

    if (!hasTokens) return;

    const u = new URL(window.location.href);
    // Remove hash tokens; keep checkout intent
    u.hash = ""; // checkout page doesn't need #checkout
    history.replaceState({}, document.title, u.toString());
  }

  async function ensureSupabaseLoaded() {
    if (!window.supabase || !window.supabase.createClient) {
      console.warn("[SL_AUTH] supabase-js not loaded (check script order).");
      return false;
    }
    if (!SUPABASE_URL || SUPABASE_URL.includes("PASTE_")) {
      console.warn("[SL_AUTH] Missing SUPABASE_URL.");
      setHint("Auth not configured (missing URL).", true);
      return false;
    }
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("PASTE_")) {
      console.warn("[SL_AUTH] Missing SUPABASE_ANON_KEY.");
      setHint("Auth not configured (missing key).", true);
      return false;
    }
    return true;
  }

  const ready = (async () => {
    const ok = await ensureSupabaseLoaded();
    if (!ok) return null;

    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        autoRefreshToken: true,
        persistSession: true,
      },
    });

    // expose globally for app.js
    window.SL_AUTH = window.SL_AUTH || {};
    window.SL_AUTH.sb = sb;

    // Initial session check (may already be present)
    try {
      const { data } = await sb.auth.getSession();
      const session = data && data.session ? data.session : null;
      if (session && session.user && session.user.email) {
        setSignedInAs(session.user.email);
        dispatchAuthChanged(session);
      } else {
        setSignedInAs("");
        dispatchAuthChanged(null);
      }
    } catch {
      setSignedInAs("");
      dispatchAuthChanged(null);
    }

    // Clean token hash after Supabase consumes it
    try {
      stripAuthHashPreserveIntent();
    } catch {}

    // Keep UI synced
    try {
      sb.auth.onAuthStateChange((_event, session) => {
        const email = session && session.user ? session.user.email : "";
        setSignedInAs(email);
        dispatchAuthChanged(session || null);

        // If we just signed in, clear any old hint
        if (email) setHint("");
      });
    } catch {}

    // Wire Send magic link
    if (els.sendBtn) {
      els.sendBtn.addEventListener("click", async () => {
        const email = (els.email && els.email.value ? els.email.value : "").trim();
        if (!email) {
          setHint("Enter your email first.", true);
          return;
        }

        els.sendBtn.disabled = true;
        setHint("Sending magic link…");

        try {
          const redirectTo = buildEmailRedirectTo();
          const { error } = await sb.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectTo },
          });

          if (error) throw error;

          setHint("Magic link sent. Check your inbox.");
        } catch (err) {
          console.warn("[SL_AUTH] send link failed", err);
          setHint("Failed to send link. Try again.", true);
        } finally {
          els.sendBtn.disabled = false;
        }
      });
    }

    // Wire Sign out
    if (els.signout) {
      els.signout.addEventListener("click", async () => {
        try {
          await sb.auth.signOut();
        } catch {}
        try {
          localStorage.removeItem("sl_selected_category");
        } catch {}
        setSignedInAs("");
        dispatchAuthChanged(null);
        setHint("Signed out.");
      });
    }

    return sb;
  })();

  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.ready = ready;
})();


