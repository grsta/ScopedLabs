/* /assets/auth.js
   ScopedLabs magic-link auth (Supabase v2) — Upgrade flow

   - Creates exactly ONE Supabase client
   - Uses implicit flow (no PKCE)
   - Restores session from magic-link URL (detectSessionInUrl: true)
   - Updates UI + dispatches "sl-auth-changed"
   - Scrolls to #checkout after successful session restore
*/

(() => {
  "use strict";

  // ---------- Config ----------
  // Preferred: provided by /assets/stripe-map.js as window.SL_SUPABASE = { url, anonKey }
  // Fallback: hardcode here if needed
  const SUPABASE_URL =
    (window.SL_SUPABASE && window.SL_SUPABASE.url) ||
    "https://ybnzjtuecirzajraddft.supabase.co";

  const SUPABASE_ANON_KEY =
    (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);

  const els = {
    email: $("#sl-email"),
    sendBtn: $("#sl-send-btn") || $("#sl-sendlink") || $("#sl-sendlink-btn"),
    hint: $("#sl-email-hint") || $("#sl-status"),
    signout: $("#sl-signout"),
    signedInAs: $("#sl-signed-in-as"),
  };

  function setHint(msg, isError = false) {
    if (!els.hint) return;
    els.hint.textContent = msg || "";
    els.hint.style.opacity = msg ? "1" : "";
    els.hint.style.color = isError ? "#ff6b6b" : "";
  }

  function setSignedInAs(email) {
    if (els.signedInAs) {
      els.signedInAs.textContent = email ? `Signed in as ${email}` : "";
      els.signedInAs.style.display = email ? "block" : "none";
    }
    if (els.signout) {
      els.signout.style.display = email ? "inline-flex" : "none";
    }
  }

  function dispatchAuthChanged(session) {
    try {
      window.dispatchEvent(
        new CustomEvent("sl-auth-changed", { detail: { session: session || null } })
      );
    } catch {}
  }

  function getCategoryFromUrlOrStorage() {
    try {
      const u = new URL(location.href);
      const qCat = (u.searchParams.get("category") || "").trim();
      if (qCat) return qCat;
    } catch {}
    try {
      const ls = (localStorage.getItem("sl_selected_category") || "").trim();
      if (ls) return ls;
    } catch {}
    return "";
  }

  function stripAuthHashFromUrlIfPresent() {
    // Supabase implicit flow returns tokens in URL hash. After session restore, clean it.
    const h = (location.hash || "").toLowerCase();
    if (!h) return;

    // Only strip if it looks like an auth callback hash
    const looksAuthy =
      h.includes("access_token=") ||
      h.includes("refresh_token=") ||
      h.includes("type=recovery") ||
      h.includes("type=magiclink") ||
      h.includes("token_type=");

    if (!looksAuthy) return;

    try {
      const u = new URL(location.href);
      u.hash = ""; // drop hash entirely
      history.replaceState({}, "", u.toString());
    } catch {}
  }

  function scrollToCheckoutSoon() {
    // Wait a tick for layout + app.js to render state, then scroll.
    setTimeout(() => {
      const target = document.getElementById("checkout");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }

  // ---------- Boot ----------
  const ready = (async () => {
    // Ensure Supabase v2 is loaded
    if (!window.supabase || !window.supabase.createClient) {
      console.warn("[SL_AUTH] Supabase-js not loaded (check script order).");
      setHint("Auth library not loaded.", true);
      return null;
    }

    if (!SUPABASE_URL || SUPABASE_URL.includes("PASTE_YOUR_SUPABASE_URL_HERE")) {
      console.warn("[SL_AUTH] Missing SUPABASE_URL.");
      setHint("Auth not configured (missing URL).", true);
      return null;
    }

    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("PASTE_YOUR_SUPABASE_ANON_KEY_HERE")) {
      console.warn("[SL_AUTH] Missing SUPABASE_ANON_KEY.");
      setHint("Auth not configured (missing key).", true);
      return null;
    }

    // Create client (implicit flow, not PKCE)
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    // Expose exactly as required
    window.SL_AUTH = { sb, ready: Promise.resolve(null) }; // overwrite below after restore
    window.SL_AUTH.sb = sb;

    // Keep UI synced with auth state
    sb.auth.onAuthStateChange((_event, session) => {
      const email = session && session.user ? session.user.email : "";
      setSignedInAs(email);
      dispatchAuthChanged(session || null);
    });

    // Restore any existing session (and/or exchange URL hash)
    try {
      const { data } = await sb.auth.getSession();
      const session = data ? data.session : null;

      const email = session && session.user ? session.user.email : "";
      setSignedInAs(email);
      dispatchAuthChanged(session || null);

      // If we arrived via magic link, clean hash + scroll to checkout
      stripAuthHashFromUrlIfPresent();

      // If URL contains "#checkout" or we just restored a session, help users land in the right spot
      if ((location.hash || "").includes("checkout")) {
        scrollToCheckoutSoon();
      } else if (session) {
        // Optional: if signed in and you're on /upgrade/?category=... we still nudge to checkout area
        // (keeps behavior consistent with your "go straight to checkout card" request)
        scrollToCheckoutSoon();
      }
    } catch (err) {
      console.warn("[SL_AUTH] getSession error:", err);
    }

    // Wire send magic link button
    if (els.sendBtn) {
      els.sendBtn.addEventListener("click", async () => {
        const email = (els.email && els.email.value ? els.email.value : "").trim();
        if (!email) {
          setHint("Enter your email first.", true);
          return;
        }

        const cat = getCategoryFromUrlOrStorage();
        // Redirect to the checkout page (or upgrade page) with the category preserved
        const redirectTo = `https://scopedlabs.com/upgrade/?${cat ? `category=${encodeURIComponent(cat)}&` : ""}#checkout`;

        try {
          els.sendBtn.disabled = true;
          setHint("Sending magic link…");

          const { error } = await sb.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectTo },
          });

          if (error) {
            console.warn("[SL_AUTH] signInWithOtp error:", error);
            setHint("Could not send link: " + (error.message || "Unknown error"), true);
            els.sendBtn.disabled = false;
            return;
          }

          setHint("Magic link sent. Check your inbox.");
          els.sendBtn.disabled = false;
        } catch (e) {
          console.warn("[SL_AUTH] send exception:", e);
          setHint("Could not send link (error).", true);
          els.sendBtn.disabled = false;
        }
      });
    }

    // Wire sign out
    if (els.signout) {
      els.signout.addEventListener("click", async () => {
        try {
          await sb.auth.signOut();
        } catch (e) {
          console.warn("[SL_AUTH] signOut error:", e);
        }
        setSignedInAs("");
        dispatchAuthChanged(null);

        try {
          // (optional) keep category, but you can clear it if you want:
          // localStorage.removeItem("sl_selected_category");
        } catch {}

        // Return to checkout section
        try {
          const u = new URL(location.href);
          u.hash = "#checkout";
          history.replaceState({}, "", u.toString());
          scrollToCheckoutSoon();
        } catch {}
      });
    }

    // Final: mark ready
    window.SL_AUTH.ready = Promise.resolve(sb);
    return sb;
  })();

  // Expose ready promise even if early returns happen
  if (!window.SL_AUTH) window.SL_AUTH = {};
  window.SL_AUTH.ready = ready;
})();
