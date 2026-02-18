/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Goals:
   - Keep current category in sync between:
     URL ?category=, localStorage(sl_selected_category), and UI labels
   - Render preview card for selected category
   - Wire:
     - "Choose a different category" (checkout page) → /upgrade/?return=checkout#categories
     - Category pickers (upgrade page) → set category + (if return=checkout) go back to checkout
     - Checkout button (checkout page) → POST /api/create-checkout-session
   - Reflect session on BOTH pages:
     - Signed in line on upgrade + checkout
     - Show/hide checkout/account/signout buttons safely
*/

(() => {
  "use strict";

  const $ = (sel) =>
    sel.startsWith("#") ? document.querySelector(sel) : document.getElementById(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");

  const LS_KEY = "sl_selected_category";

  // ---------- helpers ----------
  function safeSlug(x) {
    return (x || "").toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  }

  function getUrlCategory() {
    try {
      return safeSlug(new URL(location.href).searchParams.get("category"));
    } catch {
      return "";
    }
  }

  function setUrlCategory(cat, keepHash = true) {
    try {
      const u = new URL(location.href);
      if (cat) u.searchParams.set("category", cat);
      else u.searchParams.delete("category");
      const hash = keepHash ? location.hash : "";
      history.replaceState({}, "", u.pathname + u.search + hash);
    } catch {}
  }

  function getStoredCategory() {
    try {
      return safeSlug(localStorage.getItem(LS_KEY));
    } catch {
      return "";
    }
  }

  function setStoredCategory(cat) {
    try {
      if (cat) localStorage.setItem(LS_KEY, cat);
      else localStorage.removeItem(LS_KEY);
    } catch {}
  }

  function statusEl() {
    return (
      $("sl-status") ||
      $("sl-auth-status") ||
      document.querySelector('[data-role="auth-status"]') ||
      null
    );
  }

  function setStatus(msg) {
    const st = statusEl();
    if (st) st.textContent = msg || "";
  }

  function categoryLabelEl() {
    return (
      $("selected-category") ||
      $("sl-selected-category") ||
      $("sl-selected-cat") ||
      document.querySelector('[data-role="selected-category"]') ||
      null
    );
  }

  // ---------- category meta / preview ----------
  const CATEGORY_META = {
    wireless: {
      title: "Wireless",
      bullets: ["Link budget & margin checks", "Coverage + capacity planning", "Interference risk helpers"],
    },
    compute: {
      title: "Compute",
      bullets: ["Capacity planning (CPU/RAM/IO)", "Growth projections", "Performance vs cost trade-offs"],
    },
    "access-control": {
      title: "Access Control",
      bullets: ["Controller sizing", "Power/cabling headroom", "Fail-safe impact modeling"],
    },
    performance: {
      title: "Performance",
      bullets: ["Latency budgeting", "Load growth planning", "Bottleneck identification"],
    },
    thermal: {
      title: "Thermal",
      bullets: ["Thermal capacity planning", "Derating & ambient modeling", "Cooling requirement estimates"],
    },
  };

  function renderSelectedPreview(mount, cat) {
    if (!mount) return;
    mount.innerHTML = "";

    const meta = CATEGORY_META[cat] || null;
    if (!meta) return;

    const card = document.createElement("div");
    card.className = "card tool-card";
    card.innerHTML = `
      <div class="pill pill-pro"><span aria-hidden="true">🔒</span> Pro — Category Unlock</div>
      <h3 style="margin-top:.6rem;">${meta.title}</h3>
      <div class="muted" style="margin-top:.4rem;">${previewDescription(cat)}</div>
      <div class="muted" style="margin-top:.75rem;"><strong>Includes examples like:</strong></div>
      <ul style="margin-top:.5rem; padding-left:1.2rem;">
        ${meta.bullets.map((b) => `<li>${b}</li>`).join("")}
      </ul>
      <div class="muted" style="margin-top:.65rem;">You’ll also receive future Pro tools added to <em>${meta.title}</em>.</div>
    `;

    mount.appendChild(card);
  }

  function previewDescription(cat) {
    switch (cat) {
      case "wireless":
        return "Link planning, channel assumptions, and reliability headroom.";
      case "compute":
        return "Server sizing, workload estimates, and resource headroom planning.";
      case "access-control":
        return "Door hardware, credential formats, PoE power budgets, and deployment planning.";
      case "performance":
        return "Latency targets, throughput sanity checks, and scaling guardrails.";
      case "thermal":
        return "Ambient, load, and cooling capacity planning for gear and cabinets.";
      default:
        return "Unlock Pro tools for this category.";
    }
  }

  function syncCategoryUI(cat) {
    const label = categoryLabelEl();
    if (label) label.textContent = cat || "None selected";

    const h = $("sl-checkout-title");
    if (h) h.textContent = cat ? `Unlock ${cat}` : "Unlock a category";

    // Mount points for preview (supports both pages)
    const mount =
      $("sl-selected-category-preview") ||
      $("selected-category-preview") ||
      $("sl-selected-category-preview-checkout") ||
      null;

    renderSelectedPreview(mount, cat);
  }

  // ---------- navigation ----------
  function goToCheckoutFor(cat, sessionExists) {
    const slug = safeSlug(cat);
    if (slug) setStoredCategory(slug);

    if (sessionExists) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(slug || "");
    } else {
      location.href = "/upgrade/?category=" + encodeURIComponent(slug || "") + "#checkout";
    }
  }

  function goToUpgradeCategories() {
    // Always send them to upgrade categories, preserving category
    const cat = getUrlCategory() || getStoredCategory();
    setStoredCategory(cat);

    const url =
      "/upgrade/?return=checkout" + (cat ? "&category=" + encodeURIComponent(cat) : "") + "#categories";
    location.href = url;
  }

  // ---------- auth-aware UI ----------
  function applyAuthUI(session) {
    const signedIn = !!session;
    const email = signedIn && session.user ? session.user.email : "";

    // Status line on both pages
    if (signedIn) setStatus(email ? `Signed in as ${email}` : "Signed in.");
    else setStatus("");

    // Buttons (if present on the page)
    const btnCheckout = $("sl-checkout");
    const btnAccount = $("sl-account");
    const btnSignout = $("sl-signout");

    // Email form (if present)
    const sendBtn = $("sl-sendlink") || $("sl-send-btn") || $("sl-send");
    const emailInput = $("sl-email") || $("sl-email-input") || $("email");

    // We DO NOT hide the whole checkout card anymore.
    // We only toggle actions that exist.
    if (btnCheckout) btnCheckout.style.display = signedIn ? "" : "none";
    if (btnAccount) btnAccount.style.display = signedIn ? "" : "none";
    if (btnSignout) btnSignout.style.display = signedIn ? "" : "none";

    if (sendBtn) sendBtn.style.display = signedIn ? "none" : "";
    if (emailInput) emailInput.disabled = signedIn;

    // Optional signed-in email label
    const emailLabel =
      $("sl-user-email") || document.querySelector('[data-role="user-email"]') || null;
    if (emailLabel) emailLabel.textContent = email || "";
  }

  // ---------- wiring ----------
  function wireCategoryPickers(sessionExists) {
    // Any element that declares a category should set it.
    // Supports:
    // - data-category="wireless"
    // - id="sl-unlock-wireless"
    // - href="/upgrade/?category=wireless#checkout"
    const candidates = [
      ...$$("[data-category]"),
      ...$$('a[href*="/upgrade/?category="]'),
      ...$$('[id^="sl-unlock-"]'),
    ];

    const seen = new Set();
    for (const el of candidates) {
      if (seen.has(el)) continue;
      seen.add(el);

      el.addEventListener("click", (e) => {
        const fromData = safeSlug(el.getAttribute("data-category"));
        const fromId = safeSlug((el.id || "").replace(/^sl-unlock-/, ""));
        let fromHref = "";
        try {
          const href = el.getAttribute("href") || "";
          if (href.includes("category=")) {
            const u = new URL(href, window.location.origin);
            fromHref = safeSlug(u.searchParams.get("category"));
          }
        } catch {}

        const cat = fromData || fromId || fromHref;
        if (!cat) return;

        setStoredCategory(cat);
        setUrlCategory(cat, true);
        syncCategoryUI(cat);

        const url = new URL(location.href);
        const wantsReturn = url.searchParams.get("return") === "checkout";

        // If user is returning to checkout and is signed in, jump directly to checkout.
        if (!IS_CHECKOUT_PAGE && wantsReturn && sessionExists) {
          e.preventDefault();
          location.href = "/upgrade/checkout/?category=" + encodeURIComponent(cat);
          return;
        }

        // If signed in and they clicked an unlock on upgrade page, go to checkout directly
        if (!IS_CHECKOUT_PAGE && sessionExists) {
          // Only intercept if it looks like an unlock CTA (button or link)
          const tag = (el.tagName || "").toLowerCase();
          if (tag === "a" || tag === "button") {
            e.preventDefault();
            goToCheckoutFor(cat, true);
          }
        }
      });
    }
  }

  function wireChangeCategoryButtons() {
    // Checkout page button
    const changeBtn = $("sl-change-category");
    if (changeBtn) {
      changeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        goToUpgradeCategories();
      });
    }

    // Upgrade page "Change Category" (if it uses a different id)
    const upgradeChangeBtn = $("sl-change-category-upgrade");
    if (upgradeChangeBtn) {
      upgradeChangeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // On upgrade page we want to force users into the checkout card area
        const cat = getUrlCategory() || getStoredCategory();
        if (cat) {
          setUrlCategory(cat, true);
          setStoredCategory(cat);
        }
        location.href = "/upgrade/?category=" + encodeURIComponent(cat || "") + "#checkout";
      });
    }
  }

  function wireCheckoutButton(sb, getSessionFn) {
    const btn = $("sl-checkout");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const session = await getSessionFn(sb);
      const cat = getUrlCategory() || getStoredCategory();

      if (!session) return;
      if (!cat) return;

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

        if (!res.ok) throw new Error("Bad response");
        const data = await res.json();

        if (!data || !data.url) throw new Error("Missing url");
        location.href = data.url;
      } catch (e) {
        btn.disabled = false;
        setStatus("Failed to start checkout");
        console.warn("[SL_APP] checkout failed:", e);
      }
    });
  }

  async function getSession(sb) {
    try {
      const res = await sb.auth.getSession();
      return res && res.data ? res.data.session : null;
    } catch {
      return null;
    }
  }

  // ---------- init ----------
  async function init() {
    // Category boot
    const initialCat = getUrlCategory() || getStoredCategory();
    if (initialCat) {
      setStoredCategory(initialCat);
      syncCategoryUI(initialCat);
    } else {
      syncCategoryUI("");
    }

    wireChangeCategoryButtons();

    // Wait for auth
    const auth = window.SL_AUTH;
    if (!auth || !auth.sb) {
      // auth.js might still be loading; listen for event as a fallback
      window.addEventListener("sl-auth", (ev) => {
        const session = ev && ev.detail ? ev.detail.session : null;
        applyAuthUI(session);
      });
      return;
    }

    // Initial session
    const sb = auth.sb;
    const session = await getSession(sb);
    applyAuthUI(session);

    // Wire pickers with knowledge of signed-in state
    wireCategoryPickers(!!session);

    // Checkout page guard
    if (IS_CHECKOUT_PAGE && !session) {
      const cat = getUrlCategory() || getStoredCategory();
      location.href = "/upgrade/?category=" + encodeURIComponent(cat || "") + "#checkout";
      return;
    }

    // If return=checkout is present and we already have a category, bounce back
    if (!IS_CHECKOUT_PAGE) {
      const url = new URL(location.href);
      const wantsReturn = url.searchParams.get("return") === "checkout";
      const cat = getUrlCategory() || getStoredCategory();
      if (wantsReturn && session && cat) {
        location.href = "/upgrade/checkout/?category=" + encodeURIComponent(cat);
        return;
      }
    }

    // Wire checkout button (checkout page)
    wireCheckoutButton(sb, getSession);

    // Live auth updates
    sb.auth.onAuthStateChange((_event, newSession) => {
      applyAuthUI(newSession);

      // Re-wire pickers so "signed-in jump to checkout" works after login
      wireCategoryPickers(!!newSession);
    });

    // Also listen for broadcast from auth.js (source of truth)
    window.addEventListener("sl-auth", (ev) => {
      const s = ev && ev.detail ? ev.detail.session : null;
      applyAuthUI(s);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

