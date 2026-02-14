/* /assets/auth.js
   ScopedLabs auth controller (Supabase magic-link)
   - Preserves ?category= and ?checkout=1 across magic-link login
   - Scrolls back to #checkout after login
   - Shows/hides login vs checkout UI
*/

(() => {
  const APP_TAG = "global-ui";
  window.SCOPEDLABS_UI = APP_TAG;

  function $(id) { return document.getElementById(id); }

  function getSearchParam(name) {
    try { return new URLSearchParams(location.search).get(name); }
    catch { return null; }
  }

  // Some providers append auth tokens into the hash. Also your page uses #checkout.
  // We may see hashes like: "#checkout#access_token=...&refresh_token=...&type=magiclink"
  function hashContainsCheckout() {
    const h = (location.hash || "").toLowerCase();
    return h.includes("checkout");
  }

  function buildReturnUrl({ keepCheckout = true } = {}) {
    const url = new URL(location.href);
    const category = getSearchParam("category");
    const checkout = keepCheckout ? (getSearchParam("checkout") || "1") : getSearchParam("checkout");

    // Preserve category + checkout in query
    url.searchParams.delete("category");
    url.searchParams.delete("checkout");
    if (category) url.searchParams.set("category", category);
    if (checkout) url.searchParams.set("checkout", checkout);

    // Use a simple hash anchor so we land back on the checkout card
    url.hash = keepCheckout ? "#checkout" : "";

    // IMPORTANT: Supabase will append tokens in the URL hash on return.
    // Returning a clean hash (#checkout) is fine; Supabase still appends its tokens when needed.
    return url.toString();
  }

  // After Supabase processes the magic-link, clean the URL so category stays readable and user doesn’t get dumped.
  function cleanUrlKeepState({ keepCheckoutHash = true } = {}) {
    const url = new URL(location.href);
    // Remove any supabase token fragments that might still be hanging around
    // Keep only "#checkout" if desired.
    url.hash = keepCheckoutHash ? "#checkout" : "";
    history.replaceState({}, document.title, url.toString());
  }

  function setText(id, txt) {
    const el = $(id);
    if (el) el.textContent = txt || "";
  }

  function show(el, on) {
    if (!el) return;
    el.style.display = on ? "" : "none";
  }

  function scrollToCheckout() {
    const target = $("checkout") || $("sl-checkout-card") || $("sl-checkout") || $("checkout-card");
    if (target && target.scrollIntoView) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    }
    return false;
  }

  function getCategory() {
    return getSearchParam("category") || "";
  }

  function shouldAutoCheckout() {
    return getSearchParam("checkout") === "1" || hashContainsCheckout();
  }

  function getSupabaseClient() {
    // Avoid multiple GoTrueClient instances (that warning you saw)
    if (window.__SCOPEDLABS_SUPABASE) return window.__SCOPEDLABS_SUPABASE;

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("Supabase client library not loaded (window.supabase.createClient missing).");
    }
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      throw new Error("Missing window.SUPABASE_URL / window.SUPABASE_ANON_KEY on this page.");
    }

    window.__SCOPEDLABS_SUPABASE = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
    return window.__SCOPEDLABS_SUPABASE;
  }

  function getUiRefs() {
    return {
      email: $("sl-email"),
      sendLink: $("sl-sendlink"),
      hint: $("sl-email-hint"),
      who: $("sl-who"),
      signOut: $("sl-signout"),
      checkoutBtn: $("sl-checkout"),
      checkoutCard: $("sl-checkout-card"),
      loginCard: $("sl-login-card"),
      status: $("sl-status"),
      accountBtn: $("sl-account"), // optional
    };
  }

  async function renderAuthState(sb, ui) {
    const { data } = await sb.auth.getSession();
    const session = data?.session || null;

    if (session?.user) {
      const email = session.user.email || "(signed in)";
      setText("sl-who", `Signed in as ${email}`);
      show(ui.loginCard, false);
      show(ui.checkoutCard, true);
      show(ui.signOut, true);
      show(ui.accountBtn, true);
      setText("sl-email-hint", "");
      if (shouldAutoCheckout()) {
        // Land them back where they expect
        setTimeout(() => scrollToCheckout(), 150);
      }
      return true;
    } else {
      setText("sl-who", "Not signed in");
      show(ui.loginCard, true);
      show(ui.checkoutCard, false);
      show(ui.signOut, false);
      show(ui.accountBtn, false);
      return false;
    }
  }

  async function sendMagicLink(sb, ui) {
    const email = (ui.email?.value || "").trim();
    if (!email) {
      setText("sl-email-hint", "Enter your email first.");
      return;
    }

    ui.sendLink.disabled = true;
    setText("sl-email-hint", "Sending magic link…");

    const emailRedirectTo = buildReturnUrl({ keepCheckout: true });

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });

    ui.sendLink.disabled = false;

    if (error) {
      setText("sl-email-hint", `Error: ${error.message || "Failed to send link"}`);
    } else {
      setText("sl-email-hint", "Magic link sent. Open the email and click the link.");
    }
  }

  async function signOut(sb) {
    await sb.auth.signOut();
  }

  // OPTIONAL: If you have an Account page/modal later, hook it here.
  function openAccount() {
    // placeholder for future
    alert("Account: coming soon.");
  }

  async function boot() {
    const ui = getUiRefs();

    let sb;
    try {
      sb = getSupabaseClient();
    } catch (e) {
      console.error(e);
      setText("sl-email-hint", `Auth init error: ${e.message || e}`);
      return;
    }

    // First paint
    await renderAuthState(sb, ui);

    // Listen for session changes (magic-link completion, signout, etc.)
    sb.auth.onAuthStateChange(async (event) => {
      // After magic-link, Supabase may leave token fragments; clean it.
      if (event === "SIGNED_IN") {
        // Keep #checkout if user came for checkout
        cleanUrlKeepState({ keepCheckoutHash: true });
      }
      await renderAuthState(sb, ui);
    });

    // Wire UI
    if (ui.sendLink) ui.sendLink.addEventListener("click", () => sendMagicLink(sb, ui));
    if (ui.signOut) ui.signOut.addEventListener("click", () => signOut(sb));
    if (ui.accountBtn) ui.accountBtn.addEventListener("click", openAccount);

    // If user landed here with checkout intent, scroll there (even before signed in)
    if (shouldAutoCheckout()) {
      setTimeout(() => scrollToCheckout(), 200);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
