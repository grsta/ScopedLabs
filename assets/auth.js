// /assets/auth.js
// ScopedLabs Upgrade Auth + Checkout glue
// - Supabase magic link sign-in (OTP email link)
// - Handles BOTH PKCE (?code=...) and hash (#access_token=...) callbacks
// - Works even if the page uses #checkout in the URL
// - Uses window.SCOPEDLABS_STRIPE as the single source of truth for priceIds

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(msg) {
    const el = $("sl-status");
    if (el) el.textContent = msg || "";
  }

  function setEmailHint(msg) {
    const el = $("sl-email-hint");
    if (el) el.textContent = msg || "";
  }

  function getStripeMap() {
    return (window.SCOPEDLABS_STRIPE && typeof window.SCOPEDLABS_STRIPE === "object")
      ? window.SCOPEDLABS_STRIPE
      : null;
  }

  function getCategoryFromURL() {
    const url = new URL(window.location.href);
    return (url.searchParams.get("category") || "").trim();
  }

  function getCategoryConfig(slug) {
    const map = getStripeMap();
    if (!map) return null;
    return map[slug] || null;
  }

  function pickPriceId(cfg) {
    if (!cfg || typeof cfg !== "object") return "";
    // support both casings to survive drift
    return (cfg.priceId || cfg.priceid || "").trim();
  }

  function safeOrigin() {
    return window.location.origin;
  }

  function buildRedirectTo() {
    // IMPORTANT:
    // Avoid using #checkout in the email redirect URL.
    // Supabase may return hash tokens; mixing hashes breaks session detection.
    // We just redirect back to /upgrade/ with the category in querystring.
    const slug = getCategoryFromURL();
    const base = safeOrigin() + "/upgrade/";
    return slug ? `${base}?category=${encodeURIComponent(slug)}` : base;
  }

  async function loadSupabase() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase client library missing. Ensure supabase-js v2 script is loaded before auth.js");
    }

    const supabaseUrl = (window.SUPABASE_URL || "").trim();
    const supabaseAnonKey = (window.SUPABASE_ANON_KEY || "").trim();

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY on window (set them in upgrade/index.html).");
    }

    // Let supabase-js try to detect session in URL automatically,
    // but we ALSO handle edge cases (double-hash with #checkout).
    return window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  async function handleAuthCallback(sb) {
    // Supabase magic links can return:
    // - PKCE: ?code=...
    // - implicit/hash: #access_token=...
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    // 1) PKCE flow (preferred)
    if (code) {
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error) console.error("exchangeCodeForSession:", error);

      // Clean URL so refresh doesn't re-run exchange
      url.searchParams.delete("code");
      url.searchParams.delete("type");
      url.searchParams.delete("redirect_to");
      window.history.replaceState({}, document.title, url.pathname + (url.search || "") + (url.hash || ""));
      return;
    }

    // 2) Hash token flow (edge cases: URL has #checkout#access_token=...)
    // If the hash contains access_token anywhere, ask supabase-js to parse+store it.
    const hash = (window.location.hash || "");
    if (hash.includes("access_token=")) {
      // supabase-js v2 supports getSessionFromUrl for implicit/hash flow
      if (sb.auth.getSessionFromUrl) {
        const { error } = await sb.auth.getSessionFromUrl({ storeSession: true });
        if (error) console.error("getSessionFromUrl:", error);
      } else {
        console.warn("sb.auth.getSessionFromUrl not available; relying on detectSessionInUrl.");
      }

      // Remove tokens from hash but preserve our UI anchor if present
      // If you use #checkout, keep it. Otherwise clear hash entirely.
      const keepCheckout = hash.includes("checkout");
      window.history.replaceState({}, document.title, url.pathname + (url.search || "") + (keepCheckout ? "#checkout" : ""));
    }
  }

  async function refreshUI(sb) {
    const { data } = await sb.auth.getSession();
    const email = data?.session?.user?.email || "";
    const who = $("sl-whoami");

    if (who) {
      who.textContent = email ? `Signed in as ${email}` : "Not signed in";
    }

    const signedInOnly = document.querySelectorAll("[data-auth='in']");
    const signedOutOnly = document.querySelectorAll("[data-auth='out']");

    signedInOnly.forEach(el => (el.style.display = email ? "" : "none"));
    signedOutOnly.forEach(el => (el.style.display = email ? "none" : ""));
  }

  async function init() {
    try {
      const sb = await loadSupabase();

      // Handle callback first (so session is stored ASAP)
      await handleAuthCallback(sb);

      // Wire buttons
      const sendBtn = $("sl-sendlink");
      const emailEl = $("sl-email");

      if (sendBtn && emailEl) {
        sendBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          setStatus("");

          const email = (emailEl.value || "").trim();
          if (!email) {
            setStatus("Enter an email.");
            return;
          }

          sendBtn.disabled = true;
          sendBtn.textContent = "Sending…";

          try {
            const redirectTo = buildRedirectTo();

            const { error } = await sb.auth.signInWithOtp({
              email,
              options: {
                emailRedirectTo: redirectTo
              }
            });

            if (error) {
              console.error("signInWithOtp:", error);
              setStatus(`Error: ${error.message || "Failed to send link"}`);
            } else {
              setStatus("Check your email for the sign-in link.");
            }
          } catch (err) {
            console.error(err);
            setStatus(`Error: ${err?.message || "Failed to fetch"}`);
          } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = "Send magic link";
          }
        });
      }

      const signOutBtn = $("sl-signout");
      if (signOutBtn) {
        signOutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await sb.auth.signOut();
          await refreshUI(sb);
          setStatus("Signed out.");
        });
      }

      // Stripe priceId sanity line (optional status)
      const slug = getCategoryFromURL();
      if (slug) {
        const cfg = getCategoryConfig(slug);
        const priceId = pickPriceId(cfg);
        if (!priceId) {
          setEmailHint(`No Stripe priceId configured for "${slug}". Add it in /assets/stripe-map.js.`);
        } else {
          setEmailHint("");
        }
      }

      // Initial UI + keep in sync
      await refreshUI(sb);
      sb.auth.onAuthStateChange(async () => {
        await refreshUI(sb);
      });

    } catch (err) {
      console.error(err);
      alert("Auth init failed. Check console.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

