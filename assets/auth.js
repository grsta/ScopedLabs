// ScopedLabs Auth + Checkout (Magic Link + Category Unlock)
// Client-side Supabase Auth + call to server endpoint to create Stripe Checkout session.
//
// Required on page (BEFORE this script):
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//
// This file expects the backend endpoint:
//   POST /api/create-checkout-session
// Body: { category: string, priceId: string }
// Auth: Authorization: Bearer <supabase_access_token>
// Response: { url: "https://checkout.stripe.com/..." }

(function () {
  // ---- Supabase public config (OK to ship) ----
  const SUPABASE_URL = "https://ybnzjtuecirzajraddft.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";

  // ---- Stripe price IDs per category ----
  // Add the rest as you create them in Stripe.
  const PRICE_MAP = {
    "access-control": "price_1SykEjJcSGIDDXHx2PvT5bG5",
    // "power": "price_XXXX",
    // "network": "price_XXXX",
    // "video-storage": "price_XXXX",
  };

  function notConfigured() {
    return !SUPABASE_URL || SUPABASE_URL.includes("REPLACE_WITH_") ||
           !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("REPLACE_WITH_");
  }

  function $(sel) { return document.querySelector(sel); }

  function categoryFromURL() {
    try {
      const url = new URL(window.location.href);
      return (url.searchParams.get("category") || "").toLowerCase().trim();
    } catch {
      return "";
    }
  }

  function setStatus(msg) {
    const el = $("#sl-status");
    if (el) el.textContent = msg || "";
  }

  function setEmailHint(msg) {
    const el = $("#sl-email-hint");
    if (el) el.textContent = msg || "";
  }

  async function loadSupabase() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase client library missing. Ensure supabase-js v2 script is loaded before auth.js");
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async function handleAuthCallback(sb) {
    // Supabase email links can return either:
    //  - PKCE:  ?code=...
    //  - hash:  #access_token=... (supabase-js handles this in most cases)
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) console.error("exchangeCodeForSession:", error);

        // Clean the URL so refresh doesn't re-run exchange
        url.searchParams.delete("code");
        url.searchParams.delete("type");
        url.searchParams.delete("redirect_to");
        window.history.replaceState({}, document.title, url.pathname + (url.search || "") + (url.hash || ""));
      }
    } catch (e) {
      console.warn("Auth callback handler skipped:", e);
    }
  }

  async function refreshUI(sb) {
    const { data: { session } } = await sb.auth.getSession();
    const email = session?.user?.email || "";
    const who = $("#sl-whoami");
    if (who) who.textContent = email ? `Signed in as ${email}` : "Not signed in";

    const signOutBtn = $("#sl-signout");
    if (signOutBtn) signOutBtn.style.display = email ? "" : "none";

    const loginCard = $("#sl-login-card");
    const checkoutCard = $("#sl-checkout-card");

    // When signed in: show checkout card, hide login card
    if (loginCard) loginCard.style.display = email ? "none" : "";
    if (checkoutCard) checkoutCard.style.display = email ? "" : "none";
  }

  async function sendMagicLink(sb) {
    const email = ($("#sl-email")?.value || "").trim();
    if (!email) {
      setEmailHint("Enter your email first.");
      return;
    }
    setEmailHint("");
    setStatus("Sending magic link...");

    // Send them back to the EXACT page they’re on (incl. query/hash).
    // This is why you were seeing localhost unreachable earlier:
    // you must have the site running at the same origin when you click the email.
    const emailRedirectTo = window.location.href;

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo }
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
    await refreshUI(sb);
  }

  async function startCheckout(sb) {
    const cat = categoryFromURL();
    if (!cat) {
      setStatus("Missing category. Choose a category above first.");
      return;
    }

    const priceId = PRICE_MAP[cat];
    if (!priceId) {
      setStatus(`No Stripe priceId configured for "${cat}". Add it to PRICE_MAP in assets/auth.js.`);
      return;
    }

    const { data: { session } } = await sb.auth.getSession();
    if (!session?.access_token) {
      setStatus("Please sign in first.");
      return;
    }

    setStatus("Creating checkout...");

    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        category: cat,
        priceId: priceId
      })
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("checkout error:", res.status, t);
      setStatus("Checkout error. Try again.");
      return;
    }

    const json = await res.json().catch(() => ({}));
    if (json?.url) {
      window.location.href = json.url;
      return;
    }

    setStatus("Checkout error. Try again.");
  }

  async function main() {
    if (notConfigured()) return;

    let sb;
    try {
      sb = await loadSupabase();
    } catch (e) {
      console.error(e);
      return;
    }

    // Handle email-link callbacks first
    await handleAuthCallback(sb);

    // Bind buttons
    const sendBtn = $("#sl-sendlink");
    if (sendBtn) sendBtn.addEventListener("click", () => sendMagicLink(sb));

    const signOutBtn = $("#sl-signout");
    if (signOutBtn) signOutBtn.addEventListener("click", () => signOut(sb));

    const checkoutBtn = $("#sl-checkout");
    if (checkoutBtn) checkoutBtn.addEventListener("click", () => startCheckout(sb));

    // Update UI now + on auth changes
    await refreshUI(sb);
    sb.auth.onAuthStateChange(async () => {
      await refreshUI(sb);
    });
  }

  // Kickoff
  main().catch(err => console.error("auth.js main error:", err));
})();
