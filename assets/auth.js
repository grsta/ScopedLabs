/* ScopedLabs Auth (Supabase v2)
   - Single supabase client exposed as: window.SL_AUTH.sb
   - Handles magic link send + code exchange on callback
   - Works on both /upgrade/ and /upgrade/checkout/
*/
(() => {
  "use strict";

  const LOG_PREFIX = "[auth]";
  const $ = (id) => document.getElementById(id);

  // Back-compat (your stripe-map sets SL_SUPABASE_* on window)
  const SUPABASE_URL =
    window.SL_SUPABASE_URL || window.SUPABASE_URL || window.supabaseUrl;
  const SUPABASE_ANON_KEY =
    window.SL_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || window.supabaseAnonKey;

  function log(...args) { console.log(LOG_PREFIX, ...args); }
  function warn(...args) { console.warn(LOG_PREFIX, ...args); }
  function err(...args) { console.error(LOG_PREFIX, ...args); }

  function getCategoryFromUrl() {
    const u = new URL(window.location.href);
    return (u.searchParams.get("category") || "").trim() || null;
  }

  function isCheckoutPage() {
    return window.location.pathname.startsWith("/upgrade/checkout");
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text ?? "";
  }

  function setVisible(id, on) {
    const el = $(id);
    if (el) el.style.display = on ? "" : "none";
  }

  function setDisabled(id, disabled) {
    const el = $(id);
    if (el) el.disabled = !!disabled;
  }

  function cleanUrlAfterAuth() {
    // Remove Supabase auth params from URL after exchange so it doesn’t look like “same page reload confusion”
    const u = new URL(window.location.href);
    const changed =
      u.searchParams.has("code") ||
      u.searchParams.has("type") ||
      u.searchParams.has("redirect_to") ||
      u.hash.includes("access_token");

    // Supabase uses ?code=... for PKCE; it may also use hash fragments in some flows.
    u.searchParams.delete("code");
    u.searchParams.delete("type");
    u.searchParams.delete("redirect_to");

    // Keep your hash (like #checkout) if you want — but for checkout page we typically keep clean.
    if (isCheckoutPage()) u.hash = "";

    if (changed) {
      window.history.replaceState({}, document.title, u.toString());
    }
  }

  function bindLegacyIdsToNewIds() {
    // If older HTML exists somewhere, don’t break — just mirror values.
    // NOTE: DO NOT output anything to the DOM here (no stray text at top of page).
    try {
      if (!$("#sl-email") && $("#authEmail")) $("#authEmail").id = "sl-email";
      if (!$("#sl-sendlink") && $("#authSendLink")) $("#authSendLink").id = "sl-sendlink";
      if (!$("#sl-status") && $("#authStatus")) $("#authStatus").id = "sl-status";
    } catch (_) {}
  }

  async function initSupabase() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase JS v2 not loaded. Ensure supabase-js script loads BEFORE /assets/auth.js");
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase config. Ensure stripe-map.js sets window.SL_SUPABASE_URL and window.SL_SUPABASE_ANON_KEY.");
    }

    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    window.SL_AUTH = { sb };
    log("Supabase client ready");
    return sb;
  }

  async function exchangeIfNeeded(sb) {
    // With supabase-js v2 + detectSessionInUrl, getSession() will usually “just work”
    // BUT exchangeCodeForSession is still recommended for PKCE code flow.
    const u = new URL(window.location.href);
    const code = u.searchParams.get("code");
    if (!code) return;

    try {
      log("Exchanging code for session…");
      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      if (error) throw error;
      log("Session established");
      cleanUrlAfterAuth();
      return data?.session || null;
    } catch (e) {
      err("exchangeCodeForSession failed:", e);
      setText("sl-status", "Sign-in failed. Please request a new magic link.");
    }
  }

  function computeEmailRedirectTo(category) {
    // The whole point: after clicking email link, land on the NEW checkout page.
    const origin = window.location.origin;
    const base = `${origin}/upgrade/checkout/`;

    if (category) return `${base}?category=${encodeURIComponent(category)}`;
    return base;
  }

  async function refreshUi(sb) {
    const { data } = await sb.auth.getSession();
    const session = data?.session || null;

    const category = getCategoryFromUrl();

    // Elements present on upgrade page
    const loginCard = $("sl-login-card");
    const checkoutCard = $("sl-checkout-card");

    // Optional “whoami” line (where you want it displayed)
    const whoami = $("sl-whoami");

    if (!session) {
      if (whoami) whoami.textContent = "";
      if (loginCard) loginCard.style.display = "";
      if (checkoutCard) checkoutCard.style.display = "none";

      setText("sl-status", "");
      setDisabled("sl-checkout", true);

      // On checkout page, if not signed in, explain what to do
      if (isCheckoutPage()) {
        setText("sl-status", "Not signed in. Please return to Upgrade and request a magic link.");
      }
      return;
    }

    // Signed in
    if (whoami) whoami.textContent = `Signed in as ${session.user.email}`;
    setText("sl-status", "");

    // On /upgrade/: keep login visible until category chosen (your call).
    // On /upgrade/checkout/: hide login always.
    if (isCheckoutPage()) {
      if (loginCard) loginCard.style.display = "none";
      if (checkoutCard) checkoutCard.style.display = "";
    } else {
      // upgrade page
      if (loginCard) loginCard.style.display = ""; // still show, but user is signed in
      if (checkoutCard) checkoutCard.style.display = category ? "" : "none";
    }

    // Enable checkout only when category exists
    setDisabled("sl-checkout", !category);

    // Show signout button if present
    setVisible("sl-signout", true);
  }

  async function main() {
    bindLegacyIdsToNewIds();

    let sb;
    try {
      sb = await initSupabase();
    } catch (e) {
      err(e);
      setText("sl-status", "Auth is unavailable (Supabase not configured).");
      return;
    }

    // Exchange code if present
    await exchangeIfNeeded(sb);

    // Initial UI refresh
    await refreshUi(sb);

    // Listen for auth changes
    sb.auth.onAuthStateChange(async () => {
      await refreshUi(sb);
    });

    // Wire send link
    const btnSend = $("sl-sendlink");
    if (btnSend) {
      btnSend.addEventListener("click", async () => {
        const emailEl = $("sl-email");
        const email = (emailEl?.value || "").trim();

        if (!email) {
          setText("sl-email-hint", "Enter an email address first.");
          return;
        }

        const category = getCategoryFromUrl();
        const emailRedirectTo = computeEmailRedirectTo(category);

        setText("sl-email-hint", "Sending magic link…");

        try {
          const { data, error } = await sb.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo
            }
          });
          if (error) throw error;

          log("Magic link sent");
          setText("sl-email-hint", "Check your email for the sign-in link.");
        } catch (e) {
          err("signInWithOtp failed:", e);
          setText("sl-email-hint", `Could not send link: ${e?.message || e}`);
        }
      });
    }

    // Wire signout
    const btnOut = $("sl-signout");
    if (btnOut) {
      btnOut.addEventListener("click", async () => {
        try {
          await sb.auth.signOut();
          setText("sl-status", "Signed out.");
        } catch (e) {
          err("signOut failed:", e);
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();

