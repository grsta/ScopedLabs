/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Goals:
   - Always keep a "current category" in sync between:
     URL ?category=, localStorage(sl_selected_category), and UI label(s)
   - Bind all category unlock buttons/links (data-category OR id sl-unlock-<cat> OR href ?category=)
   - Routing rules:
       * If signed in: clicking a category unlock goes straight to /upgrade/checkout/?category=CAT
       * If NOT signed in: clicking a category unlock goes to /upgrade/?category=CAT#checkout
   - Checkout page:
       * Requires a valid session
       * Checkout button calls /api/create-checkout-session
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");
  const STORE_KEY = "sl_selected_category";

  // Must be created by /assets/auth.js
  const AUTH = window.SL_AUTH || {};
  const sb = AUTH.sb || null;

  const $ = (id) => document.getElementById(id);
  const pick = (...els) => els.find(Boolean) || null;

  const els = {
    // shared
    status: () => pick($("sl-status"), $("sl-auth-status"), $("status")),
    email: () => pick($("sl-email"), $("sl-email-input"), $("email")),
    sendBtn: () => pick($("sl-sendlink"), $("sl-send-btn"), $("sl-send"), $("sendlink")),
    signoutBtn: () => pick($("sl-signout"), $("sl-logout"), $("signout")),
    accountBtn: () => pick($("sl-account"), $("account")),

    // category UI
    selectedLabel: () =>
      pick($("sl-selected-cat-label"), $("sl-category-label"), $("sl-selected-category-label")),
    selectedPill: () => pick($("sl-category-pill"), $("sl-selected-category-pill")),

    // IMPORTANT: your upgrade page uses sl-selected-category-preview
    previewHost: () =>
      pick($("sl-selected-category-preview"), $("sl-preview"), $("sl-preview-card"), $("preview-card")),

    // checkout controls
    checkoutBtn: () => pick($("sl-checkout"), $("checkout")),
    changeCategory: () => pick($("sl-change-category")),
  };

  function setStatus(msg, kind = "info") {
    const st = els.status();
    if (!st) return;
    st.textContent = msg || "";
    st.classList.remove("ok", "error", "warn", "info");
    st.classList.add(kind);
  }

  function getParamCategory() {
    const params = new URLSearchParams(location.search);
    const cat = params.get("category");
    return cat ? String(cat).trim() : "";
  }

  function getStoredCategory() {
    try {
      return String(localStorage.getItem(STORE_KEY) || "").trim();
    } catch {
      return "";
    }
  }

  function storeCategory(cat) {
    try {
      if (!cat) localStorage.removeItem(STORE_KEY);
      else localStorage.setItem(STORE_KEY, cat);
    } catch {}
  }

  function resolveCategory() {
    return getParamCategory() || getStoredCategory() || "";
  }

  function applyCategory(cat) {
    const c = (cat || "").trim();
    if (!c) {
      if (els.selectedLabel()) els.selectedLabel().textContent = "None selected";
      if (els.selectedPill()) els.selectedPill().textContent = "None";
      renderPreview(""); // clear
      return;
    }

    storeCategory(c);

    if (els.selectedLabel()) els.selectedLabel().textContent = c;
    if (els.selectedPill()) els.selectedPill().textContent = c;

    renderPreview(c);
  }

  function renderPreview(cat) {
    const host = els.previewHost();
    if (!host) return; // no preview area on this page (e.g., checkout)

    // Your HTML already has the correct card layout; we only fill the content.
    // If the host is a container, keep it simple and non-destructive.
    const c = (cat || "").trim();
    if (!c) {
      host.innerHTML = "";
      return;
    }

    // Basic preview text (your existing CSS card styling stays intact)
    host.innerHTML = `
      <div class="mini-card">
        <div class="pill pill-pro">🔒 Pro — Category Unlock</div>
        <h3 style="margin-top:10px">${escapeHtml(titleCase(c))}</h3>
        <p class="muted" style="margin-top:8px">
          You’ll unlock the <b>${escapeHtml(c)}</b> category forever (one-time purchase).
        </p>
      </div>
    `;
  }

  function titleCase(str) {
    return String(str)
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return ch;
      }
    });
  }

  async function getSessionSafe() {
    if (!sb) return null;
    try {
      const { data } = await sb.auth.getSession();
      return (data && data.session) || null;
    } catch {
      return null;
    }
  }

  function showSignedOutUI() {
    // On upgrade page we want email + send visible.
    if (els.sendBtn()) els.sendBtn().style.display = "";
    if (els.email()) els.email().style.display = "";
    if (els.signoutBtn()) els.signoutBtn().style.display = "none";
    if (els.accountBtn()) els.accountBtn().style.display = "none";

    if (IS_CHECKOUT_PAGE) {
      // On checkout page without session, we should not allow checkout.
      if (els.checkoutBtn()) els.checkoutBtn().disabled = true;
    }
  }

  function showSignedInUI(session) {
    const email = session && session.user && session.user.email ? session.user.email : "your account";
    // Hide magic-link send controls when signed in
    if (els.sendBtn()) els.sendBtn().style.display = "none";
    // Keep email field visible (nice confirmation), but you can hide it if you want
    if (els.email()) els.email().style.display = "";

    if (els.signoutBtn()) els.signoutBtn().style.display = "";
    if (els.accountBtn()) els.accountBtn().style.display = "";

    setStatus(`Signed in as ${email}`, "ok");

    if (IS_CHECKOUT_PAGE) {
      // enable checkout only when we also have a category
      const cat = resolveCategory();
      if (els.checkoutBtn()) els.checkoutBtn().disabled = !cat;
    }
  }

  async function reflectAuthState() {
    const s = await getSessionSafe();
    if (s) showSignedInUI(s);
    else {
      showSignedOutUI();
      // keep the page calm; do not spam errors
      if (IS_CHECKOUT_PAGE) setStatus("Please sign in to continue.", "info");
    }
  }

  function wireChangeCategory() {
    const btn = els.changeCategory();
    if (!btn) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // IMPORTANT: do NOT include ?category=... here or you’ll just loop back instantly.
      // We want the user to actually pick a new one.
      location.href = "/upgrade/?return=checkout#categories";
    });
  }

  function wireCategoryButtons() {
    // Bind anything that represents a category selection.
    // Supports:
    // - data-category="wireless"
    // - id="sl-unlock-wireless"
    // - href="/upgrade/?category=wireless#checkout"
    const nodes = Array.from(document.querySelectorAll("[data-category], a[href*='?category='], button[id^='sl-unlock-']"));

    if (!nodes.length) return;

    nodes.forEach((node) => {
      const getCat = () => {
        if (node.dataset && node.dataset.category) return String(node.dataset.category).trim();
        if (node.id && node.id.startsWith("sl-unlock-")) return String(node.id.replace("sl-unlock-", "")).trim();

        if (node.tagName === "A") {
          try {
            const u = new URL(node.href, location.origin);
            return (u.searchParams.get("category") || "").trim();
          } catch {
            return "";
          }
        }
        return "";
      };

      node.addEventListener("click", async (e) => {
        const cat = getCat();
        if (!cat) return;

        e.preventDefault();
        storeCategory(cat);

        const session = await getSessionSafe();
        const returnToCheckout = new URLSearchParams(location.search).get("return") === "checkout";

        if (session) {
          location.href = "/upgrade/checkout/?category=" + encodeURIComponent(cat);
          return;
        }

        // signed out:
        // if returning to checkout, keep them in upgrade and show login card (#checkout)
        // otherwise go to upgrade checkout section
        if (returnToCheckout) {
          location.href = "/upgrade/?return=checkout&category=" + encodeURIComponent(cat) + "#checkout";
        } else {
          location.href = "/upgrade/?category=" + encodeURIComponent(cat) + "#checkout";
        }
      });
    });
  }

  function wireCheckoutButton() {
    if (!IS_CHECKOUT_PAGE) return;

    const btn = els.checkoutBtn();
    if (!btn) return;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();

      const session = await getSessionSafe();
      const cat = resolveCategory();

      if (!session) {
        setStatus("Please sign in first.", "warn");
        return;
      }
      if (!cat) {
        setStatus("Choose a category to continue.", "warn");
        return;
      }

      btn.disabled = true;
      setStatus("Opening Stripe Checkout…", "info");

      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: cat,
            email: session.user.email,
          }),
        });

        if (!res.ok) throw new Error("bad_status");
        const data = await res.json();
        if (!data || !data.url) throw new Error("missing_url");

        location.href = data.url;
      } catch (err) {
        console.warn("checkout_start_failed", err);
        btn.disabled = false;
        setStatus("Failed to start checkout", "error");
      }
    });
  }

  // FIX #1: this MUST be async (it uses await) or the whole file can behave “dead”
  async function handleReturnParam() {
    const params = new URLSearchParams(location.search);
    const ret = params.get("return");
    if (ret !== "checkout") return;

    // FIX #2: If we're on the categories section, DO NOT auto-redirect.
    // That was causing the loop where you never get to pick a new category.
    const onCategories = (location.hash || "").toLowerCase().startsWith("#categories");
    if (onCategories && !IS_CHECKOUT_PAGE) return;

    const cat = resolveCategory();
    const session = await getSessionSafe();

    // If we're on upgrade page, returning=checkout, and already signed in + have cat,
    // go back to checkout automatically.
    if (!IS_CHECKOUT_PAGE && session && cat) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(cat);
      return;
    }

    // If we're on checkout page but missing session, bounce back to upgrade login
    if (IS_CHECKOUT_PAGE && !session) {
      const u = new URL("/upgrade/", location.origin);
      u.searchParams.set("return", "checkout");
      if (cat) u.searchParams.set("category", cat);
      u.hash = "checkout";
      location.href = u.pathname + u.search + u.hash;
    }
  }

  // Init
  (async () => {
    applyCategory(resolveCategory());
    await reflectAuthState();

    // update auth state live
    if (sb && sb.auth && sb.auth.onAuthStateChange) {
      sb.auth.onAuthStateChange((_event, _session) => {
        // keep it simple: re-check session
        reflectAuthState();
      });
    }

    wireChangeCategory();
    wireCategoryButtons();
    wireCheckoutButton();

    await handleReturnParam();
  })();
})();
