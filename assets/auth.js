/* /assets/auth.js
   ScopedLabs Supabase auth controller (magic link, implicit flow).

   Robust bindings:
   - Works with button ids: #sl-sendlink OR #sl-send-btn OR #sl-send
   - Email input: #sl-email OR first email input on page
   - Status targets: #sl-status, #sl-email-hint, #sl-auth-status, #sl-auth-hint
*/

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  function normalizeEmail(s) {
    return String(s || "")
      .trim()
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function getCategory() {
    const url = new URL(window.location.href);
    const q = (url.searchParams.get("category") || "").trim();
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

  function setStatus(msg, isError = false) {
    const targets = [
      $("#sl-status"),
      $("#sl-email-hint"),
      $("#sl-auth-status"),
      $("#sl-auth-hint"),
    ].filter(Boolean);

    if (!targets.length) return;

    for (const el of targets) {
      el.textContent = msg || "";
      el.style.color = isError ? "#ffb3b3" : "";
      // ensure it isn't hidden by accident
      if (el.style && el.style.display === "none") el.style.display = "";
      if (el.style && el.style.visibility === "hidden") el.style.visibility = "";
    }
  }

  // ---- Supabase config ----
  // Prefer window.SL_SUPABASE injected by stripe-map.js, but fall back to hardcoded values.
  const SUPABASE_URL =
    (window.SL_SUPABASE && window.SL_SUPABASE.url) ||
    "https://ybnzjtuecirzajraddft.supabase.co";

  let SUPABASE_ANON_KEY =
    (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";

  // If someone pasted "public key:xxxxx" strip prefix
  if (SUPABASE_ANON_KEY && /public\s*key\s*:/i.test(SUPABASE_ANON_KEY)) {
    SUPABASE_ANON_KEY = SUPABASE_ANON_KEY.replace(/.*public\s*key\s*:\s*/i, "");
  }

  const ready = (async () => {
    if (!window.supabase || !window.supabase.createClient) {
      console.warn("[SL_AUTH] supabase-js not loaded (check script order).");
      setStatus("Auth library not loaded.", true);
      return null;
    }

    if (!SUPABASE_URL) {
      console.warn("[SL_AUTH] Missing SUPABASE_URL (window.SL_SUPABASE.url).");
      setStatus("Auth not configured (missing URL).", true);
      return null;
    }

    if (!SUPABASE_ANON_KEY) {
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

    // expose globally (ready is a Promise, not boolean)
    window.SL_AUTH = window.SL_AUTH || {};
    window.SL_AUTH.sb = sb;
    window.SL_AUTH.ready = Promise.resolve(sb);

    console.log("[SL_AUTH] ready");

    // If the magic link landed here, supabase will restore session.
    // We don't do UI flips here; app.js handles UI state via getSession/onAuthStateChange.
    try {
      await sb.auth.getSession();
    } catch (e) {
      console.warn("[SL_AUTH] getSession error:", e);
    }

    // Bind send magic link
    const btn = getSendBtn();
    const emailEl = getEmailInput();

    if (btn) {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();

        const email = normalizeEmail(emailEl ? emailEl.value : "");
        if (!email || !email.includes("@")) {
          setStatus("Enter a valid email address.", true);
          if (emailEl) emailEl.focus();
          return;
        }

        const cat = getCategory();
        // Always return to upgrade checkout card
        const redirectTo = `${window.location.origin}/upgrade/?${
          cat ? `category=${encodeURIComponent(cat)}&` : ""
        }r=ml#checkout`;

        try {
          btn.disabled = true;
          setStatus("Sending magic link…");

          const { error } = await sb.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectTo },
          });

          if (error) {
            console.warn("[SL_AUTH] signInWithOtp error:", error);
            setStatus(
              "Could not send link: " + (error.message || "Unknown error"),
              true
            );
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
      console.warn(
        "[SL_AUTH] Send button not found (#sl-sendlink or #sl-send-btn)."
      );
    }

    return sb;
  })();

  // Ensure globals exist even if init fails
  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.ready = ready;
})();
