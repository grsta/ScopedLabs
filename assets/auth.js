/* /assets/auth.js
   ScopedLabs Auth Controller (Magic Link)

   Guarantees:
   - Status text updates immediately on send
   - Status updates on session restore
   - "Signing you in…" clears once session exists
   - Exposes window.SL_AUTH = { sb, ready }
*/

(() => {
  "use strict";

  // -----------------------------
  // CONFIG (hard fallback allowed)
  // -----------------------------
  const SUPABASE_URL =
    (window.SL_SUPABASE && window.SL_SUPABASE.url) ||
    "https://ybnzjuecirzajradfft.supabase.co";

  const SUPABASE_ANON_KEY =
    (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdWVjaXJ6YWpyYWRmZnQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY4MjE2MjMxMCwiZXhwIjoxOTk3NzM4MzEwfQ.9Z2bVCRmfBdJ9yXcHgJx7_t6eVcTvc0alqxIbb9AqfI";

  const $ = (id) => document.getElementById(id);

  const els = {
    email: () => $("sl-email") || $("sl-email-input") || $("email"),
    send: () => $("sl-sendlink") || $("sl-send-btn"),
    status: () => $("sl-status") || $("sl-auth-status") || $("status"),
    signout: () => $("sl-signout"),
  };

  function setStatus(msg, kind = "info") {
    const el = els.status();
    if (!el) return;
    el.textContent = msg || "";
    el.dataset.kind = kind;
  }

  // -----------------------------
  // Load Supabase client
  // -----------------------------
  let sb = null;

  try {
    if (!window.supabase || !window.supabase.createClient) {
      console.error("[SL_AUTH] Supabase JS not loaded");
      setStatus("Auth system failed to load.", "error");
      return;
    }

    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  } catch (e) {
    console.error("[SL_AUTH] Client init error:", e);
    setStatus("Auth initialization failed.", "error");
    return;
  }

  // Expose early
  window.SL_AUTH = {
    sb,
    ready: null,
  };

  // -----------------------------
  // READY PROMISE
  // -----------------------------
  window.SL_AUTH.ready = new Promise(async (resolve) => {
    try {
      const { data } = await sb.auth.getSession();

      if (data && data.session) {
        setStatus(`Signed in as ${data.session.user.email}`);
      }

      resolve(true);
    } catch (e) {
      console.warn("[SL_AUTH] getSession failed:", e);
      resolve(false);
    }
  });

  // -----------------------------
  // Send Magic Link
  // -----------------------------
  const sendBtn = els.send();
  if (sendBtn) {
    sendBtn.addEventListener("click", async () => {
      const email = els.email()?.value?.trim();
      if (!email) {
        setStatus("Enter your email address.", "error");
        return;
      }

      setStatus("Sending magic link…");

      try {
        const category =
          new URL(location.href).searchParams.get("category") || "";

        const redirectTo =
          location.origin +
          "/upgrade/checkout/?category=" +
          encodeURIComponent(category);

        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });

        if (error) throw error;

        setStatus("Check your email for the login link.");
      } catch (e) {
        console.error(e);
        setStatus("Failed to send magic link.", "error");
      }
    });
  }

  // -----------------------------
  // Auth State Changes
  // -----------------------------
  try {
    sb.auth.onAuthStateChange((_event, session) => {
      if (session && session.user) {
        setStatus(`Signed in as ${session.user.email}`);
      } else {
        setStatus("");
      }
    });
  } catch {}

  // -----------------------------
  // Sign Out
  // -----------------------------
  const signoutBtn = els.signout();
  if (signoutBtn) {
    signoutBtn.addEventListener("click", async () => {
      try {
        await sb.auth.signOut();
      } catch {}
      setStatus("");
      location.href = "/upgrade/#checkout";
    });
  }
})();





