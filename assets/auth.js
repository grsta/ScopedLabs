/* /assets/auth.js
   ScopedLabs magic-link auth (Supabase v2) — Upgrade flow

   - Wires Send magic link button(s): #sl-send-btn OR #sl-sendlink
   - Uses implicit flow (no PKCE)
   - Restores session from magic-link URL (detectSessionInUrl: true)
   - Updates UI + dispatches "sl-auth-changed" event
   - Scrolls to #checkout after successful session restore
*/

(() => {
  "use strict";

  // --- Grab Supabase config ---
  // Preferred: provided by /assets/stripe-map.js as window.SL_SUPABASE = { url, anonKey }
  // Fallback: you MAY hardcode here if needed.
  const SUPABASE_URL =
    (window.SL_SUPABASE && window.SL_SUPABASE.url) || "";
  const SUPABASE_ANON_KEY =
    (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) || "";

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

  async function ensureSupabaseLoaded() {
    // Supabase v2 is loaded by:
    // <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    if (!window.supabase || !window.supabase.createClient) {
      setHint("Auth library not loaded (check script order).", true);
      return null;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setHint("Auth not configured (missing Supabase URL/key).", true);
      console.warn("[SL_AUTH] Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
      return null;
    }
    return window.supabase;
  }

  const ready = (async () => {
    const supabase = await ensureSupabaseLoaded();
    if (!supabase) return null;

    const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    // Initial session check
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
    } catch (e) {
      console.warn("[SL_AUTH] getSession failed:", e);
      dispatchAuthChanged(null);
    }

    // Listen for auth changes
    sb.auth.onAuthStateChange((_event, session) => {
      const email = session && session.user ? session.user.email : "";
      setSignedInAs(email);
      dispatchAuthChanged(session || null);

      // If we just became signed in, jump to checkout section
      if (session && location.hash !== "#checkout") {
        // don’t wipe existing params; just set hash
        try {
          location.hash = "#checkout";
        } catch {}
      }
    });

    // Wire Send magic link
    if (els.sendBtn) {
      els.sendBtn.addEventListener("click", async () => {
        const email = (els.email && els.email.value ? els.email.value : "").trim();
        if (!email) {
          setHint("Enter your email first.", true);
          return;
        }

        // Get category from URL or localStorage (app.js also manages it)
        let cat = "";
        try {
          const u = new URL(location.href);
          cat = (u.searchParams.get("category") || "").trim();
        } catch {}
        if (!cat) {
          try {
            cat = (localStorage.getItem("sl_selected_category") || "").trim();
          } catch {}
        }

        // Always send them back to the upgrade page checkout card
        const redirectTo =
          location.origin +
          "/upgrade/?" +
          (cat ? `category=${encodeURIComponent(cat)}&` : "") +
          "return=checkout#checkout";

        try {
          els.sendBtn.disabled = true;
          setHint("Sending magic link…");
          const { error } = await sb.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectTo },
          });
          if (error) throw error;

          setHint("Magic link sent — check your email.");
        } catch (e) {
          console.error("[SL_AUTH] signInWithOtp error:", e);
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
        // keep them on upgrade checkout section
        try {
          location.href = "/upgrade/#checkout";
        } catch {}
      });
    }

    return sb;
  })();

  // Expose globally
  window.SL_AUTH = {
    ready, // Promise that resolves to supabase client (sb) or null
  };

  // Also show a little “ready” breadcrumb in console
  ready.then((sb) => {
    if (sb) console.log("[SL_AUTH] ready");
  });
})();
