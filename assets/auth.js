/* /assets/auth.js
   ScopedLabs upgrade/auth controller
   - Magic-link sign in (Supabase)
   - Persisted sessions (already working)
   - Auto-scroll to #checkout when signed-in (fixes “lands at top” confusion)
   - Shows/hides login vs checkout actions
   - Sign out button wired
   - Checkout button wired to Worker endpoint: POST /api/create-checkout-session
   - Stripe wiring comes from /assets/stripe-map.js (window.SCOPEDLABS_STRIPE)
*/

(function () {
  // -----------------------------
  // CONFIG (your real values are injected in upgrade/index.html)
  // -----------------------------
  const SUPABASE_URL = (window.SUPABASE_URL || "").trim();
  const SUPABASE_ANON_KEY = (window.SUPABASE_ANON_KEY || "").trim();

  // Same-origin worker routing (Cloudflare routes /api/* to your Worker)
  const API_BASE = ""; // keep empty

  // -----------------------------
  // Helpers
  // -----------------------------
  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);

  function setText(id, txt) {
    const el = byId(id);
    if (el) el.textContent = txt ?? "";
  }

  function setStatus(msg) {
    setText("sl-status", msg || "");
  }

  function setEmailHint(msg) {
    setText("sl-email-hint", msg || "");
  }

  function getCategoryFromURL() {
    try {
      const url = new URL(window.location.href);
      return (url.searchParams.get("category") || "").toLowerCase().trim();
    } catch {
      return "";
    }
  }

  function getStripeConfig(category) {
    const map = window.SCOPEDLABS_STRIPE || window.SCOPEDLABS_STRIPE_MAP || null;
    const cfg = (map && map[category]) ? map[category] : null;

    return {
      label: cfg?.label || category || "a category",
      // support any casing drift
      priceId: (cfg?.priceId || cfg?.priceid || cfg?.price || "").trim(),
      productId: (cfg?.productId || cfg?.productid || "").trim(),
      unlockKey: (cfg?.unlockKey || cfg?.unlockkey || "").trim(),
    };
  }

  function scrollToCheckout() {
    const el = byId("checkout");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function markJustLoggedIn() {
    try { sessionStorage.setItem("sl_just_logged_in", "1"); } catch {}
  }

  function consumeJustLoggedIn() {
    try {
      const v = sessionStorage.getItem("sl_just_logged_in");
      if (v) sessionStorage.removeItem("sl_just_logged_in");
      return !!v;
    } catch {
      return false;
    }
  }

  function notConfigured() {
    return !SUPABASE_URL || !SUPABASE_ANON_KEY;
  }

  async function loadSupabase() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase JS not loaded. Ensure supabase-js v2 script is included before auth.js");
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  // -----------------------------
  // Auth callback (magic link)
  // -----------------------------
  async function handleAuthCallback(sb) {
    // PKCE links return ?code=...
    // Hash links may return #access_token=... (supabase-js usually handles via detectSessionInUrl)
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) console.error("exchangeCodeForSession:", error);

        // Clean URL so refresh doesn't re-run exchange
        url.searchParams.delete("code");
        url.searchParams.delete("type");
        url.searchParams.delete("redirect_to");
        window.history.replaceState({}, document.title, url.pathname + (url.search || "") + (url.hash || ""));

        // Flag so we auto-scroll once UI shows signed-in state
        markJustLoggedIn();
      }

      // If the hash contains access_token, also flag just logged in
      if ((window.location.hash || "").includes("access_token=")) {
        markJustLoggedIn();
      }
    } catch (e) {
      console.warn("Auth callback handler skipped:", e);
    }
  }

  // -----------------------------
  // UI
  // -----------------------------
  async function refreshUI(sb) {
    const { data } = await sb.auth.getSession();
    const session = data?.session || null;

    const email = session?.user?.email || "";

    // whoami
    setText("sl-whoami", email ? `Signed in as ${email}` : "Not signed in");

    // toggle login vs checkout cards
    const loginCard = byId("sl-login-card");
    const checkoutCard = byId("sl-checkout-card");
    if (loginCard) loginCard.style.display = email ? "none" : "";
    if (checkoutCard) checkoutCard.style.display = email ? "" : "none";

    // signout button (it exists but is inline display:none in your HTML)
    const signOutBtn = byId("sl-signout");
    if (signOutBtn) signOutBtn.style.display = email ? "" : "none";

    // category UI
    const cat = getCategoryFromURL();
    const cfg = getStripeConfig(cat);

    setText("sl-category-label", cfg.label || "a category");
    setText("sl-category-pill", cat ? cfg.label : "None selected");

    // priceId sanity (so checkout doesn’t do nothing silently)
    if (cat && !cfg.priceId) {
      setEmailHint(`No Stripe priceId configured for "${cat}". Add it in /assets/stripe-map.js (priceId).`);
    } else {
      setEmailHint("");
    }

    // Auto-scroll behavior:
    // - If URL has #checkout OR we just logged in from magic link, scroll to checkout
    const shouldScroll =
      window.location.hash === "#checkout" ||
      consumeJustLoggedIn();

    if (email && shouldScroll) {
      // small delay to allow layout paint
      setTimeout(scrollToCheckout, 50);
    }
  }

  // -----------------------------
  // Actions
  // -----------------------------
  async function sendMagicLink(sb) {
    const email = (byId("sl-email")?.value || "").trim();
    if (!email) {
      setEmailHint("Enter your email first.");
      return;
    }

    setEmailHint("");
    setStatus("Sending magic link...");

    // IMPORTANT: do NOT include #checkout in redirectTo (avoid hash collisions)
    // Keep category query so user comes back to the right category.
    const url = new URL(window.location.href);
    const redirectTo = `${window.location.origin}${url.pathname}${url.search}`;

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      console.error("signInWithOtp:", error);
      setStatus("Could not send link. Try again.");
      return;
    }

    setStatus("Check your email for the sign-in link.");
  }

  async function signOut(sb) {
    await sb.auth.signOut();
    setStatus("Signed out.");
    // keep them on same page, but UI will flip to login
    await refreshUI(sb);
  }

  async function startCheckout(sb) {
    const category = getCategoryFromURL();
    if (!category) {
      setStatus("Missing category. Choose a category above first.");
      scrollToCheckout();
      return;
    }

    const cfg = getStripeConfig(category);
    if (!cfg.priceId) {
      setStatus(`No Stripe priceId configured for "${category}". Add it in /assets/stripe-map.js (priceId).`);
      return;
    }

    const { data } = await sb.auth.getSession();
    const session = data?.session || null;
    if (!session?.access_token) {
      setStatus("Please sign in first.");
      return;
    }

    setStatus("Creating checkout...");

    // Worker is expected to create a Stripe Checkout Session and return { url }
    const res = await fetch(`${API_BASE}/api/create-checkout-session`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        category,
        priceId: cfg.priceId,
        // Return URLs (safe defaults)
        successUrl: `${window.location.origin}/tools/?unlocked=1&category=${encodeURIComponent(category)}`,
        cancelUrl: `${window.location.origin}/upgrade/?category=${encodeURIComponent(category)}#checkout`,
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("checkout error:", res.status, t);
      setStatus("Checkout error. Try again.");
      return;
    }

    const out = await res.json().catch(() => ({}));
    if (!out?.url) {
      console.error("checkout response missing url:", out);
      setStatus("Checkout error. Try again.");
      return;
    }

    window.location.href = out.url;
  }

  // -----------------------------
  // Boot
  // -----------------------------
  async function boot() {
    if (notConfigured()) {
      console.warn("Missing SUPABASE_URL / SUPABASE_ANON_KEY on window (set them in /upgrade/index.html).");
      return;
    }

    let sb;
    try {
      sb = await loadSupabase();
    } catch (e) {
      console.error(e);
      return;
    }

    await handleAuthCallback(sb);

    // Bind buttons
    byId("sl-sendlink")?.addEventListener("click", () => sendMagicLink(sb));
    byId("sl-signout")?.addEventListener("click", () => signOut(sb));
    byId("sl-checkout")?.addEventListener("click", () => startCheckout(sb));

    // If user lands on #checkout even before auth resolves, we still scroll once ready
    if (window.location.hash === "#checkout") {
      markJustLoggedIn(); // reuse the scroll flag (scroll only when signed in)
    }

    await refreshUI(sb);

    sb.auth.onAuthStateChange(async () => {
      await refreshUI(sb);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    boot().catch((err) => console.error("auth.js boot error:", err));
  });
})();
