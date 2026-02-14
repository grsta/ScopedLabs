/* ScopedLabs Auth (Supabase v2) — FULL FILE OVERWRITE
   - Waits for Supabase config to exist before initializing
   - Creates ONE Supabase client and exposes it as: window.SL_AUTH.sb
   - Magic link send uses the actual email input (no placeholders)
   - Uses a clean redirect URL to avoid allowlist/callback weirdness
*/

(() => {
  "use strict";

  const waitForConfig = () =>
    new Promise((resolve) => {
      const check = () => {
        if (
          window.SL_SUPABASE_URL &&
          window.SL_SUPABASE_ANON_KEY &&
          window.supabase?.createClient
        ) {
          return resolve();
        }
        setTimeout(check, 50);
      };
      check();
    });

  const $ = (s) => document.querySelector(s);

  const UI = {
    emailInput: () => $("#authEmail"),
    sendBtn: () => $("#authSendLink"),
    status: () => $("#authStatus"),
    signedInRow: () => $("#signedInRow"),
    signedInEmail: () => $("#signedInEmail"),
    signOutBtn: () => $("#signOutBtn"),
  };

  function show(el, on) {
    if (el) el.style.display = on ? "" : "none";
  }

  function setStatus(msg, err = false) {
    const el = UI.status();
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = err ? "#ff6b6b" : "";
  }

  function setSignedIn(email) {
    show(UI.emailInput(), false);
    show(UI.sendBtn(), false);
    show(UI.signedInRow(), true);
    if (UI.signedInEmail()) UI.signedInEmail().textContent = email || "";
    setStatus("");
  }

  function setSignedOut() {
    show(UI.emailInput(), true);
    show(UI.sendBtn(), true);
    show(UI.signedInRow(), false);
    if (UI.signedInEmail()) UI.signedInEmail().textContent = "";
  }

  let sb;

  async function init() {
    await waitForConfig();

    sb = window.supabase.createClient(
      window.SL_SUPABASE_URL,
      window.SL_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      }
    );

    window.SL_AUTH = { sb };

    sb.auth.onAuthStateChange(refreshUI);

    wire();
    await handleReturn();
    await refreshUI();
  }

  async function refreshUI() {
    const { data } = await sb.auth.getSession();
    const email = data?.session?.user?.email;
    if (email) setSignedIn(email);
    else setSignedOut();
  }

  function sanitizeEmail(raw) {
    return String(raw || "")
      .replace(/\u00A0/g, " ") // nbsp -> space
      .trim()
      .toLowerCase();
  }

  async function sendLink() {
    const raw = UI.emailInput()?.value || "";
    const email = sanitizeEmail(raw);

    if (!email || !email.includes("@")) {
      setStatus("Enter a valid email address", true);
      return;
    }

    setStatus("Sending magic link…");
    UI.sendBtn()?.setAttribute("disabled", "disabled");

    // IMPORTANT: clean redirect (avoid query/hash allowlist weirdness)
    const redirectTo = "https://scopedlabs.com/upgrade/";

    // Debug: proves what is actually being sent
    console.log("[auth] sending email:", JSON.stringify(email), "redirect:", redirectTo);

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    UI.sendBtn()?.removeAttribute("disabled");

    if (error) {
      console.error("[auth] OTP error:", error);
      setStatus(error.message || "Failed to send link", true);
      return;
    }

    setStatus("Check your email for the sign-in link.");
  }

  async function handleReturn() {
    const url = new URL(location.href);
    const code = url.searchParams.get("code");
    if (!code) return;

    setStatus("Signing you in…");

    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      url.searchParams.delete("code");
      url.searchParams.delete("type");
      url.searchParams.delete("redirect_to");
      history.replaceState({}, "", url.toString());
    } else {
      console.error("[auth] exchangeCodeForSession error:", error);
      setStatus("Sign-in failed. Try the link again.", true);
    }
  }

  async function signOut() {
    try {
      await sb.auth.signOut();
    } finally {
      setSignedOut();
      setStatus("");
    }
  }

  function wire() {
    UI.sendBtn()?.addEventListener("click", (e) => {
      e.preventDefault();
      sendLink();
    });

    UI.emailInput()?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendLink();
      }
    });

    UI.signOutBtn()?.addEventListener("click", (e) => {
      e.preventDefault();
      signOut();
    });
  }

  init();
})();
