/* /assets/auth.js
   ScopedLabs magic-link auth (Supabase v2) — Upgrade flow

   - Uses implicit flow (no PKCE) to avoid “Signing you in…” hangs
   - Sends magic link (OTP) and redirects user to /upgrade/checkout/?category=...
   - Restores session from magic-link URL (detectSessionInUrl: true)
   - Dispatches "sl-auth-changed" CustomEvent with { session }
   - Exposes: window.SL_AUTH = { sb, ready, session }
*/

(() => {
  "use strict";

  function $(sel) {
    return document.querySelector(sel);
  }

  function setStatus(msg, isErr = false) {
    const el = $("#sl-email-hint") || $("#sl-status");
    if (!el) return;
    el.textContent = msg || "";
    el.style.opacity = msg ? "1" : "";
    el.style.color = isErr ? "#ffb4b4" : "";
  }

  function normalizeEmail(v) {
    return String(v || "").trim();
  }

  function getCategoryFromUrlOrStorage() {
    try {
      const u = new URL(window.location.href);
      const c = (u.searchParams.get("category") || "").trim();
      if (c) return c;
    } catch {}
    try {
      const s = (localStorage.getItem("sl_selected_category") || "").trim();
      if (s) return s;
    } catch {}
    return "";
  }

  function dispatchAuthChanged(session) {
    try {
      window.dispatchEvent(
        new CustomEvent("sl-auth-changed", { detail: { session: session || null } })
      );
    } catch {}
  }

  async function createClient() {
    // Supabase v2 must be loaded first (cdn script tag)
    if (!window.supabase || !window.supabase.createClient) {
      console.warn("[SL_AUTH] Supabase-js v2 not loaded (check script order).");
      setStatus("Auth library not loaded (script order).", true);
      return null;
    }

    // Prefer config from /assets/stripe-map.js: window.SL_SUPABASE = { url, anonKey }
    const SUPABASE_URL =
      (window.SL_SUPABASE && window.SL_SUPABASE.url) ||
      "https://ybnzjtuecirzajraddft.supabase.co"; // ok if you hardcode here

    const SUPABASE_ANON_KEY =
      (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM"; // ok if you hardcode here

    if (!SUPABASE_URL) {
      console.warn("[SL_AUTH] Missing SUPABASE_URL (window.SL_SUPABASE.url).");
      setStatus("Auth not configured (missing URL).", true);
      return null;
    }
    if (!SUPABASE_ANON_KEY) {
      console.warn("[SL_AUTH] Missing SUPABASE_ANON_KEY (window.SL_SUPABASE.anonKey).");
      setStatus("Auth not configured (missing key).", true);
      return null;
    }

    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "implicit",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });

    // Keep a copy for app.js
    window.SL_AUTH = window.SL_AUTH || {};
    window.SL_AUTH.sb = sb;

    // Always broadcast auth changes
    sb.auth.onAuthStateChange((_event, session) => {
      window.SL_AUTH.session = session || null;
      dispatchAuthChanged(session || null);
    });

    // Force an initial session fetch (also completes detectSessionInUrl exchange)
    try {
      const { data } = await sb.auth.getSession();
      const session = (data && data.session) || null;
      window.SL_AUTH.session = session;
      dispatchAuthChanged(session);

      // If we arrived via magic link, keep the user on checkout section
      // (Some browsers end up at /upgrade/?category=x& after hash cleanup)
      const path = window.location.pathname || "";
      if (session && path.startsWith("/upgrade/")) {
        const u = new URL(window.location.href);

        // clean up weird trailing "&" if present
        // (not harmful, but looks sloppy)
        if (u.search.endsWith("&")) {
          u.search = u.search.slice(0, -1);
          history.replaceState({}, "", u.toString());
        }

        // If we're on /upgrade/ page, make sure we land on checkout card
        if (!u.hash || u.hash !== "#checkout") {
          u.hash = "checkout";
          history.replaceState({}, "", u.toString());
        }

        // Try to scroll to checkout without jitter
        setTimeout(() => {
          const checkout = document.getElementById("checkout");
          if (checkout && checkout.scrollIntoView) {
            checkout.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 150);
      }
    } catch (e) {
      console.warn("[SL_AUTH] getSession error:", e);
    }

    return sb;
  }

  async function bindUi(sb) {
    // Send button can be either ID depending on page
    const sendBtn = $("#sl-sendlink") || $("#sl-send-btn") || $("#sl-send");
    const emailEl = $("#sl-email");

    if (sendBtn) {
      sendBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (!sb) return;

        const email = normalizeEmail(emailEl ? emailEl.value : "");
        if (!email || !email.includes("@")) {
          setStatus("Enter a valid email address.", true);
          if (emailEl) emailEl.focus();
          return;
        }

        const cat = getCategoryFromUrlOrStorage();
        if (cat) {
          try {
            localStorage.setItem("sl_selected_category", cat);
          } catch {}
        }

        // IMPORTANT: land directly on the checkout PAGE after login
        const redirectTo = `${window.location.origin}/upgrade/checkout/?${
          cat ? `category=${encodeURIComponent(cat)}` : ""
        }`;

        try {
          sendBtn.disabled = true;
          setStatus("Sending magic link…");

          const { error } = await sb.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectTo },
          });

          if (error) {
            console.warn("[SL_AUTH] signInWithOtp error:", error);
            setStatus("Could not send link: " + (error.message || "Unknown error"), true);
            sendBtn.disabled = false;
            return;
          }

          setStatus("Magic link sent. Check your inbox.");
          sendBtn.disabled = false;
        } catch (err) {
          console.warn("[SL_AUTH] send exception:", err);
          setStatus("Could not send link (error).", true);
          sendBtn.disabled = false;
        }
      });
    }

    // Sign out (optional button exists on checkout page)
    const signoutBtn = $("#sl-signout");
    if (signoutBtn) {
      signoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await sb.auth.signOut();
        } catch {}
        try {
          localStorage.removeItem("sl_selected_category");
        } catch {}
        setStatus("Signed out.");
        window.location.href = "/upgrade/#checkout";
      });
    }
  }

  const ready = (async () => {
    const sb = await createClient();
    await bindUi(sb);
    return sb;
  })();

  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.ready = ready;
})();
