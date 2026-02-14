/* /assets/auth.js
   ScopedLabs upgrade/auth controller
   - Magic-link sign in (Supabase)
   - Persisted sessions
   - Auto-scroll back to #checkout after magic link / reload
   - Checkout button -> POST /api/create-checkout-session (Cloudflare Worker)
   - Exposes Supabase client as: window.SCOPEDLABS_SB
   - Stripe mapping from /assets/stripe-map.js: window.SCOPEDLABS_STRIPE
*/

(function () {
  // ---------- Config injected by upgrade/index.html ----------
  const SUPABASE_URL = (window.SUPABASE_URL || "").trim();
  const SUPABASE_ANON_KEY = (window.SUPABASE_ANON_KEY || "").trim();

  // Cloudflare route: scopedlabs.com/api/* -> Worker
  const API_BASE = ""; // same-origin

  // ---------- DOM helpers ----------
  const $ = (sel) => document.querySelector(sel);

  function getCategory() {
    const u = new URL(window.location.href);
    return (u.searchParams.get("category") || "").trim();
  }

  function wantsCheckoutFocus() {
    const u = new URL(window.location.href);
    if (u.hash === "#checkout") return true;
    if (u.searchParams.get("checkout") === "1") return true;
    return false;
  }

  function focusCheckout() {
    const el = document.getElementById("checkout");
    if (!el) return;
    // small delay so layout settles
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function setMsg(text) {
    const el = $("#checkout-msg") || $("#auth-msg");
    if (el) el.textContent = text || "";
  }

  function setBusy(btn, busy) {
    if (!btn) return;
    btn.disabled = !!busy;
    btn.dataset._oldText = btn.dataset._oldText || btn.textContent;
    btn.textContent = busy ? "Working..." : btn.dataset._oldText;
  }

  function getPriceIdForCategory(category) {
    const map = window.SCOPEDLABS_STRIPE || {};
    const entry = map[category];
    return entry && entry.priceId ? entry.priceId : "";
  }

  function getUnlockKeyForCategory(category) {
    const map = window.SCOPEDLABS_STRIPE || {};
    const entry = map[category];
    return entry && entry.unlockKey ? entry.unlockKey : "";
  }

  // ---------- Supabase init ----------
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY on window.*");
    setMsg("Config error: Supabase keys missing.");
    return;
  }
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase JS not loaded. Ensure supabase-js script tag is before auth.js.");
    setMsg("Config error: Supabase client library missing.");
    return;
  }

  // Create ONE client and expose it globally
  const sb =
    window.SCOPEDLABS_SB ||
    window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

  window.SCOPEDLABS_SB = sb;

  // ---------- UI wiring ----------
  const emailInput = $("#sl-email");
  const sendLinkBtn = $("#sl-sendlink");
  const checkoutBtn = $("#sl-checkout");
  const accountBtn = $("#sl-account");
  const signOutBtn = $("#sl-signout");

  const loginRow = $("#sl-login-row");
  const authedRow = $("#sl-authed-row");
  const whoEl = $("#sl-who");

  async function refreshAuthUI() {
    const { data } = await sb.auth.getSession();
    const session = data?.session || null;

    if (session?.user) {
      if (loginRow) loginRow.style.display = "none";
      if (authedRow) authedRow.style.display = "";
      if (whoEl) whoEl.textContent = `Signed in as ${session.user.email || "verified user"}`;
      setMsg("");

      // If user just returned from magic link (or page has #checkout), keep them at checkout
      if (wantsCheckoutFocus()) focusCheckout();
    } else {
      if (loginRow) loginRow.style.display = "";
      if (authedRow) authedRow.style.display = "none";
      if (whoEl) whoEl.textContent = "Not signed in";
    }
  }

  // Keep UI live
  sb.auth.onAuthStateChange((_event, _session) => {
    refreshAuthUI().catch(() => {});
  });

  // ---------- Magic link ----------
  async function sendMagicLink() {
    const category = getCategory();
    const email = (emailInput?.value || "").trim();

    if (!email) {
      setMsg("Enter an email first.");
      return;
    }

    // Keep the user on the same category + checkout section when they click the email link
    const redirectUrl = new URL(`${window.location.origin}/upgrade/`);
    if (category) redirectUrl.searchParams.set("category", category);
    redirectUrl.searchParams.set("checkout", "1");
    redirectUrl.hash = "checkout";

    setMsg("");
    setBusy(sendLinkBtn, true);

    try {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectUrl.toString() },
      });

      if (error) throw error;
      setMsg("Magic link sent. Check your inbox.");
    } catch (e) {
      console.error(e);
      setMsg(`Error: ${e?.message || "Failed to send link"}`);
    } finally {
      setBusy(sendLinkBtn, false);
    }
  }

  // ---------- Checkout ----------
  async function startCheckout() {
    const category = getCategory();
    if (!category) {
      setMsg("Pick a category first.");
      return;
    }

    const priceId = getPriceIdForCategory(category);
    if (!priceId) {
      setMsg("Stripe mapping missing for this category (priceId).");
      return;
    }

    setMsg("");
    setBusy(checkoutBtn, true);

    try {
      // You MUST be authed before checkout (so we can attach purchase to user)
      const { data } = await sb.auth.getSession();
      const session = data?.session || null;

      if (!session?.access_token) {
        setMsg("Sign in first (magic link).");
        return;
      }

      const res = await fetch(`${API_BASE}/api/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Worker should verify token with Supabase (or pass it through)
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          category,
          priceId,
          unlockKey: getUnlockKeyForCategory(category), // optional, but useful
          // Where Stripe should return AFTER payment:
          returnUrl: `${window.location.origin}/tools/?unlocked=1&category=${encodeURIComponent(category)}`,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.detail || json?.error || `Checkout failed (${res.status})`);
      }

      if (!json.url) throw new Error("Worker did not return a checkout URL.");
      window.location.href = json.url;
    } catch (e) {
      console.error(e);
      setMsg(`Checkout error. Try again. (${e?.message || "unknown"})`);
    } finally {
      setBusy(checkoutBtn, false);
    }
  }

  // ---------- Account + Sign out ----------
  function goAccount() {
    // You can later wire /account/ page; for now we keep it simple:
    window.location.href = "/account/";
  }

  async function signOut() {
    setMsg("");
    try {
      await sb.auth.signOut();
      await refreshAuthUI();
      // Keep them on the same category page after signout
      const category = getCategory();
      const u = new URL(`${window.location.origin}/upgrade/`);
      if (category) u.searchParams.set("category", category);
      u.hash = "checkout";
      window.location.href = u.toString();
    } catch (e) {
      console.error(e);
      setMsg("Sign out failed.");
    }
  }

  // ---------- Bind buttons ----------
  if (sendLinkBtn) sendLinkBtn.addEventListener("click", (e) => { e.preventDefault(); sendMagicLink(); });
  if (checkoutBtn) checkoutBtn.addEventListener("click", (e) => { e.preventDefault(); startCheckout(); });
  if (accountBtn) accountBtn.addEventListener("click", (e) => { e.preventDefault(); goAccount(); });
  if (signOutBtn) signOutBtn.addEventListener("click", (e) => { e.preventDefault(); signOut(); });

  // Initial paint
  refreshAuthUI().catch(() => {});
  // If they land with #checkout, keep it focused even before auth resolves
  if (wantsCheckoutFocus()) focusCheckout();
})();
