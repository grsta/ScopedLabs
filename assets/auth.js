// assets/auth.js
// Single source of truth for Supabase auth + magic link

(function () {
  const SUPABASE_URL = window.SL_SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SL_SUPABASE_ANON_KEY;

  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.SL_AUTH = { sb };

  let sending = false;

  document.addEventListener("DOMContentLoaded", () => {
    const emailInput = document.getElementById("sl-email");
    const sendBtn = document.getElementById("sl-sendlink");
    const hint = document.getElementById("sl-email-hint");

    if (sendBtn) {
      sendBtn.onclick = async () => {
        if (sending) return;

        const email = emailInput?.value?.trim();
        if (!email) {
          hint.textContent = "Enter an email address first.";
          return;
        }

        sending = true;
        sendBtn.disabled = true;
        hint.textContent = "Sending magic link...";

        const category =
          new URLSearchParams(window.location.search).get("category") || "";

        const redirectTo =
          "https://scopedlabs.com/upgrade/checkout/?category=" +
          encodeURIComponent(category);

        const { error } = await sb.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
          },
        });

        if (error) {
          hint.textContent = error.message;
          sendBtn.disabled = false;
          sending = false;
          return;
        }

        hint.textContent = "Check your email for the sign-in link.";
      };
    }

    // Handle magic link return
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        console.log("Session active");
      }
    });
  });
})();

