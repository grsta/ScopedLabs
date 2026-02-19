/* /assets/auth.js
   ScopedLabs Auth (Supabase v2, magic-link implicit flow)

   Requirements:
   - Supabase UMD loaded first:
     https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js
   - Expose:
     window.SL_AUTH = { sb, ready, getSession }

   Behavior:
   - Always updates a status line immediately:
     * when sending link
     * while restoring session from URL
     * once signed in / signed out
   - Clears "Signing you in…" when session exists
*/

(() => {
  "use strict";

  // Prefer injected config if present:
  // window.SL_SUPABASE = { url, anonKey }
  const SUPABASE_URL =
    (window.SL_SUPABASE && window.SL_SUPABASE.url) ||
    "https://ybnzjtuecirzajraddft.supabase.co";

  const SUPABASE_ANON_KEY =
    (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";

  const $ = (id) => document.getElementById(id);

  const els = {
    email: () => $("sl-email") || $("sl-email-input") || $("email"),
    send: () => $("sl-sendlink") || $("sl-send-btn"),
    signout: () => $("sl-signout"),
    status: () => $("sl-status") || $("sl-auth-status") || $("status"),
  };

  function ensureStatusEl() {
    let st = els.status();
    if (st) return st;

    // If page didn't include a status element, create one near the send button.
    const btn = els.send();
    if (btn && btn.parentElement) {
      st = document.createElement("div");
      st.id = "sl-status";
      st.className = "muted";
      st.style.marginTop = "10px";
      st.style.fontSize = "0.95rem";
      st.style.opacity = "0.9";
      btn.parentElement.appendChild(st);
      return st;
    }

    return null;
  }

  function setStatus(msg, kind = "info") {
    const st = ensureStatusEl();
    if (!st) return;

    st.textContent = msg || "";
    st.dataset.kind = kind || "info";
  }

  function getCategoryFromUrlOrStorage() {
    const u = new URL(location.href);
    const cat = u.searchParams.get("category");
    if (cat && String(cat).trim()) return String(cat).trim();
    try {
      const ls = localStorage.getItem("sl_selected_category");
      if (ls && String(ls).trim()) return String(ls).trim();
    } catch {}
    return "";
  }

  function getRedirectTo() {
    const cat = encodeURIComponent(getCategoryFromUrlOrStorage() || "");
    // Always redirect magic link back to checkout page (where Stripe happens)
    // If no category, still land on checkout and force selection there.
    return `https://scopedlabs.com/upgrade/checkout/?category=${cat}`;
  }

  function createClient() {
    try {
      if (!window.supabase || !window.supabase.createClient) {
        console.warn("[SL_AUTH] Supabase UMD not loaded.");
        setStatus("Auth failed to load (Supabase script missing).", "error");
        return null;
      }

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn("[SL_AUTH] Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
        setStatus("Auth not configured (missing Supabase keys).", "error");
        return null;
      }

      return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          flowType: "implicit",
          detectSessionInUrl: true,
          autoRefreshToken: true,
          persistSession: true,
        },
      });
    } catch (e) {
      console.warn("[SL_AUTH] createClient failed:", e);
      setStatus("Auth init failed.", "error");
      return null;
    }
  }

  const sb = createClient();

  // Expose API immediately so app.js can wait on it
  if (!window.SL_AUTH) window.SL_AUTH = {};
  window.SL_AUTH.sb = sb;

  window.SL_AUTH.getSession = async () => {
    if (!sb) return null;
    try {
      const { data } = await sb.auth.getSession();
      return data && data.session ? data.session : null;
    } catch {
      return null;
    }
  };

  // READY promise: resolves once we've attempted URL session restore + initial UI update
  window.SL_AUTH.ready = (async () => {
    if (!sb) return null;

    // If we landed with a hash that looks like auth tokens, show status immediately
    const hash = location.hash || "";
    const looksLikeAuth =
      hash.includes("access_token=") ||
      hash.includes("refresh_token=") ||
      hash.includes("token_type=") ||
      hash.includes("expires_in=") ||
      hash.includes("error=");

    if (looksLikeAuth) setStatus("Signing you in…", "info");

    // First check if there's already a session
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) {
        setStatus(`Signed in as ${data.session.user.email}`, "ok");
        // Clean up URL hash if present
        if (hash && hash.length > 1) {
          history.replaceState({}, document.title, location.pathname + location.search);
        }
        return data.session;
      }
    } catch {}

    // Subscribe to auth changes (session may arrive from URL parsing)
    const sub = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStatus(`Signed in as ${session.user.email}`, "ok");
        // Strip token hash to avoid re-processing on reload
        if (location.hash && location.hash.length > 1) {
          history.replaceState({}, document.title, location.pathname + location.search);
        }
      } else if (event === "SIGNED_OUT") {
        setStatus("Signed out.", "info");
      } else if (event === "TOKEN_REFRESHED" && session) {
        setStatus(`Signed in as ${session.user.email}`, "ok");
      }
    });

    // Final pass: after a short moment, re-check session (covers delayed URL parsing)
    await new Promise((r) => setTimeout(r, 300));
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) {
        setStatus(`Signed in as ${data.session.user.email}`, "ok");
        if (location.hash && location.hash.length > 1) {
          history.replaceState({}, document.title, location.pathname + location.search);
        }
        return data.session;
      }
    } catch {}

    // No session
    if (!looksLikeAuth) setStatus("", "info"); // keep quiet until user interacts
    return null;
  })();

  // Send magic link
  async function sendMagicLink() {
    if (!sb) return;

    const emailEl = els.email();
    const btn = els.send();
    const email = emailEl ? String(emailEl.value || "").trim() : "";

    if (!email) {
      setStatus("Enter your email first.", "error");
      if (emailEl) emailEl.focus();
      return;
    }

    if (btn) btn.disabled = true;
    setStatus("Sending magic link…", "info");

    try {
      const redirectTo = getRedirectTo();

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      setStatus("Check your email for the login link.", "ok");
    } catch (e) {
      console.warn("[SL_AUTH] signInWithOtp error:", e);
      setStatus("Failed to send magic link.", "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // Sign out
  async function doSignOut() {
    if (!sb) return;
    try {
      await sb.auth.signOut();
    } catch {}
  }

  // Wire buttons (if present on this page)
  const sendBtn = els.send();
  if (sendBtn) {
    sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      sendMagicLink();
    });
  }

  const signoutBtn = els.signout();
  if (signoutBtn) {
    signoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      doSignOut();
    });
  }
})();








