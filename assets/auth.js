/* /assets/auth.js — FULL FILE OVERWRITE (Supabase v2)
   - Single Supabase client exposed as: window.SL_AUTH.sb
   - Magic link send redirects to /upgrade/checkout/
   - Stores/reads selected category via URL + localStorage
*/

(() => {
  "use strict";

  const LS_CAT = "sl_selected_category";

  function log(...a) { console.log("[auth]", ...a); }
  function warn(...a) { console.warn("[auth]", ...a); }
  function err(...a) { console.error("[auth]", ...a); }

  // ===== Helpers =====
  const $ = (sel) => document.querySelector(sel);

  function getCategoryFromURL() {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get("category") || "";
    } catch {
      return "";
    }
  }

  function setCategory(cat) {
    const c = (cat || "").trim();
    if (!c) return;
    localStorage.setItem(LS_CAT, c);
  }

  function getCategory() {
    return getCategoryFromURL() || localStorage.getItem(LS_CAT) || "";
  }

  function setText(el, txt) {
    if (el) el.textContent = txt || "";
  }

  function show(el, on) {
    if (!el) return;
    el.style.display = on ? "" : "none";
  }

  // ===== Read Supabase config from stripe-map.js or globals =====
  const SUPABASE_URL =
    window.SL_SUPABASE_URL ||
    window.SUPABASE_URL ||
    window.__SL_SUPABASE_URL;

  const SUPABASE_ANON_KEY =
    window.SL_SUPABASE_ANON_KEY ||
    window.SUPABASE_ANON_KEY ||
    window.__SL_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    err("Missing Supabase URL / ANON KEY. Ensure /assets/stripe-map.js defines SL_SUPABASE_URL + SL_SUPABASE_ANON_KEY.");
    return;
  }

  // ===== Create client =====
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });

  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.sb = sb;

  // Back-compat aliases (harmless)
  window.SL_SUPABASE_URL = SUPABASE_URL;
  window.SL_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

  // ===== New-ID elements (preferred) =====
  const elNew = {
    email: $("#sl-email"),
    send: $("#sl-sendlink"),
    hint: $("#sl-email-hint"),
    status: $("#sl-status"),
    signout: $("#sl-signout"),
  };

  // ===== Legacy-ID elements (if any old page still exists) =====
  const elOld = {
    email: $("#authEmail"),
    send: $("#sendLink"),
    hint: $("#authHint"),
    status: $("#authStatus"),
    signout: $("#signOutBtn"),
    signedInLine: $("#signedInLine"),
    signedInAs: $("#signedInAs"),
  };

  function uiSetStatus(msg) {
    setText(elNew.status, msg);
    setText(elOld.status, msg);
  }

  function uiSetHint(msg) {
    setText(elNew.hint, msg);
    setText(elOld.hint, msg);
  }

  function uiGetEmail() {
    return (elNew.email?.value || elOld.email?.value || "").trim();
  }

  function uiSetSignedIn(email) {
    // New pages: just show status line if you want
    if (email) {
      uiSetStatus(`Signed in as ${email}`);
      show(elNew.signout, true);
      show(elOld.signout, true);
    } else {
      show(elNew.signout, false);
      show(elOld.signout, false);
    }

    // Legacy explicit fields if present
    if (elOld.signedInLine) show(elOld.signedInLine, !!email);
    if (elOld.signedInAs) setText(elOld.signedInAs, email || "");
  }

  // ===== Magic link send =====
  async function sendMagicLink() {
    try {
      uiSetHint("");
      const email = uiGetEmail();
      if (!email) {
        uiSetHint("Enter an email address first.");
        return;
      }

      // Capture category (URL or stored)
      const cat = getCategory();
      if (cat) setCategory(cat);

      const redirectTo = `${window.location.origin}/upgrade/checkout/?category=${encodeURIComponent(cat || "")}`;

      uiSetStatus("Sending magic link…");

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      uiSetStatus("Check your email for the sign-in link.");
    } catch (e) {
      err(e);
      uiSetStatus("Could not send magic link. Check console for details.");
      uiSetHint(String(e?.message || e));
    }
  }

  async function refreshSessionUI() {
    const { data } = await sb.auth.getSession();
    const email = data?.session?.user?.email || "";
    uiSetSignedIn(email);
  }

  async function signOut() {
    await sb.auth.signOut();
    uiSetStatus("Signed out.");
    uiSetSignedIn("");
  }

  function wire() {
    elNew.send?.addEventListener("click", (e) => { e.preventDefault(); sendMagicLink(); });
    elOld.send?.addEventListener("click", (e) => { e.preventDefault(); sendMagicLink(); });

    elNew.signout?.addEventListener("click", (e) => { e.preventDefault(); signOut(); });
    elOld.signout?.addEventListener("click", (e) => { e.preventDefault(); signOut(); });

    sb.auth.onAuthStateChange((_event) => {
      refreshSessionUI();
    });
  }

  (async () => {
    wire();

    // If category exists in URL, store it (helps checkout page)
    const urlCat = getCategoryFromURL();
    if (urlCat) setCategory(urlCat);

    await refreshSessionUI();
    log("Supabase client ready");
  })();
})();

