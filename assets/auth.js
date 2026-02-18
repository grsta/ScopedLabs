/* /assets/auth.js
   ScopedLabs Auth Controller (Supabase v2 UMD)

   Goals:
   - Create exactly ONE Supabase client
   - Expose: window.SL_AUTH = { sb, ready }
   - Use implicit flow for magic links (no PKCE mismatches)
   - Update a status line immediately:
       * "Sending magic link…"
       * "Check your email…"
       * "Signing you in…"
       * Clear "Signing you in…" once session exists
   - Broadcast auth changes for app.js:
       window.dispatchEvent(new CustomEvent("sl-auth", { detail: { session } }))
*/

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const pick = (...els) => els.find(Boolean) || null;

  // Prefer stripe-map injection if present:
  // window.SL_SUPABASE = { url, anonKey }
  const SUPABASE_URL =
    (window.SL_SUPABASE && window.SL_SUPABASE.url) ||
    "https://ybnzjtuecirzajraddft.supabase.co";

  const SUPABASE_ANON_KEY =
    (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM"; // keep your real key in your repo; you already have it

  function ensureStatusEl() {
    // Prefer existing status lines
    let st =
      pick(
        $("sl-auth-status"),
        $("sl-status"),
        $("status"),
        document.querySelector('[data-role="auth-status"]')
      ) || null;

    if (st) return st;

    // Otherwise, create one below the send button if possible
    const btn = pick($("sl-sendlink"), $("sl-send-btn"), $("sl-send"), $("sl-sendlink-btn"));
    if (!btn || !btn.parentElement) return null;

    st = document.createElement("div");
    st.id = "sl-auth-status";
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

    // Optional subtle styling (safe defaults)
    st.style.color =
      kind === "error" ? "var(--danger, #ff6b6b)" : "var(--text-muted, rgba(255,255,255,.8))";
  }

  function clearStatusIfSigningIn() {
    const st = ensureStatusEl();
    if (!st) return;
    if ((st.textContent || "").toLowerCase().includes("signing you in")) st.textContent = "";
  }

  function hasAuthHashOrError() {
    const h = (location.hash || "").toLowerCase();
    const q = location.search.toLowerCase();
    return (
      h.includes("access_token=") ||
      h.includes("refresh_token=") ||
      h.includes("type=magiclink") ||
      h.includes("error=") ||
      q.includes("error=") ||
      q.includes("error_code=")
    );
  }

  function readCategoryForRedirect() {
    try {
      const url = new URL(location.href);
      const cat = url.searchParams.get("category");
      if (cat) return cat;
    } catch {}
    try {
      const ls = localStorage.getItem("sl_selected_category");
      if (ls) return ls;
    } catch {}
    return "";
  }

  function emitAuth(session) {
    try {
      window.dispatchEvent(new CustomEvent("sl-auth", { detail: { session: session || null } }));
    } catch {}
  }

  function showSignedInUI(session) {
    const email = session && session.user && session.user.email ? session.user.email : "";
    const emailLabel = pick($("sl-user-email"), document.querySelector('[data-role="user-email"]'));
    if (emailLabel) emailLabel.textContent = email || "";

    // Toggle common elements if they exist
    const signout = pick($("sl-signout"), $("sl-sign-out"));
    if (signout) signout.style.display = "";

    // Don’t hide the whole card anymore; app.js handles button visibility too
    clearStatusIfSigningIn();
    if (email) setStatus(`Signed in as ${email}`, "info");
  }

  function showSignedOutUI() {
    const signout = pick($("sl-signout"), $("sl-sign-out"));
    if (signout) signout.style.display = "none";
  }

  function createClient() {
    // UMD build exposes: window.supabase.createClient
    if (!window.supabase || !window.supabase.createClient) return null;

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
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "REPLACE_ME_IF_NEEDED") {
      console.warn("[SL_AUTH] Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
      setStatus("Auth not configured (missing Supabase keys).", "error");
      return;
    }

    const sb = createClient();
    if (!sb) {
      console.warn("[SL_AUTH] supabase-js not loaded (check script order).");
      setStatus("Auth failed to load (Supabase script missing).", "error");
      return;
    }

    // Expose globally (exactly one client)
    let readyResolve;
    const ready = new Promise((r) => (readyResolve = r));
    window.SL_AUTH = { sb, ready };
    readyResolve(true);

    // If returning from magic link, show immediate feedback
    if (hasAuthHashOrError()) {
      const url = new URL(location.href);
      const err = url.searchParams.get("error_description") || url.searchParams.get("error");
      const errCode = url.searchParams.get("error_code");

      if (err || errCode) {
        setStatus(
          errCode === "otp_expired"
            ? "That sign-in link expired. Please request a new one."
            : `Sign-in failed. ${err || "Please try again."}`,
          "error"
        );
      } else {
        setStatus("Signing you in…", "info");
      }
    }

    // Wire "Send magic link"
    const emailInput = pick($("sl-email"), $("sl-email-input"), $("email"));
    const sendBtn = pick($("sl-sendlink"), $("sl-send-btn"), $("sl-send"), $("sl-sendlink-btn"));

    if (sendBtn && emailInput) {
      sendBtn.addEventListener("click", async () => {
        const email = (emailInput.value || "").trim();
        if (!email || !email.includes("@")) {
          setStatus("Enter a valid email address.", "error");
          emailInput.focus();
          return;
        }

        const cat = readCategoryForRedirect();
        const redirectTo = `https://scopedlabs.com/upgrade/checkout/?category=${encodeURIComponent(
          cat || "wireless"
        )}`;

        sendBtn.disabled = true;
        setStatus("Sending magic link…", "info");

        try {
          const { error } = await sb.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: redirectTo,
            },
          });

          if (error) {
            console.warn("[SL_AUTH] signInWithOtp error:", error);
            setStatus(`Could not send link: ${error.message || "Unknown error"}`, "error");
            sendBtn.disabled = false;
            return;
          }

          setStatus("Check your email for the sign-in link.", "info");

          // small cooldown to prevent double sends
          setTimeout(() => {
            sendBtn.disabled = false;
          }, 1500);
        } catch (e) {
          console.warn("[SL_AUTH] signInWithOtp failed:", e);
          setStatus("Could not send link. Please try again.", "error");
          sendBtn.disabled = false;
        }
      });
    }

    // Wire sign out (if present)
    const signout = pick($("sl-signout"), $("sl-sign-out"));
    if (signout) {
      signout.addEventListener("click", async () => {
        try {
          await sb.auth.signOut();
        } catch {}
        showSignedOutUI();
        setStatus("", "info");
        emitAuth(null);
      });
    }

    // Initial session check
    let session = null;
    try {
      const res = await sb.auth.getSession();
      session = res && res.data ? res.data.session : null;
    } catch {}

    if (session) {
      showSignedInUI(session);
      emitAuth(session);
    } else {
      showSignedOutUI();
      emitAuth(null);
    }

    // Live auth updates
    sb.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        showSignedInUI(newSession);
        emitAuth(newSession);
      } else {
        showSignedOutUI();
        emitAuth(null);
      }
    });
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();





