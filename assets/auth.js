/* /assets/auth.js
   Single source of truth for Supabase auth + magic link flow.
   Exposes: window.SL_AUTH.sb

   Supports NEW IDs:
     #sl-email, #sl-sendlink, #sl-email-hint, #sl-status
     #sl-signout (optional)

   Also supports legacy IDs if they exist.
*/
(() => {
  "use strict";

  // Prevent double-init (this is the #1 reason you get 2 emails / 2 links)
  if (window.__SL_AUTH_INIT_DONE) return;
  window.__SL_AUTH_INIT_DONE = true;

  const LOG_PREFIX = "[auth]";
  const log = (...args) => console.log(LOG_PREFIX, ...args);

  // ===== Helpers =====
  const qs = (sel) => document.querySelector(sel);

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text || "";
  };

  const setShow = (id, show) => {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? "" : "none";
  };

  const getEl = (preferredId, legacyId) =>
    document.getElementById(preferredId) || (legacyId ? document.getElementById(legacyId) : null);

  const getCategoryFromUrl = () => {
    try {
      const u = new URL(window.location.href);
      return (u.searchParams.get("category") || "").trim();
    } catch {
      return "";
    }
  };

  const buildCheckoutRedirect = () => {
    const origin = window.location.origin;
    const cat = getCategoryFromUrl();

    // Always point magic-link callback to checkout route
    if (cat) return `${origin}/upgrade/checkout/?category=${encodeURIComponent(cat)}`;
    return `${origin}/upgrade/checkout/`;
  };

  // ===== Supabase client =====
  if (!window.supabase || !window.supabase.createClient) {
    console.error("[auth] Supabase JS not loaded. Make sure supabase-js@2 is included before auth.js");
    return;
  }

  // These must be present in your file already (keep your real values)
  const SUPABASE_URL = window.SL_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.SL_SUPABASE_ANON_KEY || "";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[auth] Missing SUPABASE_URL / SUPABASE_ANON_KEY (SL_SUPABASE_URL / SL_SUPABASE_ANON_KEY).");
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  window.SL_AUTH = { sb };

  // ===== UI Wiring =====
  const emailInput = getEl("sl-email", "authEmail");
  const sendBtn = getEl("sl-sendlink", "sendMagicLinkBtn");
  const hintEl = getEl("sl-email-hint", "authHint");
  const statusEl = getEl("sl-status", "authStatus");
  const signoutBtn = getEl("sl-signout", "signOutBtn");

  // One-time bind guard per button element (extra safety)
  if (sendBtn && sendBtn.__slBound) {
    log("Send button already bound; skipping re-bind.");
  } else if (sendBtn) {
    sendBtn.__slBound = true;

    sendBtn.addEventListener("click", async () => {
      try {
        const email = (emailInput?.value || "").trim();
        if (!email) {
          setText(hintEl?.id || "sl-email-hint", "Enter an email address first.");
          return;
        }

        // Disable to prevent double send
        sendBtn.disabled = true;
        sendBtn.setAttribute("aria-busy", "true");

        const emailRedirectTo = buildCheckoutRedirect();
        log("Sending magic link. redirect_to =", emailRedirectTo);

        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo }
        });

        if (error) throw error;

        setText(hintEl?.id || "sl-email-hint", "Check your email for the sign-in link.");
        setText(statusEl?.id || "sl-status", "");
      } catch (e) {
        console.error(e);
        setText(statusEl?.id || "sl-status", e?.message || "Failed to send link.");
      } finally {
        // Re-enable
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.removeAttribute("aria-busy");
        }
      }
    });
  }

  if (signoutBtn && !signoutBtn.__slBound) {
    signoutBtn.__slBound = true;
    signoutBtn.addEventListener("click", async () => {
      await sb.auth.signOut();
      window.location.reload();
    });
  }

  // Session display helper
  const refreshAuthUI = async () => {
    const { data } = await sb.auth.getSession();
    const session = data?.session || null;

    if (session?.user?.email) {
      // You can choose where this shows; this just writes to sl-status if present.
      setText(statusEl?.id || "sl-status", `Signed in as ${session.user.email}`);
      if (signoutBtn) signoutBtn.style.display = "";
    } else {
      setText(statusEl?.id || "sl-status", "Not signed in");
      if (signoutBtn) signoutBtn.style.display = "none";
    }
  };

  sb.auth.onAuthStateChange((_event, _session) => {
    refreshAuthUI();
  });

  refreshAuthUI();
  log("Supabase client ready");
})();

