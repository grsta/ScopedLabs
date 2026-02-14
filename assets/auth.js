/* /assets/auth.js
   ScopedLabs Auth (Supabase v2) — single client, magic link, session restore, UI hooks
*/
(() => {
  // ---- helpers
  const byId = (id) => document.getElementById(id);
  const qs = (k) => new URLSearchParams(location.search).get(k);
  const setText = (id, txt) => { const el = byId(id); if (el) el.textContent = txt; };

  // ---- required globals injected by HTML <script> block
  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[auth] Missing SUPABASE_URL / SUPABASE_ANON_KEY on window.");
    return;
  }
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("[auth] Supabase CDN client not loaded. Did you include supabase-js v2 script tag?");
    return;
  }

  // ---- SINGLE supabase client for the whole page
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // We do our own code-exchange below, but leaving this on is harmless:
      detectSessionInUrl: true
    }
  });

  // Expose ONE canonical client for app.js to use
  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.sb = sb;

  // ---- preserve where user was (so magic-link return doesn’t dump them at top)
  function saveReturnState() {
    try {
      sessionStorage.setItem("sl_return_path", location.pathname + location.search + location.hash);
    } catch (_) {}
  }
  function restoreReturnState() {
    try {
      const p = sessionStorage.getItem("sl_return_path");
      if (p) sessionStorage.removeItem("sl_return_path");
      return p;
    } catch (_) {
      return null;
    }
  }

  // ---- keep UI in sync
  async function refreshUI() {
    const { data } = await sb.auth.getSession();
    const email = data?.session?.user?.email || null;

    // Status line
    setText("sl-auth-status", email ? `Signed in as ${email}` : "Not signed in");

    // Toggle login vs checkout blocks (if your HTML uses these ids)
    const loginCard = byId("sl-login-card");
    const checkoutCard = byId("sl-checkout-card");
    if (loginCard) loginCard.style.display = email ? "none" : "";
    if (checkoutCard) checkoutCard.style.display = email ? "" : "none";

    // Buttons
    const sendBtn = byId("sl-sendlink");
    if (sendBtn) sendBtn.style.display = email ? "none" : "";

    const acctBtn = byId("sl-account");
    if (acctBtn) acctBtn.style.display = email ? "" : "none";

    const signOutBtn = byId("sl-signout");
    if (signOutBtn) signOutBtn.style.display = email ? "" : "none";

    return email;
  }

  // ---- magic link send
  async function sendMagicLink(email) {
    const msg = byId("sl-msg");
    const setMsg = (t) => { if (msg) msg.textContent = t; };

    if (!email) {
      setMsg("Enter an email.");
      return;
    }

    // Keep category + checkout intent when they come back
    const u = new URL(location.href);
    // Ensure we always return to checkout section
    u.hash = "#checkout";
    u.searchParams.set("checkout", "1");

    saveReturnState();

    setMsg("Sending magic link…");

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: u.toString()
      }
    });

    if (error) {
      console.error("[auth] signInWithOtp error:", error);
      setMsg(`Error: ${error.message || "Failed to send link"}`);
      return;
    }

    setMsg("Magic link sent — check your email.");
  }

  // ---- sign out
  async function signOut() {
    try {
      await sb.auth.signOut();
    } finally {
      await refreshUI();
    }
  }

  // ---- Supabase PKCE return handler (critical)
  async function handleAuthCallbackIfPresent() {
    const url = new URL(location.href);

    // Supabase magic links typically return with ?code=... (PKCE)
    const code = url.searchParams.get("code");
    if (!code) return;

    try {
      // Exchange code for session
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[auth] exchangeCodeForSession error:", error);
      }
    } catch (e) {
      console.error("[auth] exchangeCodeForSession exception:", e);
    }

    // Clean URL (remove code param so refreshes don’t re-run callback)
    url.searchParams.delete("code");
    history.replaceState({}, "", url.pathname + url.search + url.hash);
  }

  // ---- wire UI
  function wireUI() {
    const sendBtn = byId("sl-sendlink");
    const emailEl = byId("sl-email");
    if (sendBtn && emailEl) {
      sendBtn.addEventListener("click", (e) => {
        e.preventDefault();
        sendMagicLink((emailEl.value || "").trim());
      });
    }

    const signOutBtn = byId("sl-signout");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        signOut();
      });
    }
  }

  // ---- boot
  (async () => {
    // Handle PKCE return first
    await handleAuthCallbackIfPresent();

    // Sync UI now + on changes
    await refreshUI();
    sb.auth.onAuthStateChange(async () => {
      await refreshUI();

      // If they came back from magic-link and we saved a return path, restore it
      const ret = restoreReturnState();
      if (ret && ret.includes("/upgrade/")) {
        // Don’t cause loops; just ensure checkout area is shown and scrolled
        // (app.js will also do the scroll)
      }
    });

    wireUI();
  })();
})();
