/* /assets/auth.js
   ScopedLabs Magic Link Auth (Supabase v2) — single source of truth

   - Creates exactly ONE Supabase client
   - Exposes: window.SL_AUTH = { sb, ready, getSession }
   - Always updates a status line immediately:
       * on Send
       * on session restore
       * on errors
   - Clears "Signing you in..." once session exists (via event + status update)

   REQUIREMENTS:
   - Supabase UMD loaded BEFORE this file:
     <script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
*/

(() => {
  "use strict";

  // --- HARDWIRED CONFIG (stable; does not depend on stripe-map) ---
  const SUPABASE_URL = "https://ybnzjtuecirzajraddft.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";

  const LS_EMAIL = "sl_last_email";
  const LS_CAT = "sl_selected_category";

  const pick = (...els) => els.find(Boolean) || null;
  const $id = (id) => document.getElementById(id);

  // These IDs exist across your upgrade + checkout pages (with some legacy fallbacks)
  const els = {
    email: () => pick($id("sl-email"), $id("sl-email-input"), $id("email")),
    send: () => pick($id("sl-sendlink"), $id("sl-send-btn")),
    signout: () => pick($id("sl-signout"), $id("sl-logout")),
    status: () => pick($id("sl-status"), $id("sl-auth-status"), $id("status")),
    signedAs: () => pick($id("sl-signedas"), $id("sl-signed-in-as")),
  };

  function ensureStatusEl() {
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
    btn.parentElement.appendChild(st);
    return st;
  }

  function setStatus(msg, kind = "info") {
    const st = ensureStatusEl();
    if (!st) return;

    st.textContent = msg || "";
    st.dataset.kind = kind;

    // mild styling using existing theme; don’t fight CSS
    if (kind === "error") st.style.opacity = "1";
    else st.style.opacity = "0.9";
  }

  function normalizeEmail(v) {
    return (v || "").trim().toLowerCase();
  }

  function currentCategory() {
    // URL ?category= wins, else localStorage
    const url = new URL(location.href);
    const q = (url.searchParams.get("category") || "").trim();
    if (q) return q;
    try {
      return (localStorage.getItem(LS_CAT) || "").trim();
    } catch {
      return "";
    }
  }

  function buildRedirectToCheckout() {
    const cat = encodeURIComponent(currentCategory() || "");
    // Always send magic link to checkout page so session restore is deterministic
    // (Category is preserved to keep the user in the right lane.)
    return `https://scopedlabs.com/upgrade/checkout/?category=${cat}`;
  }

  function stripAuthParamsFromUrl() {
    // Remove #access_token / etc after restore (clean UX, prevents re-processing)
    try {
      const hasHash = location.hash && location.hash.length > 1;
      if (!hasHash) return;
      const h = location.hash.toLowerCase();
      if (h.includes("access_token") || h.includes("refresh_token") || h.includes("type=recovery")) {
        history.replaceState({}, document.title, location.pathname + location.search);
      }
    } catch {}
  }

  // ---- Supabase client creation (single instance) ----
  function createClientOnce() {
    if (!window.supabase || !window.supabase.createClient) {
      setStatus("Auth failed to load (Supabase script missing).", "error");
      return null;
    }

    // Prevent accidental double-clients across hot reload / duplicate tags
    if (window.SL_AUTH && window.SL_AUTH.sb) {
      return window.SL_AUTH.sb;
    }

    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    return sb;
  }

  const sb = createClientOnce();

  // Expose immediately (so app.js can wait on ready)
  if (!window.SL_AUTH) window.SL_AUTH = {};
  window.SL_AUTH.sb = sb;

  window.SL_AUTH.getSession = async () => {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data && data.session ? data.session : null;
  };

  // READY promise resolves once we’ve attempted session restore
  window.SL_AUTH.ready = (async () => {
    if (!sb) return null;

    // If we landed here from an email link, show immediate feedback
    if (location.hash && location.hash.includes("access_token")) {
      setStatus("Signing you in…", "info");
    }

    // Attempt initial session load
    try {
      const s = await window.SL_AUTH.getSession();
      if (s && s.user && s.user.email) {
        setStatus(`Signed in as ${s.user.email}`, "info");
        const signed = els.signedAs();
        if (signed) signed.textContent = `Signed in as ${s.user.email}`;
        stripAuthParamsFromUrl();
        window.dispatchEvent(new CustomEvent("sl:session", { detail: { session: s } }));
        return s;
      }
    } catch (e) {
      setStatus("Auth init error (check console).", "error");
      console.warn("[SL_AUTH] init error", e);
    }

    // Listen for auth changes
    sb.auth.onAuthStateChange((event, session) => {
      if (session && session.user && session.user.email) {
        setStatus(`Signed in as ${session.user.email}`, "info");
        const signed = els.signedAs();
        if (signed) signed.textContent = `Signed in as ${session.user.email}`;
        stripAuthParamsFromUrl();
        window.dispatchEvent(new CustomEvent("sl:session", { detail: { session } }));
      } else if (event === "SIGNED_OUT") {
        setStatus("Signed out.", "info");
        const signed = els.signedAs();
        if (signed) signed.textContent = "";
        window.dispatchEvent(new CustomEvent("sl:session", { detail: { session: null } }));
      }
    });

    // Handle explicit error params from OTP links
    try {
      const u = new URL(location.href);
      const err = u.searchParams.get("error_description") || "";
      const code = u.searchParams.get("error_code") || "";
      if (err) {
        setStatus(decodeURIComponent(err).replace(/\+/g, " "), "error");
        if (code) console.warn("[SL_AUTH] error_code:", code);
      }
    } catch {}

    return null;
  })();

  // ---- Wire Send Magic Link ----
  function wireSend() {
    const btn = els.send();
    if (!btn || !sb) return;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();

      const input = els.email();
      const email = normalizeEmail(input ? input.value : "");
      if (!email) {
        setStatus("Enter your email to continue.", "error");
        if (input) input.focus();
        return;
      }

      try {
        localStorage.setItem(LS_EMAIL, email);
      } catch {}

      btn.disabled = true;
      setStatus("Sending magic link…", "info");

      try {
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: buildRedirectToCheckout(),
            shouldCreateUser: true,
          },
        });

        if (error) {
          console.warn("[SL_AUTH] signInWithOtp error", error);
          setStatus(error.message || "Failed to send magic link.", "error");
          btn.disabled = false;
          return;
        }

        setStatus("✅ Check your email for the magic link.", "info");
        btn.disabled = false;
      } catch (err) {
        console.warn("[SL_AUTH] unexpected send error", err);
        setStatus("Failed to send magic link (unexpected error).", "error");
        btn.disabled = false;
      }
    });
  }

  // ---- Wire Sign Out ----
  function wireSignOut() {
    const btn = els.signout();
    if (!btn || !sb) return;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      btn.disabled = true;

      try {
        await sb.auth.signOut();
      } catch (err) {
        console.warn("[SL_AUTH] signOut error", err);
      }

      // Keep category (your call), but clear last email to reduce confusion
      try {
        localStorage.removeItem(LS_EMAIL);
      } catch {}

      setStatus("Signed out.", "info");
      btn.disabled = false;

      // If on checkout page, return to upgrade checkout section
      if (location.pathname.startsWith("/upgrade/checkout")) {
        const cat = encodeURIComponent(currentCategory() || "");
        location.href = `/upgrade/?category=${cat}#checkout`;
      } else {
        // stay on upgrade
        const cat = encodeURIComponent(currentCategory() || "");
        location.href = `/upgrade/?category=${cat}#checkout`;
      }
    });
  }

  // ---- Init ----
  wireSend();
  wireSignOut();

  // Restore last email into input (nice UX)
  try {
    const last = localStorage.getItem(LS_EMAIL) || "";
    const input = els.email();
    if (input && last && !input.value) input.value = last;
  } catch {}

  console.log("[SL_AUTH] loaded", {
    url_ok: !!SUPABASE_URL,
    anon_len: (SUPABASE_ANON_KEY || "").length,
    script: document.currentScript && document.currentScript.src,
  });
})();






