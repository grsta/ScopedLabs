/* /assets/auth.js
   ScopedLabs magic-link auth (Supabase v2) — Upgrade flow

   - Uses implicit flow (no PKCE)
   - Sends magic link and redirects user to /upgrade/checkout/?category=...
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
    if (!window.supabase || !window.supabase.createClient) {
      console.warn("[SL_AUTH] Supabase-js v2 not loaded (check script order).");
      setStatus("Auth library not loaded (script order).", true);
      return null;
    }

    const SUPABASE_URL =
      (window.SL_SUPABASE && window.SL_SUPABASE.url) || "https://ybnzjtuecirzajraddft.supabase.co";

    const SUPABASE_ANON_KEY =
      (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";

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

    window.SL_AUTH = window.SL_AUTH || {};
    window.SL_AUTH.sb = sb;

    sb.auth.onAuthStateChange((_event, session) => {
      window.SL_AUTH.session = session || null;
      dispatchAuthChanged(session || null);
    });

    // Force initial session fetch (completes detectSessionInUrl exchange)
    try {
      const { data } = await sb.auth.getSession();
      const session = (data && data.session) || null;
      window.SL_AUTH.session = session;
      dispatchAuthChanged(session);

      // Clean ugly trailing "&" if present
      try {
        const u = new URL(window.location.href);
        if (u.search.endsWith("&")) {
          u.search = u.search.slice(0, -1);
          history.replaceState({}, "", u.toString());
        }
      } catch {}

      // IMPORTANT: only force #checkout on /upgrade/ (NOT on /upgrade/checkout/)
      const path = window.location.pathname || "";
      const onUpgradePage = path === "/upgrade/" || path === "/upgrade/index.html";
      if (session && onUpgradePage) {
        const u = new URL(window.location.href);
        if (!u.hash || u.hash !== "#checkout") {
          u.hash = "checkout";
          history.replaceState({}, "", u.toString());
        }
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

        // Redirect MUST be the checkout PAGE without any hash
        const redirectTo =
          `${window.location.origin}/upgrade/checkout/?` +
          (cat ? `category=${encodeURIComponent(cat)}` : "");

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

