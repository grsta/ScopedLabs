/* /assets/auth.js
   Single source of truth for Supabase auth + magic link flow.
   Exposes: window.SL_AUTH.sb (Supabase client)

   Works with NEW IDs:
     #sl-email, #sl-sendlink, #sl-email-hint, #sl-status
     #sl-signout (optional)
   Also supports legacy IDs if they exist.
*/

(function () {
  "use strict";

  // --- Guardrails ---
  const SUPABASE_URL =
    window.SL_SUPABASE_URL || window.SUPABASE_URL || window.SCOPEDLABS_SUPABASE_URL;
  const SUPABASE_ANON_KEY =
    window.SL_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || window.SCOPEDLABS_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[auth] Missing Supabase URL/Anon key. Ensure stripe-map.js loads before auth.js");
    return;
  }

  if (!window.supabase || !window.supabase.createClient) {
    console.error("[auth] Supabase JS SDK not found. Ensure supabase-js v2 is loaded before auth.js");
    return;
  }

  // --- Supabase client (ONE instance) ---
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.sb = sb;

  // Back-compat aliases (safe)
  window.SUPABASE_URL = window.SUPABASE_URL || SUPABASE_URL;
  window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

  // --- Helpers ---
  const $ = (sel) => document.querySelector(sel);

  function getEl(...ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  function setText(el, txt) {
    if (!el) return;
    el.textContent = txt == null ? "" : String(txt);
  }

  function getSelectedCategoryFromUrlOrStorage() {
    const url = new URL(window.location.href);
    const c = url.searchParams.get("category");
    if (c) return c;
    try {
      return localStorage.getItem("sl_category") || "";
    } catch {
      return "";
    }
  }

  function setSelectedCategoryStorage(category) {
    try {
      if (category) localStorage.setItem("sl_category", category);
    } catch {}
  }

  // IMPORTANT: send users to the CHECKOUT PAGE after clicking email link
  function computeEmailRedirectTo() {
    const base = `${window.location.origin}`;
    const category = getSelectedCategoryFromUrlOrStorage();
    if (category) return `${base}/upgrade/checkout/?category=${encodeURIComponent(category)}`;
    return `${base}/upgrade/checkout/`;
  }

  // --- UI bindings (new + legacy) ---
  const elEmail = getEl("sl-email", "authEmail", "email", "loginEmail");
  const elSend = getEl("sl-sendlink", "sendMagicLink", "sendLink", "loginBtn");
  const elHint = getEl("sl-email-hint", "emailHint", "loginHint");
  const elStatus = getEl("sl-status", "statusText", "authStatus");
  const elSignout = getEl("sl-signout", "signOutBtn", "logoutBtn");

  function normalizeEmail(s) {
    return String(s || "").trim();
  }

  async function sendMagicLink() {
    const email = normalizeEmail(elEmail && elEmail.value);
    if (!email) {
      setText(elHint, "Enter an email address first.");
      return;
    }

    // Save category if present on this page, so redirect_to can include it next time
    const cat = getSelectedCategoryFromUrlOrStorage();
    if (cat) setSelectedCategoryStorage(cat);

    setText(elHint, "Sending magic link…");
    setText(elStatus, "");

    const emailRedirectTo = computeEmailRedirectTo();

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error("[auth] signInWithOtp error:", error);
      setText(elHint, `Could not send link: ${error.message || "unknown error"}`);
      return;
    }

    setText(elHint, "Check your email for the sign-in link.");
  }

  async function signOut() {
    await sb.auth.signOut();
  }

  // --- Session UI refresh hook ---
  function emitAuthState(session) {
    window.dispatchEvent(
      new CustomEvent("sl:auth", {
        detail: {
          session,
          user: session?.user || null,
          email: session?.user?.email || null,
        },
      })
    );
  }

  async function refreshSessionUI() {
    const { data } = await sb.auth.getSession();
    emitAuthState(data?.session || null);
  }

  // --- Wire events ---
  if (elSend) elSend.addEventListener("click", sendMagicLink);
  if (elSignout) elSignout.addEventListener("click", signOut);

  sb.auth.onAuthStateChange((_event, session) => {
    emitAuthState(session || null);
  });

  // initial
  refreshSessionUI();

  console.log("[auth] Supabase client ready");
})();

