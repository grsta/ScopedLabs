/* /assets/auth.js
   ScopedLabs Supabase auth controller (magic link, implicit flow).

   Robust bindings:
   - Works with button ids: #sl-sendlink OR #sl-send-btn OR #sl-send
   - Email input: #sl-email OR first email input on page
   - Status: #sl-status OR #sl-email-hint OR #sl-auth-status
*/

(() => {
  "use strict";

  // ---- helpers ----
  const $ = (sel) => document.querySelector(sel);

  function safeText(el, msg) {
    if (!el) return;
    el.textContent = msg || "";
  }

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

  function getSignoutBtn() {
    return $("#sl-signout");
  }

  // ---- Supabase config ----
  const SUPABASE_URL =
    (window.SL_SUPABASE && window.SL_SUPABASE.url) || "";

  let SUPABASE_ANON_KEY =
    (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) || "";

  // If someone pasted "public key:xxxxx" (it happens), strip the prefix.
  if (SUPABASE_ANON_KEY && /public\s*key\s*:/i.test(SUPABASE_ANON_KEY)) {
    SUPABASE_ANON_KEY = SUPABASE_ANON_KEY.replace(/.*public\s*key\s*:\s*/i, "");
  }

  const ready = (async () => {
    // Ensure supabase-js v2 is loaded
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
      console.warn(
        "[SL_AUTH] Missing SUPABASE_ANON_KEY (window.SL_SUPABASE.anonKey)."
      );
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

    // expose globally
    window.SL_AUTH = { sb, ready: Promise.resolve(sb) };

    console.log("[SL_AUTH] ready");

    // If we landed here with token hash params, let supabase process them, then clean URL hash.
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) {
        // Remove access_token hash clutter after restore
        if (window.location.hash && window.location.hash.includes("access_token")) {
          const clean = new URL(window.location.href);
          clean.hash = ""; // we’ll re-add #checkout below if needed
          const cat = getCategory();
          if (cat) clean.searchParams.set("category", cat);
          // land at checkout section
          clean.hash = "checkout";
          history.replaceState({}, "", clean.toString());
        }
      }
    } catch (e) {
      // non-fatal
      console.warn("[SL_AUTH] getSession error:", e);
    }

    // Bind send magic link button
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
        // Always return user to the checkout card on upgrade page
        const redirectTo = `${window.location.origin}/upgrade/?${
          cat ? `category=${encodeURIComponent(cat)}&` : ""
        }r=ml#checkout`;

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
      console.warn("[SL_AUTH] Send button not found (expected #sl-sendlink or #sl-send-btn).");
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
        // keep them on checkout section
        const u = new URL(window.location.href);
        u.hash = "checkout";
        history.replaceState({}, "", u.toString());
        window.location.reload();
      });
    }

    return sb;
  })();

  // expose readiness even if config missing
  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.ready = ready;
})();
