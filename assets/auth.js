/* /assets/auth.js
   ScopedLabs Supabase magic-link auth (v2, implicit flow)

   - Creates exactly ONE Supabase client
   - Exposes: window.SL_AUTH = { sb, ready }
   - Binds Send magic link button(s)
   - Restores session from magic link URL (detectSessionInUrl: true)
   - Dispatches "sl-auth-changed" when session changes
*/

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  function setStatus(msg, isError = false) {
    const el =
      $("#sl-status") ||
      $("#sl-email-hint") ||
      $("#sl-auth-status") ||
      $("#sl-auth-hint");
    if (!el) return;
    el.style.color = isError ? "#ffb3b3" : "";
    el.textContent = msg || "";
  }

  function normalizeEmail(s) {
    return String(s || "")
      .trim()
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function getCategory() {
    const u = new URL(window.location.href);
    const q = (u.searchParams.get("category") || "").trim();
    const ls = (localStorage.getItem("sl_selected_category") || "").trim();
    return q || ls || "";
  }

  function getEmailInput() {
    return (
      $("#sl-email") ||
      $("#sl-email-input") ||
      document.querySelector('input[type="email"]')
    );
  }

  function getSendBtn() {
    return $("#sl-sendlink") || $("#sl-send-btn") || $("#sl-send");
  }

  function getSignoutBtn() {
    return $("#sl-signout");
  }

  function dispatchAuthChanged(session) {
    try {
      window.dispatchEvent(
        new CustomEvent("sl-auth-changed", { detail: { session: session || null } })
      );
    } catch {}
  }

  // ---- Supabase config ----
  // Prefer window.SL_SUPABASE (from /assets/stripe-map.js), but allow hardcode fallback.
  const SUPABASE_URL =
    (window.SL_SUPABASE && window.SL_SUPABASE.url) ||
    "https://ybnzjtuecirzajraddft.supabase.co";

  let SUPABASE_ANON_KEY =
    (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";

  if (SUPABASE_ANON_KEY && /public\s*key\s*:/i.test(SUPABASE_ANON_KEY)) {
    SUPABASE_ANON_KEY = SUPABASE_ANON_KEY.replace(/.*public\s*key\s*:\s*/i, "");
  }

  const ready = (async () => {
    if (!window.supabase || !window.supabase.createClient) {
      console.warn("[SL_AUTH] supabase-js not loaded (check script order).");
      setStatus("Auth library not loaded.", true);
      return null;
    }

    if (!SUPABASE_URL || SUPABASE_URL.includes("PASTE_YOUR_SUPABASE_URL_HERE")) {
      console.warn("[SL_AUTH] Missing SUPABASE_URL.");
      setStatus("Auth not configured (missing URL).", true);
      return null;
    }

    if (
      !SUPABASE_ANON_KEY ||
      SUPABASE_ANON_KEY.includes("PASTE_YOUR_SUPABASE_ANON_KEY_HERE")
    ) {
      console.warn("[SL_AUTH] Missing SUPABASE_ANON_KEY.");
      setStatus("Auth not configured (missing key).", true);
      return null;
    }

    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "implicit",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    // expose globally (exactly one client)
    window.SL_AUTH = window.SL_AUTH || {};
    window.SL_AUTH.sb = sb;
    window.SL_AUTH.ready = Promise.resolve(sb);

    // Initial session check (after magic link restore, this may become valid)
    try {
      const { data } = await sb.auth.getSession();
      dispatchAuthChanged(data ? data.session : null);
    } catch (e) {
      console.warn("[SL_AUTH] getSession error:", e);
    }

    // Keep app updated on auth changes
    try {
      sb.auth.onAuthStateChange((_event, session) => {
        dispatchAuthChanged(session || null);

        // If we landed with a token fragment, clean it up after session appears
        if (session && window.location.hash && window.location.hash.includes("access_token")) {
          const clean = new URL(window.location.href);
          // Preserve category
          const cat = getCategory();
          if (cat) clean.searchParams.set("category", cat);
          // Remove token fragment + land nicely
          clean.hash = clean.pathname.startsWith("/upgrade/checkout") ? "" : "checkout";
          history.replaceState({}, "", clean.toString());
        }
      });
    } catch {}

    // Bind send magic link
    const btn = getSendBtn();
    const emailEl = getEmailInput();

    if (btn) {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();

        const rawEmail = emailEl ? emailEl.value : "";
        const email = normalizeEmail(rawEmail);

        if (!email || !email.includes("@")) {
          setStatus("Enter a valid email address.", true);
          if (emailEl) emailEl.focus();
          return;
        }

        const cat = getCategory();
        if (cat) localStorage.setItem("sl_selected_category", cat);

        // IMPORTANT: redirect directly to checkout page to simplify restore flow
        const redirectTo = `${window.location.origin}/upgrade/checkout/?${
          cat ? `category=${encodeURIComponent(cat)}` : ""
        }`;

        try {
          btn.disabled = true;
          setStatus("Sending magic link…");

          const { error } = await sb.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: redirectTo,
            },
          });

          if (error) {
            console.warn("[SL_AUTH] signInWithOtp error:", error);
            setStatus("Could not send link: " + (error.message || "Unknown error"), true);
            btn.disabled = false;
            return;
          }

          setStatus("Magic link sent. Check your inbox.");
          btn.disabled = false;
        } catch (err) {
          console.warn("[SL_AUTH] send exception:", err);
          setStatus("Could not send link (error).", true);
          btn.disabled = false;
        }
      });
    } else {
      console.warn("[SL_AUTH] Send button not found.");
    }

    // Bind sign out
    const signoutBtn = getSignoutBtn();
    if (signoutBtn) {
      signoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await sb.auth.signOut();
        } catch {}
        localStorage.removeItem("sl_selected_category");
        setStatus("Signed out.");
        // Keep them in upgrade flow
        window.location.href = "/upgrade/#checkout";
      });
    }

    return sb;
  })();

  // Always expose ready promise (even before it resolves)
  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.ready = ready;
})();

