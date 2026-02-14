// assets/auth.js
// Handles magic-link login + session restore

(function () {
  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", async () => {
    console.log("[auth] loaded");

    // Validate globals
    if (!window.supabase?.createClient) {
      alert("Supabase library not loaded");
      return;
    }
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      alert("Missing SUPABASE keys");
      return;
    }

    const sb = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );

    // -------- MAGIC LINK BUTTON ----------
    const sendBtn = $("sl-sendlink");
    const emailInput = $("sl-email");

    if (sendBtn && emailInput) {
      sendBtn.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        if (!email) {
          alert("Enter your email");
          return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = "Sending...";

        const { error } = await sb.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${location.origin}/upgrade/`
          }
        });

        sendBtn.disabled = false;
        sendBtn.textContent = "Send magic link";

        if (error) {
          console.error(error);
          alert("Failed to send link");
        } else {
          alert("Magic link sent! Check your email.");
        }
      });
    }

    // -------- HANDLE CALLBACK CODE --------
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        console.log("[auth] exchanging code...");
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) console.error(error);

        url.searchParams.delete("code");
        history.replaceState({}, document.title, url.pathname);
      }
    } catch (e) {
      console.warn("Callback skipped", e);
    }

    // -------- SESSION STATUS -------------
    const { data } = await sb.auth.getSession();
    const user = data?.session?.user;

    if (user) {
      console.log("[auth] signed in as", user.email);

      const who = $("sl-whoami");
      if (who) who.textContent = `Signed in as ${user.email}`;
    } else {
      console.log("[auth] not signed in");
    }
  });
})();
