/* /assets/app.js
   ScopedLabs Upgrade + Checkout controller.

   Goals:
   - Keep current category in sync between:
       URL ?category=, localStorage(sl_selected_category), and UI label(s)
   - Render preview card on /upgrade (and optionally on /checkout if present)
   - Reflect auth state on BOTH pages (upgrade + checkout)
   - Wire:
       - Change category buttons
       - Checkout button (only on checkout page)
       - Signout button (both pages)
*/

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const pick = (...els) => els.find(Boolean) || null;

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");

  // ---------- Category helpers ----------
  function getUrlCategory() {
    try {
      const u = new URL(location.href);
      return (u.searchParams.get("category") || "").trim();
    } catch {}
    return "";
  }

  function getStoredCategory() {
    try {
      return (localStorage.getItem("sl_selected_category") || "").trim();
    } catch {
      return "";
    }
  }

  function setStoredCategory(cat) {
    try {
      localStorage.setItem("sl_selected_category", cat || "");
    } catch {}
  }

  function setUrlCategory(cat, keepHash = true) {
    try {
      const u = new URL(location.href);
      if (cat) u.searchParams.set("category", cat);
      else u.searchParams.delete("category");

      const next = u.pathname + "?" + u.searchParams.toString() + (keepHash ? location.hash : "");
      history.replaceState({}, document.title, next.replace(/\?$/, ""));
    } catch {}
  }

  function resolveCategory() {
    const u = getUrlCategory();
    if (u) return u;
    const s = getStoredCategory();
    if (s) return s;
    return "";
  }

  // ---------- UI elements (loose matching, no brittle IDs) ----------
  const els = {
    // labels
    selectedPill: () => pick($("sl-selected-category"), $("sl-selected-cat"), $("sl-cat-pill")),
    // buttons
    changeCategory: () => pick($("sl-change-category"), $("sl-change-cat")),
    checkoutBtn: () => $("sl-checkout"),
    signoutBtn: () => $("sl-signout"),
    accountBtn: () => $("sl-account"),
    // blocks/cards
    checkoutCard: () => pick($("sl-checkout-card"), $("checkout-card"), $("sl-checkout-box")),
    loginCard: () => pick($("sl-login-card"), $("login-card")),
    previewHost: () => pick($("sl-preview"), $("sl-preview-card"), $("preview-card")),
    // status line (shared with auth.js)
    status: () => pick($("sl-status"), $("sl-auth-status"), $("status")),
    signedInLine: () => pick($("sl-signed-in"), $("sl-signedin"), $("signed-in")),
  };

  function setStatus(msg) {
    const st = els.status();
    if (st) st.textContent = msg || "";
  }

  // ---------- Preview data ----------
  const PREVIEW = {
    wireless: {
      title: "Wireless",
      body:
        "Link planning, channel assumptions, and reliability headroom.",
      bullets: ["Link budget & margin checks", "Coverage + capacity planning", "Interference risk helpers"],
    },
    compute: {
      title: "Compute",
      body:
        "Server sizing, workload estimates, and resource headroom planning.",
      bullets: ["Capacity planning (CPU/RAM/IO)", "Growth projections", "Performance vs cost trade-offs"],
    },
    "access-control": {
      title: "Access Control",
      body:
        "Door hardware, credential formats, PoE power budgets, and deployment planning.",
      bullets: ["Controller sizing", "Power/cabling headroom", "Fail-safe impact modeling"],
    },
    performance: {
      title: "Performance",
      body:
        "Profiling, latency budgets, and practical tuning helpers.",
      bullets: ["Latency budget planning", "Queueing/throughput checks", "Headroom + burst planning"],
    },
    "physical-security": {
      title: "Physical Security",
      body:
        "Site hardening, equipment planning, and operational readiness.",
      bullets: ["Risk checklists", "Coverage planning", "Operational readiness helpers"],
    },
    thermal: {
      title: "Thermal",
      body:
        "Thermal planning, cooling assumptions, and heat-load helpers.",
      bullets: ["Heat load estimates", "Cooling headroom", "Airflow sanity checks"],
    },
  };

  function renderPreview(cat) {
    const host = els.previewHost();
    if (!host) return;

    const data = PREVIEW[cat] || null;

    // If host exists but category is empty, show a gentle placeholder
    if (!data) {
      host.innerHTML = `
        <div class="pill pill-pro" style="display:inline-flex;gap:8px;align-items:center;">
          <span aria-hidden="true">🔒</span>
          <span>Pro — Category Unlock</span>
        </div>
        <h3 style="margin-top:10px;">Choose a category</h3>
        <p class="muted">Pick a category to see what you’ll unlock.</p>
      `;
      return;
    }

    const bullets = (data.bullets || [])
      .map((b) => `<li>${escapeHtml(b)}</li>`)
      .join("");

    host.innerHTML = `
      <div class="pill pill-pro" style="display:inline-flex;gap:8px;align-items:center;">
        <span aria-hidden="true">🔒</span>
        <span>Pro — Category Unlock</span>
      </div>
      <h3 style="margin-top:10px;">${escapeHtml(data.title)}</h3>
      <p class="muted">${escapeHtml(data.body)}</p>
      <div style="margin-top:10px;">
        <div class="muted" style="margin-bottom:6px;font-weight:600;">Includes examples like:</div>
        <ul style="margin:0 0 0 18px; padding:0;">${bullets}</ul>
      </div>
      <p class="muted" style="margin-top:10px;">
        You’ll also receive future Pro tools added to <em>${escapeHtml(data.title)}</em>.
      </p>
    `;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- Category UI sync ----------
  function applyCategory(cat) {
    if (cat) {
      setStoredCategory(cat);
      if (getUrlCategory() !== cat) setUrlCategory(cat, true);
    }

    const pill = els.selectedPill();
    if (pill) pill.textContent = cat || "None selected";

    // Keep preview in sync on upgrade page (and on checkout if host exists)
    renderPreview(cat);

    // If checkout button exists, enable/disable based on category
    const cb = els.checkoutBtn();
    if (cb) cb.disabled = !cat;
  }

  // ---------- Auth reflection (upgrade AND checkout) ----------
  async function getSessionSafe() {
    const auth = window.SL_AUTH || null;
    if (!auth || !auth.ready || !auth.sb) return null;
    try {
      await auth.ready;
      const res = await auth.sb.auth.getSession();
      return res && res.data ? res.data.session : null;
    } catch {
      return null;
    }
  }

  function showSignedOutUI() {
    // On checkout: if signed out, hide action buttons and keep status visible
    if (els.checkoutBtn()) els.checkoutBtn().style.display = "";
    if (els.accountBtn()) els.accountBtn().style.display = "none";
    if (els.signoutBtn()) els.signoutBtn().style.display = "none";

    const line = els.signedInLine();
    if (line) line.textContent = "";

    // Don’t force-hide login cards; auth.js handles messaging.
  }

  function showSignedInUI(email) {
    if (els.accountBtn()) els.accountBtn().style.display = "";
    if (els.signoutBtn()) els.signoutBtn().style.display = "";

    const line = els.signedInLine();
    if (line) line.textContent = email ? `Signed in as ${email}` : "Signed in";

    // On checkout page, checkout button should be visible and enabled when category exists
    const cb = els.checkoutBtn();
    if (cb) cb.style.display = "";
  }

  async function reflectAuthState() {
    const s = await getSessionSafe();
    if (!s || !s.user) {
      showSignedOutUI();
      return null;
    }
    showSignedInUI(s.user.email || "");
    return s;
  }

  // ---------- Change category routing ----------
  function wireChangeCategory() {
    const btn = els.changeCategory();
    if (!btn) return;

    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      // Always send them to categories section on /upgrade with a return hint
      const current = resolveCategory();
      const u = new URL("https://scopedlabs.com/upgrade/");
      if (current) u.searchParams.set("category", current);
      u.searchParams.set("return", "checkout");
      u.hash = "categories";
      location.href = u.pathname + "?" + u.searchParams.toString() + u.hash;
    });
  }

  // ---------- Category buttons on upgrade page ----------
  function wireCategoryButtons() {
    // Buttons/links can be:
    // - data-category="wireless"
    // - id="sl-unlock-wireless"
    // - href="/upgrade/?category=wireless#checkout"
    const nodes = Array.from(document.querySelectorAll("[data-category], a[href*='?category='], button[id^='sl-unlock-']"));

    nodes.forEach((el) => {
      const cat =
        (el.dataset && el.dataset.category) ||
        (el.id && el.id.startsWith("sl-unlock-") ? el.id.replace("sl-unlock-", "") : "") ||
        "";

      let derived = cat;

      if (!derived && el.tagName === "A") {
        try {
          const u = new URL(el.getAttribute("href"), location.origin);
          derived = (u.searchParams.get("category") || "").trim();
        } catch {}
      }

      if (!derived) return;

      el.addEventListener("click", (ev) => {
        // Let normal links work if they already point correctly
        // But ensure we sync state before navigation
        applyCategory(derived);

        // If we are on upgrade page and link jumps to #checkout, allow it.
        // If it’s a button with no href, prevent default and scroll to checkout card.
        if (el.tagName !== "A") {
          ev.preventDefault();
          // Prefer scrolling to checkout block
          const checkoutCard = els.checkoutCard();
          if (checkoutCard && typeof checkoutCard.scrollIntoView === "function") {
            checkoutCard.scrollIntoView({ behavior: "smooth", block: "start" });
          } else if (location.hash !== "#checkout") {
            location.hash = "checkout";
          }
        }
      });
    });
  }

  // ---------- Checkout wiring (checkout page only) ----------
  function wireCheckoutButton() {
    const btn = els.checkoutBtn();
    if (!btn) return;

    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();

      const cat = resolveCategory();
      if (!cat) {
        setStatus("Choose a category to continue.");
        return;
      }

      const session = await getSessionSafe();
      if (!session || !session.user) {
        setStatus("Please sign in first.");
        return;
      }

      btn.disabled = true;
      setStatus("Opening Stripe Checkout…");

      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: cat,
            email: session.user.email,
          }),
        });

        if (!res.ok) throw new Error("bad_response");

        const data = await res.json();
        if (!data || !data.url) throw new Error("missing_url");

        location.href = data.url;
      } catch (e) {
        console.warn("[SL_APP] checkout start failed", e);
        setStatus("Failed to start checkout");
        btn.disabled = false;
      }
    });
  }

  // ---------- Return-to-checkout behavior ----------
  async function handleReturnParam() {
    // If URL has return=checkout and we already have session, and category exists,
    // go back to checkout page.
    let ret = "";
    try {
      const u = new URL(location.href);
      ret = (u.searchParams.get("return") || "").trim();
    } catch {}

    if (ret !== "checkout") return;

    const cat = resolveCategory();
    const session = await getSessionSafe();
    if (session && cat && !IS_CHECKOUT_PAGE) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(cat);
    }
  }

  // ---------- Init ----------
  (async function init() {
    const cat = resolveCategory();
    applyCategory(cat);

    wireChangeCategory();
    wireCategoryButtons();

    // Wait for auth, then reflect state on this page
    await reflectAuthState();

    // If return flow requested, handle it
    await handleReturnParam();

    if (IS_CHECKOUT_PAGE) {
      wireCheckoutButton();
      // Ensure change-category works on checkout page too (same id)
      // wireChangeCategory() already did this.
    }
  })();
})();

