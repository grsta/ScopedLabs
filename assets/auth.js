/* ScopedLabs Auth (Supabase v2) — FULL FILE OVERWRITE
   - Creates ONE Supabase client and exposes it as: window.SL_AUTH.sb
   - Handles magic-link sign-in
   - Exchanges auth code for session on return
   - Accepts BOTH config naming schemes:
       SL_SUPABASE_URL / SL_SUPABASE_ANON_KEY  (preferred)
       SUPABASE_URL / SUPABASE_ANON_KEY        (legacy)
*/

(() => {
  "use strict";

  // ====== CONFIG (accept both names) ======
  const SUPABASE_URL =
    window.SL_SUPABASE_URL ||
    window.SUPABASE_URL ||
    window.SUPABASE_URL; // (redundant safe)

  const SUPABASE_ANON_KEY =
    window.SL_SUPABASE_ANON_KEY ||
    window.SUPABASE_ANON_KEY ||
    window.SUPABASE_ANON_KEY;

  const DEFAULT_REDIRECT = window.SL_AUTH_REDIRECT || window.location.href;

  // ====== HELPERS ======
  const $ = (sel) => document.querySelector(sel);

  function safeText(el, text) {
    if (!el) return;
    el.textContent = String(text ?? "");
  }

  function show(el, on) {
    if (!el) return;
    el.style.display = on ? "" : "none";
  }

  const UI = {
    emailInput: () => $("#authEmail"),
    sendBtn: () => $("#authSendLink"),
    status: () => $("#authStatus"),
    signedInRow: () => $("#signedInRow"),
    signedInEmail: () => $("#signedInEmail"),
    signOutBtn: () => $("#signOutBtn"),
  };

  function setStatus(msg, isError = false) {
    const el = UI.status();
    if (!el) return;
    el.textContent = msg || "";
    el.style.opacity = msg ? "1" : "0.85";
    el.style.color = isError ? "#ff6b6b" : "";
  }

  function setSignedInUI(email) {
    show(UI.emailInput(), false);
    show(UI.sendBtn(), false);
    show(UI.signedInRow(), true);
    safeText(UI.signedInEmail(), email || "Signed in");
    setStatus("");
  }

  function setSignedOutUI() {
    show(UI.emailInput(), true);
    show(UI.sendBtn(), true);
    show(UI.signedInRow(), false);
    safeText(UI.signedInEmail(), "");
  }

  // ====== VALIDATION ======
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "[auth] Missing Supabase config. Set window.SL_SUPABASE_URL / window.SL_SUPABASE_ANON_KEY (preferred) or window.SUPABASE_URL / window.SUPABASE_ANON_KEY (legacy).",
      { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY }
    );
  }

  if (!window.supabase || !window.supabase.createClient) {
    console.error("[auth] Supabase JS v2 not loaded. Ensure CDN script is included first.");
    return;
  }

  // ====== CREATE ONE CLIENT ======
  let sb;
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  } catch (e) {
    console.error("[auth] Failed to create Supabase client:", e);
    return;
  }

  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.sb = sb;

  async function refreshAuthUI() {
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;

      const session = data?.session || null;
      const email = session?.user?.email || "";

      if (session && email) setSignedInUI(email);
      else {
        setSignedOutUI();
        setStatus("");
      }
    } catch (err) {
      console.warn("[auth] refreshAuthUI error:", err);
      setSignedOutUI();
      setStatus("Auth error. Refresh the page.", true);
    }
  }

  async function sendMagicLink() {
    const email = (UI.emailInput()?.value || "").trim();
    if (!email || !email.includes("@")) {
      setStatus("Enter a valid email address.", true);
      return;
    }

    try {
      setStatus("Sending magic link…");
      UI.sendBtn()?.setAttribute("disabled", "disabled");

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: DEFAULT_REDIRECT },
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

  async function handleAuthReturn() {
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (!code) return;

      setStatus("Signing you in…");

      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      if (error) throw error;

      url.searchParams.delete("code");
      url.searchParams.delete("type");
      url.searchParams.delete("redirect_to");
      url.searchParams.delete("access_token");
      url.searchParams.delete("refresh_token");

      window.history.replaceState({}, document.title, url.toString());

      const email = data?.session?.user?.email || "";
      if (email) setSignedInUI(email);

      setStatus("");
    } catch (err) {
      console.warn("[auth] handleAuthReturn error:", err);
      setStatus("Sign-in failed. Please try the link again.", true);
    }
  }

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

    sb.auth.onAuthStateChange(() => refreshAuthUI());
  }

  (async () => {
    wireEvents();
    await handleAuthReturn();
    await refreshAuthUI();
  })();
})();
