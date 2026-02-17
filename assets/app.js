/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Goals:
   - Keep "current category" in sync across URL + localStorage + UI
   - Work with BOTH old/new HTML IDs:
       #sl-selected-category OR #selected-category
       #sl-category-preview OR #selected-category-preview
   - Signed-in detection on /upgrade and /upgrade/checkout
   - Checkout button calls POST /api/create-checkout-session
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);

  function firstEl(...sels) {
    for (const s of sels) {
      const el = $(s);
      if (el) return el;
    }
    return null;
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = text == null ? "" : String(text);
  }

  function cap(s) {
    s = String(s || "");
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function setStatus(msg, isError = false) {
    const el = firstEl("#sl-status", "#sl-email-hint", "#sl-auth-status", "#sl-auth-hint");
    if (!el) return;
    el.style.color = isError ? "#ffb3b3" : "";
    el.textContent = msg || "";
  }

  function readCategory() {
    const u = new URL(location.href);
    const q = (u.searchParams.get("category") || "").trim();
    const ls = (localStorage.getItem("sl_selected_category") || "").trim();
    return q || ls || "";
  }

  function writeCategoryToUrl(cat, { keepHash = true, forceCheckoutHash = false } = {}) {
    const u = new URL(location.href);

    if (cat) u.searchParams.set("category", cat);
    else u.searchParams.delete("category");

    if (forceCheckoutHash) {
      u.hash = "checkout";
    } else if (!keepHash) {
      u.hash = "";
    }

    history.replaceState({}, "", u.toString());
  }

  function storeCategory(cat) {
    if (cat) localStorage.setItem("sl_selected_category", cat);
    else localStorage.removeItem("sl_selected_category");
  }

  function getMetaFor(cat) {
    // Try multiple likely globals from stripe-map.js
    const w = window;

    const candidates = [
      w.SL_STRIPE_MAP,
      w.SL_STRIPE,
      w.SL_CATEGORY_META,
      w.SL_CATEGORIES,
    ];

    for (const c of candidates) {
      if (!c) continue;
      if (c[cat]) return c[cat];
      if (c.categories && c.categories[cat]) return c.categories[cat];
      if (c.meta && c.meta[cat]) return c.meta[cat];
    }
    return null;
  }

  function renderPreview(cat) {
    const preview = firstEl("#sl-category-preview", "#selected-category-preview");
    if (!preview) return;

    if (!cat) {
      // Keep layout stable but clear content
      preview.innerHTML = "";
      return;
    }

    const meta = getMetaFor(cat) || {};
    const title = meta.title || cap(cat);
    const desc =
      meta.description ||
      meta.desc ||
      `Unlock Pro tools for ${cap(cat)} (current + future).`;

    const bullets = meta.bullets || meta.includes || [];

    const bulletHtml = Array.isArray(bullets) && bullets.length
      ? `<ul style="margin:.75rem 0 0 1.2rem;">
          ${bullets.slice(0, 6).map((b) => `<li>${String(b)}</li>`).join("")}
        </ul>`
      : "";

    preview.innerHTML = `
      <div class="pill" style="display:inline-flex; gap:.5rem; align-items:center;">
        🔒 <span>Pro — Category Unlock</span>
      </div>
      <div style="margin-top:.8rem; font-size:1.25rem; font-weight:800;">${title}</div>
      <div class="muted" style="margin-top:.6rem;">${desc}</div>
      ${bulletHtml}
      <div class="muted" style="margin-top:.8rem;">You'll also receive future Pro tools added to <em>${title}</em>.</div>
    `;
  }

  function syncCategoryUI(cat) {
    // Label / pill
    const label = firstEl("#sl-selected-category", "#selected-category");
    setText(label, cat || "None selected");

    // Header/title on checkout card
    const title = firstEl("#sl-checkout-title", "#sl-checkout-title-text");
    if (title) setText(title, cat ? `Unlock ${cat}` : "Unlock a category");

    // Preview block
    renderPreview(cat);

    // Enable/disable checkout button if it exists (checkout page)
    const checkoutBtn = firstEl("#sl-checkout");
    if (checkoutBtn) {
      // Only enable when signed in + category exists (session set elsewhere)
      // We'll update it again after auth sync.
      checkoutBtn.disabled = true;
    }
  }

  // ---------- auth ----------
  let sb = null;
  let currentSession = null;
  let currentCategory = "";

  async function waitForAuth() {
    if (!window.SL_AUTH || !window.SL_AUTH.ready) return null;
    try {
      const s = await window.SL_AUTH.ready;
      // auth.js sets ready to sb OR promise resolving sb
      // support both:
      if (s && s.auth) return s;
      if (window.SL_AUTH.sb) return window.SL_AUTH.sb;
      return null;
    } catch {
      return null;
    }
  }

  async function refreshSession() {
    if (!sb) return null;
    try {
      const { data } = await sb.auth.getSession();
      return (data && data.session) || null;
    } catch {
      return null;
    }
  }

  async function waitForSessionExchange(timeoutMs = 9000) {
    if (!sb) return null;

    const start = Date.now();

    // quick check first
    let s = await refreshSession();
    if (s) return s;

    return await new Promise((resolve) => {
      let done = false;
      let unsub = null;

      const finish = (val) => {
        if (done) return;
        done = true;
        try {
          if (unsub) unsub();
        } catch {}
        resolve(val || null);
      };

      const sub = sb.auth.onAuthStateChange((_event, session) => {
        if (session) finish(session);
      });

      try {
        unsub =
          sub &&
          sub.data &&
          sub.data.subscription &&
          sub.data.subscription.unsubscribe
            ? () => sub.data.subscription.unsubscribe()
            : null;
      } catch {
        unsub = null;
      }

      const tick = async () => {
        if (done) return;
        if (Date.now() - start >= timeoutMs) return finish(null);

        const now = await refreshSession();
        if (now) return finish(now);

        setTimeout(tick, 250);
      };

      tick();
    });
  }

  function applySessionToUI(session) {
    currentSession = session || null;

    const signedInAs = firstEl("#sl-signed-in-as");
    const signoutBtn = firstEl("#sl-signout");
    const checkoutBtn = firstEl("#sl-checkout");

    if (signedInAs) {
      const email = currentSession && currentSession.user ? currentSession.user.email : "";
      signedInAs.textContent = email ? `Signed in as ${email}` : "";
      signedInAs.style.display = email ? "block" : "none";
    }

    if (signoutBtn) {
      signoutBtn.style.display = currentSession ? "inline-flex" : "none";
    }

    if (checkoutBtn) {
      checkoutBtn.disabled = !(currentSession && currentCategory);
    }
  }

  // Listen for auth.js event too (helps when session appears after init)
  window.addEventListener("sl-auth-changed", (ev) => {
    const s = ev && ev.detail ? ev.detail.session : null;
    applySessionToUI(s);
  });

  // ---------- navigation / category ----------
  function goToCheckoutFor(cat) {
    if (!cat) return;
    storeCategory(cat);

    if (currentSession) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(cat);
    } else {
      location.href = "/upgrade/?category=" + encodeURIComponent(cat) + "#checkout";
    }
  }

  function bindCategoryButtons() {
    // data-category buttons
    document.querySelectorAll("[data-category]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const cat = (btn.getAttribute("data-category") || "").trim();
        if (cat) goToCheckoutFor(cat);
      });
    });

    // id pattern sl-unlock-<cat>
    document.querySelectorAll('[id^="sl-unlock-"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.id || "";
        const cat = id.replace(/^sl-unlock-/, "").trim();
        if (cat) goToCheckoutFor(cat);
      });
    });
  }

  function bindChangeCategoryButton() {
    const btn = firstEl("#sl-change-category", "#sl-choose-category");
    if (!btn) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // Return to category chooser
      if (IS_CHECKOUT_PAGE) {
        location.href = "/upgrade/?return=checkout#choose";
      } else {
        // just scroll to chooser on upgrade page
        const target = $("#choose");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        else location.hash = "choose";
      }
    });
  }

  // ---------- checkout ----------
  async function bindCheckoutButton() {
    if (!IS_CHECKOUT_PAGE) return;

    const btn = firstEl("#sl-checkout");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      if (!currentSession) return;
      if (!currentCategory) return;

      btn.disabled = true;
      setStatus("Opening Stripe Checkout…");

      try {
        const email = currentSession.user && currentSession.user.email ? currentSession.user.email : "";

        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: currentCategory, email }),
        });

        if (!res.ok) throw new Error("bad status " + res.status);

        const data = await res.json();
        if (!data || !data.url) throw new Error("missing url");

        location.href = data.url;
      } catch (e) {
        console.warn("[SL_APP] checkout error:", e);
        btn.disabled = false;
        setStatus("Failed to start checkout", true);
      }
    });
  }

  // ---------- init ----------
  async function init() {
    bindCategoryButtons();
    bindChangeCategoryButton();
    await bindCheckoutButton();

    // category first (so UI paints immediately)
    currentCategory = readCategory();
    if (currentCategory) {
      storeCategory(currentCategory);
      writeCategoryToUrl(currentCategory, {
        keepHash: true,
        forceCheckoutHash: !IS_CHECKOUT_PAGE && location.hash !== "#checkout" && location.hash !== "#checkout",
      });
    }

    syncCategoryUI(currentCategory);

    // auth second
    sb = await waitForAuth();
    if (!sb) return;

    // If we're on checkout and just returned from a magic link, wait for session to appear.
    const mightBeMagicLink =
      (location.hash && location.hash.includes("access_token")) ||
      (location.hash && location.hash.includes("refresh_token")) ||
      (new URL(location.href)).searchParams.get("r") === "ml";

    if (IS_CHECKOUT_PAGE && mightBeMagicLink) {
      setStatus("Signing you in…");
      const s = await waitForSessionExchange(9000);
      applySessionToUI(s);
      setStatus(""); // clear
    } else {
      const s = await refreshSession();
      applySessionToUI(s);
    }

    // If checkout page and no session, bounce to upgrade checkout block
    if (IS_CHECKOUT_PAGE && !currentSession) {
      const cat = currentCategory || localStorage.getItem("sl_selected_category") || "";
      const url = "/upgrade/?" + (cat ? "category=" + encodeURIComponent(cat) : "") + "#checkout";
      location.replace(url);
      return;
    }

    // If upgrade page has return=checkout and already signed in, selecting a category should go direct
    const u = new URL(location.href);
    const wantsReturn = u.searchParams.get("return") === "checkout";
    if (!IS_CHECKOUT_PAGE && wantsReturn && currentSession && currentCategory) {
      location.replace("/upgrade/checkout/?category=" + encodeURIComponent(currentCategory));
      return;
    }

    // Enable checkout button if present
    const checkoutBtn = firstEl("#sl-checkout");
    if (checkoutBtn) checkoutBtn.disabled = !(currentSession && currentCategory);

    // Keep UI synced when auth changes
    try {
      sb.auth.onAuthStateChange((_event, session) => {
        applySessionToUI(session || null);
      });
    } catch {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

