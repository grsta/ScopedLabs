/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Responsibilities:
   - Track selected category (URL ?category= OR localStorage.sl_selected_category)
   - Keep UI labels in sync
   - Detect Supabase session (including magic-link restore) and flip UI
   - Checkout button wiring (if present on this page)
*/

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const els = {
    // selection UI
    selectedPill: $("#sl-selected-category") || $("#sl-selected-category-pill"),
    selectedText:
      $("#sl-selected-category-text") ||
      $("#sl-selected-category-label") ||
      $("#sl-selected-label"),

    // actions/buttons
    changeCategoryBtn:
      $("#sl-change-category") || $("#sl-change-category-btn"),
    checkoutBtn: $("#sl-checkout"),
    signoutBtn: $("#sl-signout"),
    accountLink: $("#sl-account") || document.querySelector('a[href="/account/"]'),

    // cards/containers
    checkoutCard: $("#sl-checkout-card"),
    // preview slot inside checkout card
    previewHost: $("#sl-selected-category-preview"),

    // status + signed-in label
    status: $("#sl-status") || $("#sl-email-hint") || $("#sl-auth-status"),
    signedInAs: $("#sl-signedin-as") || $("#sl-signedin-email"),
  };

  function setStatus(msg, isError = false) {
    if (!els.status) return;
    els.status.textContent = msg || "";
    els.status.style.color = isError ? "#ffb3b3" : "";
    if (els.status.style && els.status.style.display === "none")
      els.status.style.display = "";
  }

  function getUrl() {
    return new URL(window.location.href);
  }

  function getCategory() {
    const u = getUrl();
    const q = (u.searchParams.get("category") || "").trim();
    const ls = (localStorage.getItem("sl_selected_category") || "").trim();
    return q || ls || "";
  }

  function setCategory(cat, { pushUrl = true } = {}) {
    const c = String(cat || "").trim();
    if (c) localStorage.setItem("sl_selected_category", c);

    if (pushUrl) {
      const u = getUrl();
      if (c) u.searchParams.set("category", c);
      else u.searchParams.delete("category");
      // keep hash if present (e.g. #checkout)
      history.replaceState({}, "", u.toString());
    }

    renderCategoryUI(c);
  }

  function renderCategoryUI(cat) {
    const c = String(cat || "").trim();

    // If you have a pill element
    if (els.selectedPill) {
      els.selectedPill.textContent = c || "None selected";
    }

    // If you have a plain text label
    if (els.selectedText) {
      els.selectedText.textContent = c || "None selected";
    }

    // Some pages show "Selected category:" with a pill elsewhere; leave safe.

    // Enable checkout only if category + signed in (handled in renderAuthUI)
    renderPreviewCard(c);
  }

  function renderPreviewCard(cat) {
    if (!els.previewHost) return;

    const c = String(cat || "").trim();
    if (!c) {
      els.previewHost.innerHTML = "";
      return;
    }

    // app.js injects a simple preview card; styles come from your existing CSS/card classes
    const title = c.charAt(0).toUpperCase() + c.slice(1);

    els.previewHost.innerHTML = `
      <div class="card" style="background: rgba(0,0,0,.16);">
        <span class="pill pill-pro">🔒 Pro — Category Unlock</span>
        <h3 style="margin-top:.6rem;">${title}</h3>
        <p class="muted" style="margin-top:.4rem;">
          You are unlocking <strong>${title}</strong>.
        </p>
        <p class="muted" style="margin-top:.6rem;">
          You'll also receive future Pro tools added to <em>${title}</em>.
        </p>
      </div>
    `;
  }

  function scrollToCheckoutIfRequested() {
    // If URL has #checkout, or r=ml (magic-link return), scroll into view.
    const u = getUrl();
    const wants =
      (u.hash || "").toLowerCase() === "#checkout" || u.searchParams.get("r") === "ml";

    if (!wants) return;

    const sec = $("#checkout");
    if (sec && sec.scrollIntoView) {
      setTimeout(() => {
        try {
          sec.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch {
          sec.scrollIntoView(true);
        }
      }, 150);
    }
  }

  function setSignedInLabel(email) {
    if (!els.signedInAs) return;
    els.signedInAs.textContent = email ? `Signed in as ${email}` : "";
  }

  function show(el, on) {
    if (!el) return;
    el.style.display = on ? "" : "none";
  }

  function renderAuthUI(session, category) {
    const signedIn = !!(session && session.user && session.user.email);
    const email = signedIn ? session.user.email : "";

    // Signed-in label
    setSignedInLabel(email);

    // If you have a dedicated checkout card actions row, keep it visible
    // Show signout/account buttons only when signed in
    show(els.signoutBtn, signedIn);
    show(els.accountLink, signedIn);

    // Checkout button: only when signed in + category exists
    if (els.checkoutBtn) {
      els.checkoutBtn.disabled = !(signedIn && category);
      show(els.checkoutBtn, signedIn); // only show checkout when signed in
    }

    // If the page has a separate "checkoutCard" container that should appear once signed in:
    // (Your current UI shows the card even while signed out, so do NOT hide it)
    // We simply adjust status text.
    if (signedIn) {
      setStatus("Signed in.");
    } else {
      setStatus("");
    }
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }

  async function wireCheckoutButton(sb) {
    if (!els.checkoutBtn) return;

    els.checkoutBtn.addEventListener("click", async () => {
      const cat = getCategory();
      const { data } = await sb.auth.getSession();
      const session = data && data.session ? data.session : null;

      if (!session) {
        setStatus("Please sign in to continue.", true);
        return;
      }
      if (!cat) {
        setStatus("Choose a category to continue.", true);
        return;
      }

      try {
        els.checkoutBtn.disabled = true;
        setStatus("Opening Stripe Checkout…");

        const payload = { category: cat, email: session.user.email };
        const out = await postJson("/api/create-checkout-session", payload);

        if (!out || !out.url) throw new Error("No checkout URL returned.");
        window.location.href = out.url;
      } catch (e) {
        console.warn("[SL_APP] checkout error:", e);
        setStatus("Failed to start checkout", true);
        els.checkoutBtn.disabled = false;
      }
    });
  }

  function wireCategoryButtons() {
    // Bind any element with data-category
    const nodes = Array.from(document.querySelectorAll("[data-category]"));
    for (const el of nodes) {
      const cat = (el.getAttribute("data-category") || "").trim();
      if (!cat) continue;
      el.addEventListener("click", (e) => {
        // allow links/buttons; but always set category first
        setCategory(cat, { pushUrl: true });

        // If it's an <a>, let it navigate; if it doesn't navigate, we keep state.
        // If you have a "choose category" section, you may want to force #checkout:
        // (only do this on upgrade page)
      });
    }
  }

  async function init() {
    // Wait for auth.js to expose supabase client
    const auth = window.SL_AUTH;
    if (!auth || !auth.ready) {
      console.warn("[SL_APP] SL_AUTH not ready. Check script order.");
      return;
    }

    const sb = await auth.ready;
    if (!sb) {
      console.warn("[SL_APP] Supabase client not available.");
      return;
    }

    // Category initial render
    const cat = getCategory();
    renderCategoryUI(cat);

    // Always keep URL + localStorage aligned on load
    if (cat) setCategory(cat, { pushUrl: true });

    // Wire any category pickers
    wireCategoryButtons();

    // Initial session
    let currentSession = null;
    try {
      const { data } = await sb.auth.getSession();
      currentSession = data && data.session ? data.session : null;
    } catch (e) {
      console.warn("[SL_APP] getSession error:", e);
    }

    renderAuthUI(currentSession, getCategory());

    // Listen for auth changes (THIS is what fixes “clicked magic link but UI didn’t flip”)
    sb.auth.onAuthStateChange(async (_event, session) => {
      currentSession = session || null;

      // If we got a session after a magic link, keep them on checkout
      if (currentSession && currentSession.user) {
        const u = getUrl();
        if ((u.hash || "").toLowerCase() !== "#checkout") {
          u.hash = "checkout";
          history.replaceState({}, "", u.toString());
        }
      }

      renderAuthUI(currentSession, getCategory());
      scrollToCheckoutIfRequested();
    });

    // Wire checkout button (if present)
    await wireCheckoutButton(sb);

    // Ensure we land on checkout when returning from magic link
    scrollToCheckoutIfRequested();
  }

  // boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

