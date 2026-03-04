/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller (token-hardened).

   Key fix:
   - /api/create-checkout-session MUST include:
       Authorization: Bearer <supabase access_token>
   Otherwise Worker returns 401 and "Continue to checkout" looks broken.

   Assumes:
   - /assets/auth.js loads BEFORE this file
   - auth.js exposes: window.SL_AUTH = { sb, ready }
*/

(() => {
  "use strict";

  const PATH = location.pathname || "/";
  const IS_CHECKOUT_PAGE = PATH.startsWith("/upgrade/checkout");
  const IS_UPGRADE_PAGE = PATH.startsWith("/upgrade") && !IS_CHECKOUT_PAGE;

  const LS_CAT = "sl_selected_category";

  // ------------------------- utilities -------------------------

  function $(id) {
    return document.getElementById(id);
  }

  function qs() {
    return new URLSearchParams(location.search || "");
  }

  function getParam(name) {
    return qs().get(name);
  }

  function setParam(name, value) {
    const u = new URL(location.href);
    if (value == null || value === "") u.searchParams.delete(name);
    else u.searchParams.set(name, value);
    history.replaceState(null, "", u.toString());
  }

  function normalizeCat(v) {
    if (!v) return "";
    const s = String(v).trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(s)) return "";
    return s;
  }

  function getStoredCat() {
    try {
      return normalizeCat(localStorage.getItem(LS_CAT) || "");
    } catch {
      return "";
    }
  }

  function setStoredCat(cat) {
    try {
      if (!cat) localStorage.removeItem(LS_CAT);
      else localStorage.setItem(LS_CAT, cat);
    } catch {}
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = text == null ? "" : String(text);
  }

  function setVisible(el, on) {
    if (!el) return;
    el.style.display = on ? "" : "none";
  }

  function disable(el, on) {
    if (!el) return;
    el.disabled = !!on;
    if (!!on) el.setAttribute("aria-disabled", "true");
    else el.removeAttribute("aria-disabled");
  }

  function safeScrollToHash() {
    const h = location.hash || "";
    if (!h || h.length < 2) return;
    const el = document.querySelector(h);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ------------------------- auth helpers -------------------------

  async function waitForAuthReady(timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (window.SL_AUTH && window.SL_AUTH.sb && window.SL_AUTH.ready) return true;
      await sleep(50);
    }
    return false;
  }

  async function getSession() {
    try {
      const sb = window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null;
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      return data && data.session ? data.session : null;
    } catch {
      return null;
    }
  }

  // ------------------------- UI bindings -------------------------

  function collectEls() {
    return {
      // shared
      status: $("sl-status"),
      selectedLabel: $("sl-selected-category"), // optional label span
      selectedPill: $("sl-selected-pill"),      // optional pill
      // upgrade page
      sendLinkBtn: $("sl-sendlink"),
      emailInput: $("sl-email"),
      accountBtn: $("sl-account"),
      signoutBtn: $("sl-signout"),
      // upgrade and/or checkout page
      checkoutBtn: $("sl-checkout"),            // "Continue to checkout" or "Checkout"
      changeCatBtn: $("sl-change-category"),    // optional
      // any category buttons
      categoryBtns: Array.from(document.querySelectorAll("[data-category]")),
    };
  }

  function readCategory() {
    const fromUrl = normalizeCat(getParam("category"));
    if (fromUrl) return fromUrl;

    const fromLs = getStoredCat();
    if (fromLs) return fromLs;

    return "";
  }

  function writeCategory(cat) {
    cat = normalizeCat(cat);
    if (!cat) return;
    setStoredCat(cat);
    setParam("category", cat);
  }

  function paintCategory(els, cat) {
    const label = cat || "None selected";
    if (els.selectedLabel) setText(els.selectedLabel, label);
    if (els.selectedPill) setText(els.selectedPill, label);

    // If you have a visible "selected category" pill elsewhere:
    const any = document.querySelectorAll("[data-bind='selected-category']");
    if (any && any.length) any.forEach((n) => (n.textContent = label));
  }

  function paintSignedInState(els, session) {
    const signedIn = !!(session && session.user);

    // If your HTML includes a line like "Signed in as <span id=sl-user-email>"
    const emailEl = $("sl-user-email");
    if (emailEl) setText(emailEl, signedIn ? (session.user.email || "") : "");

    // Hide email input when signed in (common requirement)
    if (els.emailInput) setVisible(els.emailInput.closest("label") || els.emailInput, !signedIn);

    // If you have a login block wrapper, you can optionally hide it when signed in:
    const loginBlock = $("sl-login-block"); // optional
    if (loginBlock) setVisible(loginBlock, !signedIn);

    // Show/hide account + signout if they exist
    if (els.accountBtn) setVisible(els.accountBtn, signedIn);
    if (els.signoutBtn) setVisible(els.signoutBtn, signedIn);
  }

  // ------------------------- navigation flow -------------------------

  function goToCheckoutFor(cat) {
    cat = normalizeCat(cat);
    if (!cat) return;

    setStoredCat(cat);

    // If already signed in, go straight to checkout page
    // If not signed in, stay on upgrade and scroll to checkout section
    getSession().then((session) => {
      if (session && session.user) {
        location.href = `/upgrade/checkout/?category=${encodeURIComponent(cat)}`;
      } else {
        location.href = `/upgrade/?category=${encodeURIComponent(cat)}#checkout`;
      }
    });
  }

  // ------------------------- checkout (THE FIX) -------------------------

  async function startCheckout(els, cat) {
    const session = await getSession();
    if (!session || !session.user) {
      setText(els.status, "Please sign in to continue.");
      disable(els.checkoutBtn, false);
      return;
    }

    const token = session.access_token;
    if (!token) {
      setText(els.status, "Session token missing. Please sign out and sign back in.");
      disable(els.checkoutBtn, false);
      return;
    }

    cat = normalizeCat(cat);
    if (!cat) {
      setText(els.status, "Choose a category to continue.");
      disable(els.checkoutBtn, false);
      return;
    }

    disable(els.checkoutBtn, true);
    setText(els.status, "Opening Stripe Checkout…");

    // ✅ CRITICAL: include Authorization header
    const r = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        category: cat,
        email: session.user.email || "",
      }),
    });

    if (!r.ok) {
      let detail = "";
      try {
        const j = await r.json();
        detail = j && (j.detail || j.error) ? ` (${j.detail || j.error})` : "";
      } catch {}

      // Common failure: 401 means missing/invalid token
      if (r.status === 401) {
        setText(els.status, "Session expired. Please sign out and sign back in.");
      } else {
        setText(els.status, `Failed to start checkout${detail}`);
      }

      disable(els.checkoutBtn, false);
      throw new Error(`bad_status_${r.status}`);
    }

    const j = await r.json();
    if (!j || !j.url) {
      setText(els.status, "Failed to start checkout (no url).");
      disable(els.checkoutBtn, false);
      throw new Error("no_checkout_url");
    }

    location.href = j.url;
  }

  // ------------------------- init -------------------------

  async function initOnce() {
    const authOk = await waitForAuthReady(8000);
    if (!authOk) return;

    try {
      await window.SL_AUTH.ready;
    } catch {}

    const els = collectEls();

    // Category sync
    let currentCategory = readCategory();
    if (currentCategory) writeCategory(currentCategory); // normalize + persist
    currentCategory = readCategory();
    paintCategory(els, currentCategory);

    // Session state
    let session = await getSession();
    paintSignedInState(els, session);

    // Bind category buttons (upgrade page tile buttons/cards)
    if (els.categoryBtns && els.categoryBtns.length) {
      els.categoryBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const cat = normalizeCat(btn.getAttribute("data-category"));
          if (!cat) return;
          writeCategory(cat);
          paintCategory(els, cat);
          goToCheckoutFor(cat);
        });
      });
    }

    // Optional Change Category button on checkout/upgrade
    if (els.changeCatBtn) {
      els.changeCatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // go back to upgrade categories section
        location.href = "/upgrade/?return=checkout#categories";
      });
    }

    // Sign out
    if (els.signoutBtn) {
      els.signoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          const sb = window.SL_AUTH.sb;
          await sb.auth.signOut();
        } catch {}
        setStoredCat("");
        location.href = "/upgrade/#checkout";
      });
    }

    // Account button
    if (els.accountBtn) {
      els.accountBtn.addEventListener("click", (e) => {
        e.preventDefault();
        location.href = "/account/";
      });
    }

    // Checkout/Continue button wiring
    if (els.checkoutBtn) {
      // Enable/disable based on whether category exists (session checked at click time)
      disable(els.checkoutBtn, !currentCategory);
      if (!currentCategory) setText(els.status, "Choose a category to continue.");

      els.checkoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          const cat = readCategory();
          await startCheckout(els, cat);
        } catch (err) {
          // keep UI usable
          console.warn("startCheckout failed", err);
        }
      });
    }

    // If upgrade page has #checkout, scroll cleanly
    if (IS_UPGRADE_PAGE) {
      // if signed in and URL has return=checkout and we already have a category -> bounce to checkout
      const ret = (getParam("return") || "").trim().toLowerCase();
      session = await getSession();

      const cat = readCategory();
      if (ret === "checkout" && session && session.user && cat) {
        location.replace(`/upgrade/checkout/?category=${encodeURIComponent(cat)}`);
        return;
      }

      // scroll to hash if present
      setTimeout(safeScrollToHash, 50);
    }

    // If checkout page but no session, bounce back to upgrade
    if (IS_CHECKOUT_PAGE) {
      session = await getSession();
      const cat = readCategory();

      if (!cat) {
        setText(els.status, "Choose a category to continue.");
        disable(els.checkoutBtn, true);
      }

      if (!session || !session.user) {
        // go back to upgrade checkout section (keep category)
        const back = cat ? `/upgrade/?category=${encodeURIComponent(cat)}#checkout` : "/upgrade/#checkout";
        location.replace(back);
        return;
      }
    }
  }

  // BFCache harden: re-init on pageshow if persisted
  let inited = false;

  async function init() {
    if (inited) return;
    inited = true;
    await initOnce();
  }

  window.addEventListener("pageshow", (e) => {
    if (e && e.persisted) {
      // force a clean re-init after BFCache restore
      inited = false;
      init();
    }
  });

  document.addEventListener("DOMContentLoaded", init);
})();