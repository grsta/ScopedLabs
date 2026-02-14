/* ScopedLabs Auth (Supabase v2) — FULL FILE OVERWRITE
   - Creates ONE Supabase client and exposes it as: window.SL_AUTH.sb
   - Handles magic-link sign-in
   - Exchanges auth code for session on return
   - Updates upgrade UI (signed in / signed out states)
*/

(() => {
  "use strict";

  // ====== CONFIG ======
  // These must exist on window (recommended set in /assets/stripe-map.js or a small config script)
  // window.SL_SUPABASE_URL
  // window.SL_SUPABASE_ANON_KEY
  const SUPABASE_URL = window.SL_SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SL_SUPABASE_ANON_KEY;

  // Optional: where to send users after login (defaults to current page)
  // You can override by setting window.SL_AUTH_REDIRECT to a full URL.
  const DEFAULT_REDIRECT = window.SL_AUTH_REDIRECT || window.location.href;

  // ====== SIMPLE HELPERS ======
  const $ = (sel) => document.querySelector(sel);

  function safeText(el, text) {
    if (!el) return;
    el.textContent = String(text ?? "");
  }

  function show(el, on) {
    if (!el) return;
    el.style.display = on ? "" : "none";
  }

  // Expected upgrade page elements (we handle missing gracefully):
  // #authEmail (input)
  // #authSendLink (button)
  // #authStatus (small status line)
  // #signedInRow (container row)
  // #signedInEmail (span)
  // #signOutBtn (button)
  // #checkoutBtn (button)  (app.js also touches this)
  const UI = {
    emailInput: () => $("#authEmail"),
    sendBtn: () => $("#authSendLink"),
    status: () => $("#authStatus"),
    signedInRow: () => $("#signedInRow"),
    signedInEmail: () => $("#signedInEmail"),
    signOutBtn: () => $("#signOutBtn"),
  };

  // ====== VALIDATION ======
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "[auth] Missing Supabase config. Set window.SL_SUPABASE_URL and window.SL_SUPABASE_ANON_KEY."
    );
  }
  if (!window.supabase || !window.supabase.createClient) {
    console.error("[auth] Supabase JS v2 not loaded. Ensure CDN script is included first.");
    return;
  }

  // ====== CREATE ONE CLIENT ======
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // we manually exchange code for session
    },
  });

  // Expose single client to app.js
  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.sb = sb;

  // ====== UI STATE ======
  function setStatus(msg, isError = false) {
    const el = UI.status();
    if (!el) return;
    el.textContent = msg || "";
    el.style.opacity = msg ? "1" : "0.85";
    el.style.color = isError ? "#ff6b6b" : ""; // subtle red on error
  }

  function setSignedInUI(email) {
    // Hide magic link controls if signed in
    const input = UI.emailInput();
    const sendBtn = UI.sendBtn();
    show(input, false);
    show(sendBtn, false);

    show(UI.signedInRow(), true);
    safeText(UI.signedInEmail(), email || "Signed in");
    setStatus("");
  }

  function setSignedOutUI() {
    const input = UI.emailInput();
    const sendBtn = UI.sendBtn();
    show(input, true);
    show(sendBtn, true);

    show(UI.signedInRow(), false);
    safeText(UI.signedInEmail(), "");
  }

  async function refreshAuthUI() {
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;

      const session = data?.session || null;
      const email = session?.user?.email || "";

      if (session && email) {
        setSignedInUI(email);
      } else {
        setSignedOutUI();
        setStatus("");
      }
    } catch (err) {
      console.warn("[auth] refreshAuthUI error:", err);
      setSignedOutUI();
      setStatus("Auth error. Refresh the page.", true);
    }
  }

  // ====== MAGIC LINK SEND ======
  async function sendMagicLink() {
    const input = UI.emailInput();
    const email = (input?.value || "").trim();

    if (!email || !email.includes("@")) {
      setStatus("Enter a valid email address.", true);
      return;
    }

    try {
      setStatus("Sending magic link…");
      UI.sendBtn()?.setAttribute("disabled", "disabled");

      // Build a redirect URL that preserves category & hash
      // Stripe / upgrade flow likes to keep #checkout
      // We use current URL unless overridden
      const redirectTo = DEFAULT_REDIRECT;

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      setStatus("Check your email for the sign-in link.");
    } catch (err) {
      console.warn("[auth] sendMagicLink error:", err);
      setStatus("Could not send link. Try again in a moment.", true);
    } finally {
      UI.sendBtn()?.removeAttribute("disabled");
    }
  }

  // ====== RETURN HANDLER: EXCHANGE CODE FOR SESSION ======
  async function handleAuthReturn() {
    try {
      const url = new URL(window.location.href);

      // Supabase magic link can return with:
      // ?code=... (PKCE flow)
      const code = url.searchParams.get("code");
      if (!code) return;

      setStatus("Signing you in…");

      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      if (error) throw error;

      // Clean the URL (remove ?code=... and any auth params) but preserve category + hash
      url.searchParams.delete("code");
      url.searchParams.delete("type");
      url.searchParams.delete("redirect_to");
      url.searchParams.delete("access_token");
      url.searchParams.delete("refresh_token");

      // Keep whatever else existed (like ?category=network)
      // Replace without reloading
      window.history.replaceState({}, document.title, url.toString());

      // Update UI immediately
      const email = data?.session?.user?.email || "";
      if (email) setSignedInUI(email);

      setStatus("");
    } catch (err) {
      console.warn("[auth] handleAuthReturn error:", err);
      setStatus("Sign-in failed. Please try the link again.", true);
    }
  }

  // ====== SIGN OUT ======
  async function signOut() {
    try {
      setStatus("Signing out…");
      await sb.auth.signOut();
      setSignedOutUI();
      setStatus("");
    } catch (err) {
      console.warn("[auth] signOut error:", err);
      setStatus("Could not sign out. Refresh and try again.", true);
    }
  }

  // ====== WIRE EVENTS ======
  function wireEvents() {
    UI.sendBtn()?.addEventListener("click", (e) => {
      e.preventDefault();
      sendMagicLink();
    });

    UI.emailInput()?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMagicLink();
      }
    });

    UI.signOutBtn()?.addEventListener("click", (e) => {
      e.preventDefault();
      signOut();
    });

    // Listen for auth changes (other tabs, refresh tokens, etc.)
    sb.auth.onAuthStateChange((_event, _session) => {
      refreshAuthUI();
    });
  }

  // ====== INIT ======
  (async () => {
    wireEvents();
    await handleAuthReturn();
    await refreshAuthUI();
  })();
})();
