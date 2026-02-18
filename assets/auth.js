/* /assets/auth.js
   ScopedLabs auth controller (Supabase v2 magic link, implicit flow).
   - Creates ONE Supabase client.
   - Exposes: window.SL_AUTH = { sb, ready }
   - Handles:
     * send magic link
     * restore session from URL hash
     * basic status messages
*/

(() => {
  "use strict";

  // Requires Supabase UMD loaded first:
  // https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js

  const $ = (id) => document.getElementById(id);
  const pick = (...els) => els.find(Boolean) || null;

  const els = {
    email: () => pick($("sl-email"), $("sl-email-input"), $("email")),
    send: () => pick($("sl-sendlink"), $("sl-send-btn"), $("sl-send")),
    signout: () => pick($("sl-signout")),
    status: () => pick($("sl-auth-status"), $("sl-status"), $("status")),
  };

  function ensureStatus() {
    let st = els.status();
    if (st) return st;

    const btn = els.send();
    if (!btn || !btn.parentElement) return null;

    st = document.createElement("div");
    st.id = "sl-status";
    st.className = "muted";
    st.style.marginTop = "10px";
    st.style.fontSize = "0.95rem";
    st.style.opacity = "0.9";
    st.parentElement.appendChild(st);
    return st;
  }

  function setStatus(msg, kind = "info") {
    const st = ensureStatus();
    if (!st) return;
    st.textContent = msg || "";
    st.classList.remove("ok", "error", "warn", "info");
    st.classList.add(kind);
  }

  function getCategory() {
    try {
      const u = new URL(location.href);
      const cat = (u.searchParams.get("category") || "").trim();
      if (cat) return cat;
    } catch {}
    try {
      return (localStorage.getItem("sl_selected_category") || "").trim();
    } catch {}
    return "";
  }

  function getEmailValue() {
    const input = els.email();
    return input ? String(input.value || "").trim() : "";
  }

  function setEmailValue(v) {
    const input = els.email();
    if (input) input.value = v || "";
  }

  function isSupabaseLoaded() {
    return !!(window.supabase && window.supabase.createClient);
  }

  function createClient() {
    if (!isSupabaseLoaded()) return null;

    // Prefer stripe-map injection if present:
    // window.SL_SUPABASE = { url, anonKey }
    const SUPABASE_URL =
      (window.SL_SUPABASE && window.SL_SUPABASE.url) ||
      "https://ybnzjtuecirzajraddft.supabase.co";

    const SUPABASE_ANON_KEY =
      (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  async function init() {
    try {
      if (!isSupabaseLoaded()) {
        console.warn("[SL_AUTH] supabase-js is not loaded.");
        setStatus("Auth failed to load (Supabase script missing).", "error");
        return;
      }

      const sb = createClient();
      if (!sb) {
        console.warn("[SL_AUTH] Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
        setStatus("Auth not configured.", "error");
        return;
      }

      if (!window.SL_AUTH) window.SL_AUTH = {};
      window.SL_AUTH.sb = sb;

      // If URL has an auth hash, Supabase should auto-detect and restore session.
      // We'll still check and clean up URL hash for aesthetics.
      const { data } = await sb.auth.getSession();
      const session = data && data.session ? data.session : null;

      if (session && session.user && session.user.email) {
        setEmailValue(session.user.email);
        setStatus(`Signed in as ${session.user.email}`, "ok");
        // Clean up URL hash if it looks like an auth redirect
        if (location.hash && location.hash.includes("access_token=")) {
          history.replaceState({}, document.title, location.pathname + location.search);
        }
      } else {
        // Not signed in yet
        // If we have auth error params, show something human-friendly
        const params = new URLSearchParams(location.search);
        const err = params.get("error") || "";
        const desc = params.get("error_description") || "";
        if (err) {
          setStatus(`Sign-in failed: ${desc || err}`, "error");
        } else {
          setStatus("", "info");
        }
      }

      // Bind send magic link
      const sendBtn = els.send();
      if (sendBtn) {
        sendBtn.addEventListener("click", async (e) => {
          e.preventDefault();

          const email = getEmailValue();
          if (!email) {
            setStatus("Enter your email first.", "warn");
            return;
          }

          const cat = getCategory();
          const redirectTo = `${location.origin}/upgrade/checkout/?category=${encodeURIComponent(cat || "")}`;

          try {
            setStatus("Sending magic link…", "info");

            const { error } = await sb.auth.signInWithOtp({
              email,
              options: {
                emailRedirectTo: redirectTo,
              },
            });

            if (error) throw error;

            setStatus(`Magic link sent to ${email}. Check your email.`, "ok");
          } catch (err) {
            console.warn("signInWithOtp failed", err);
            setStatus("Could not send magic link.", "error");
          }
        });
      }

      // Bind signout
      const so = els.signout();
      if (so) {
        so.addEventListener("click", async (e) => {
          e.preventDefault();
          try {
            await sb.auth.signOut();
          } catch {}
          try {
            localStorage.removeItem("sl_selected_category");
          } catch {}
          setStatus("Signed out.", "info");
          location.href = "/upgrade/#checkout";
        });
      }
    } catch (e) {
      console.warn("auth init error", e);
      setStatus("Auth failed to initialize.", "error");
    }
  }

  if (!window.SL_AUTH) window.SL_AUTH = {};
  window.SL_AUTH.ready = init();
})();






