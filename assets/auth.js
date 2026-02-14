document.addEventListener("DOMContentLoaded", () => {

  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error("Supabase env vars missing");
    return;
  }

  if (!window.supabase) {
    console.error("Supabase library not loaded");
    return;
  }

  const { createClient } = window.supabase;
  const supabase = createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  window.supabaseClient = supabase;

  const btn = document.getElementById("sl-sendlink");
  const emailInput = document.getElementById("sl-email");

  if (!btn || !emailInput) return;

  btn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email) return alert("Enter email");

    btn.disabled = true;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + "/upgrade/"
      }
    });

    btn.disabled = false;

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      alert("Magic link sent!");
    }
  });

});

