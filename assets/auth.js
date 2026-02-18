/* /assets/auth.js
   ScopedLabs Upgrade Auth (Magic Link) — stable wiring
   Exposes: window.SL_AUTH.sb
*/

(() => {
  // ====== CONFIG (keep YOUR existing values if already set) ======
  // If you already have SUPABASE_URL / SUPABASE_ANON_KEY in this file, keep them.
  // Otherwise, paste them here.
  const SUPABASE_URL =
    (window.SL_SUPABASE && window.SL_SUPABASE.url) ||
    "https://ybnzjtuecirzajraddft.supabase.co";

  const SUPABASE_ANON_KEY =
    (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";

  // ====== Helpers ======
  const $ = (id) => document.getElementById(id);
  const safeText = (el, text) => {
    if (!el) return;
    el.textContent = text || "";
  };

  const normalizeEmail = (v) => (v || "").trim().toLowerCase();

  // If you keep category gating in auth.js, this supports BOTH ids:
  // selected-category (new) and sl-category-pill (old)
  function getSelectedCategoryText() {
    const catEl = $("selected-category") || $("sl-category-pill");
    return (catEl?.textContent || "").trim();
  }

  // Redirect back to Upgrade after clicking the email link
  function getRedirectTo() {
    // Keep the current category in the redirect if present
    const url = new URL(window.location.href);
    const category = (url.searchParams.get("category") || "").trim();
    const base = `${window.location.origin}/upgrade/`;
    if (!category) return base;
    return `${base}?category=${encodeURIComponent(category)}#checkout`;
  }

  // ====== DOM handles ======
  const elEmail = () => $("sl-email");
  const elSendBtn = () => $("sl-send-btn");
  const elStatus = () => $("sl-status");
  const elSignedOutWrap = () => $("sl-login-card");     // login UI
  const elSignedInWrap = () => $("sl-checkout-card");   // checkout UI
  const elSignOutBtn = () => $("sl-signout");

  function showSignedOut() {
    const outWrap = elSignedOutWrap();
    const inWrap = elSignedInWrap();
    if (outWrap) outWrap.style.display = "";
    if (inWrap) inWrap.style.display = "none";
  }

  function showSignedIn(user) {
    const outWrap = elSignedOutWrap();
    const inWrap = elSignedInWrap();
    if (outWrap) outWrap.style.display = "none";
    if (inWrap) inWrap.style.display = "";
    safeText(elStatus(), user?.email ? `Signed in as ${user.email}` : "Signed in.");
    const signOut = elSignOutBtn();
    if (signOut) signOut.style.display = "";
  }

  function setStatus(msg, isError = false) {
    const st = elStatus();
    if (!st) return;
    st.textContent = msg || "";
    st.style.color = isError ? "#ffb3b3" : "";
  }

  async function init() {
    // Ensure Supabase is available
    if (!window.supabase || !window.supabase.createClient) {
      console.warn("[SL_AUTH] supabase-js not loaded (check script order).");
      return;
    }

    if (!SUPABASE_URL || SUPABASE_URL.includes("PASTE_")) {
  console.warn("[SL_AUTH] Missing SUPABASE_URL in /assets/auth.js");
  return;
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("PASTE_")) {
  console.warn("[SL_AUTH] Missing SUPABASE_ANON_KEY in /assets/auth.js");
  return;
}


    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Expose globally
    window.SL_AUTH = { sb, ready: true };

  console.log("[SL_AUTH] ready");


    // Handle PKCE code exchange if present
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        setStatus("Signing you in…");
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) {
          console.warn("[SL_AUTH] exchangeCodeForSession error:", error);
          setStatus("Sign-in link expired. Please request a new one.", true);
        } else {
          // Clean the code param out of URL (optional)
          url.searchParams.delete("code");
          url.searchParams.delete("type");
          url.searchParams.delete("error");
          url.searchParams.delete("error_description");
          history.replaceState({}, "", url.toString());
        }
      }
    } catch (e) {
      console.warn("[SL_AUTH] code exchange exception:", e);
    }

    // Initial session state
    try {
      const { data } = await sb.auth.getSession();
      const session = data?.session || null;
      if (session?.user) showSignedIn(session.user);
      else showSignedOut();
    } catch (e) {
      console.warn("[SL_AUTH] getSession exception:", e);
      showSignedOut();
    }

    // Listen for auth changes
    sb.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) showSignedIn(session.user);
      else showSignedOut();
    });

    // Bind Send magic link
    const sendBtn = elSendBtn();
    if (!sendBtn) {
      console.warn("[SL_AUTH] Could not find #sl-send-btn (check HTML id).");
    } else {
      sendBtn.addEventListener("click", async () => {
        // Category gate (optional — keeps your new behavior)
        const catText = getSelectedCategoryText().toLowerCase();
        if (!catText || catText === "none selected") {
          alert("Please choose a category before signing in.");
          return;
        }

        const email = normalizeEmail(elEmail()?.value);
        if (!email || !email.includes("@")) {
          setStatus("Enter a valid email address.", true);
          return;
        }

        setStatus("Sending magic link…");
        sendBtn.disabled = true;

        try {
          const { error } = await sb.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: getRedirectTo() }
          });

          if (error) {
            console.warn("[SL_AUTH] signInWithOtp error:", error);
            setStatus(`Could not send link: ${error.message || "Try again."}`, true);
          } else {
            setStatus("Magic link sent. Check your email.");
          }
        } catch (e) {
          console.warn("[SL_AUTH] signInWithOtp exception:", e);
          setStatus("Could not send link. Try again.", true);
        } finally {
          sendBtn.disabled = false;
        }
      });
    }

    // Bind Sign out
    const signOutBtn = elSignOutBtn();
    if (signOutBtn) {
      signOutBtn.addEventListener("click", async () => {
        setStatus("Signing out…");
        try {
          await sb.auth.signOut();
          setStatus("");
        } catch (e) {
          console.warn("[SL_AUTH] signOut exception:", e);
          setStatus("Could not sign out.", true);
        }
      });
    }
  }

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


