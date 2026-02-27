/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Goals:
   - Keep "current category" in sync between:
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

  // Must be created by auth.js
  const sb = () => (window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null);
  const ready = () => (window.SL_AUTH && window.SL_AUTH.ready ? window.SL_AUTH.ready : Promise.resolve());

  const STORAGE_KEY = "sl_selected_category";
  const RETURN_KEY = "sl_return_to";

  const CATEGORY_DEFS = {
    power: {
      title: "Power",
      desc: "UPS runtime, load growth, battery bank sizing, generator planning.",
      bullets: ["Category-specific calculators", "Coverage + capacity planning", "Reliability + margin helpers"],
    },
    network: {
      title: "Network",
      desc: "Bandwidth, latency budgets, uplink planning, and throughput checks.",
      bullets: ["Bandwidth + throughput planning", "Latency + overhead budgets", "Uplink sizing + headroom"],
    },
    video: {
      title: "Video & Storage",
      desc: "Retention sizing, bitrate math, RAID impact, storage planning.",
      bullets: ["Storage + retention planning", "Bitrate + quality helpers", "RAID overhead + redundancy"],
    },
    infrastructure: {
      title: "Infrastructure",
      desc: "Rack power, PoE budgets, UPS sizing, redundancy planning.",
      bullets: ["Power + thermal planning", "Reliability + failover", "Capacity + expansion"],
    },
    "access-control": {
      title: "Access Control",
      desc: "Door hardware, credential formats, PoE power budgets, and deployment planning.",
      bullets: ["Controller sizing + expansion planning", "Power + cabling headroom checks", "Reader + lock hardware planning"],
    },
  };

  let currentCategory = null;
  let currentSession = null;

  // -----------------------------
  // Helpers
  // -----------------------------
  function qs(name) {
    try {
      return new URLSearchParams(location.search).get(name);
    } catch {
      return null;
    }
  }

  function setUrlCategory(cat) {
    const u = new URL(location.href);
    if (cat) u.searchParams.set("category", cat);
    else u.searchParams.delete("category");
    history.replaceState({}, "", u.toString());
  }

  function setStoredCategory(cat) {
    try {
      if (cat) localStorage.setItem(STORAGE_KEY, cat);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  function getStoredCategory() {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  }

  function normalizeCategory(cat) {
    if (!cat) return null;
    const c = String(cat).trim().toLowerCase();
    return c || null;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showStatus(msg) {
    const s = document.getElementById("sl-status");
    if (s) s.textContent = msg || "";
  }

  // -----------------------------
  // Auth UI gating + hint swap
  // -----------------------------
  const els = {
    continueBtn: () => document.getElementById("sl-continue"),
    account: () => document.getElementById("sl-account"),
    signout: () => document.getElementById("sl-signout"),
    email: () => document.getElementById("sl-email"),
    sendlink: () => document.getElementById("sl-sendlink"),
    loginHint: () => document.getElementById("sl-login-hint"),
    authState: () => document.getElementById("sl-auth-state"),
  };

  function setSignedInUI(isSignedIn, email) {
    const show = (el, on) => {
      if (!el) return;
      el.style.display = on ? "" : "none";
    };

    // Signed-in actions
    show(els.continueBtn(), !!isSignedIn);
    show(els.account(), !!isSignedIn);
    show(els.signout(), !!isSignedIn);

    // Signed-out login controls
    show(els.email(), !isSignedIn);
    show(els.sendlink(), !isSignedIn);

    // Swap the hint line (only if the element exists on that page)
    const hint = els.loginHint();
    if (hint) {
      if (isSignedIn) {
        hint.textContent = email ? `Signed in as ${email}` : "Signed in";
      } else {
        hint.textContent = "Sign in to purchase (magic link — no password)";
      }
    }

    // Optional status line used by some layouts
    const state = els.authState();
    if (state) state.textContent = isSignedIn ? (email ? `Signed in as ${email}` : "Signed in.") : "Signed out.";
  }

  async function refreshAuthUIOnly() {
    // Safe default while we detect
    setSignedInUI(false, "");

    const client = sb();
    if (!client) return;

    try {
      await ready();
    } catch {}

    try {
      const { data } = await client.auth.getSession();
      const session = data && data.session ? data.session : null;
      const email = session && session.user ? session.user.email : "";
      setSignedInUI(!!session, email);
    } catch {
      setSignedInUI(false, "");
    }
  }

  function attachAuthListenersOnce() {
    const client = sb();
    if (!client) return;

    // React to auth changes (magic link return, sign out, etc.)
    (async () => {
      try {
        await ready();
      } catch {}
      try {
        client.auth.onAuthStateChange((_evt, session) => {
          const email = session && session.user ? session.user.email : "";
          setSignedInUI(!!session, email);
          // also keep global session in sync if init already ran
          currentSession = session || null;
          updateCategoryUI();
        });
      } catch {}
    })();
  }

  // -----------------------------
  // Preview + UI
  // -----------------------------
  function renderSelectedPreview() {
    const host =
      document.getElementById(IS_CHECKOUT_PAGE ? "sl-selected-category-preview-checkout" : "sl-selected-category-preview");
    if (!host) return;

    const def = CATEGORY_DEFS[currentCategory] || null;

    const title = def ? def.title : currentCategory ? currentCategory : "None selected";
    const desc = def ? def.desc : "Choose a category to see what you’ll unlock.";
    const bullets = def
      ? def.bullets
      : ["Pick a lane to unlock Pro tools.", "One-time purchase per category.", "Keep it forever."];

    host.innerHTML = `
      <div class="card" style="margin:0;">
        <div class="pill" style="margin-bottom:10px;">Preview</div>
        <h3 style="margin:0 0 8px 0;">${escapeHtml(title)}</h3>
        <p class="muted" style="margin-top:0;">${escapeHtml(desc)}</p>
        <div class="muted" style="margin-top: 10px;">Includes examples like:</div>
        <ul class="muted" style="margin-top: 8px;">
          ${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
        </ul>
        <div class="muted">You’ll also receive future Pro tools added to this category.</div>
      </div>
    `;
  }

  function ensurePreviewMount() {
    const grid = document.getElementById("sl-checkout-grid");
    if (!grid) return;

    const existing =
      document.getElementById(IS_CHECKOUT_PAGE ? "sl-selected-category-preview-checkout" : "sl-selected-category-preview");
    if (existing) return;

    const mount = document.createElement("div");
    mount.id = IS_CHECKOUT_PAGE ? "sl-selected-category-preview-checkout" : "sl-selected-category-preview";
    grid.appendChild(mount);
  }

  function updateCategoryUI() {
    const pill = document.getElementById("sl-selected-category");
    if (pill) pill.textContent = currentCategory || "None";

    const label = document.getElementById("sl-selected-category-label");
    if (label) label.textContent = currentCategory || "None selected";

    const title = document.getElementById("sl-checkout-title");
    if (title && IS_CHECKOUT_PAGE) {
      title.innerHTML = `Unlock <span id="sl-selected-category-label">${escapeHtml(currentCategory || "None selected")}</span>`;
    }

    renderSelectedPreview();

    const checkoutBtn = document.getElementById("sl-checkout");
    if (checkoutBtn) checkoutBtn.disabled = !currentCategory || !currentSession;
  }

  // -----------------------------
  // Navigation + category selection
  // -----------------------------
  function goToCheckoutFor(cat) {
    const c = normalizeCategory(cat);
    if (!c) return;

    currentCategory = c;
    setStoredCategory(c);
    setUrlCategory(c);
    updateCategoryUI();

    if (currentSession) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(c);
    } else {
      location.href = "/upgrade/?category=" + encodeURIComponent(c) + "#checkout";
    }
  }

  function bindCategoryLinks() {
    const buttons = Array.from(
      document.querySelectorAll(
        "[data-category], [id^='sl-unlock-'], a.btn[href*='?category='], a.btn-primary[href*='?category=']"
  )
);

    buttons.forEach((btn) => {
      let cat = btn.getAttribute("data-category") || null;

      if (!cat) {
        const id = btn.getAttribute("id") || "";
        if (id.startsWith("sl-unlock-")) cat = id.replace("sl-unlock-", "");
      }

      if (!cat && btn.tagName.toLowerCase() === "a") {
        try {
          const u = new URL(btn.getAttribute("href"), location.origin);
          cat = u.searchParams.get("category");
        } catch {}
      }

      cat = normalizeCategory(cat);
      if (!cat) return;

      btn.addEventListener("click", (e) => {
        // keep layout stable: only intercept if we're on upgrade/ pages
    if (location.pathname.startsWith("/upgrade")) {
     e.preventDefault();
     goToCheckoutFor(cat);
    }
      });
    });
  }

  async function refreshSession() {
    const client = sb();
    if (!client) return null;

    try {
      const { data } = await client.auth.getSession();
      return data && data.session ? data.session : null;
    } catch {
      return null;
    }
  }

  // -----------------------------
  // Main init
  // -----------------------------
  let _initRunning = false;

  async function init() {
    if (_initRunning) return;
    _initRunning = true;

    try {
      showStatus("");
      ensurePreviewMount();

      // Category: URL > localStorage
      currentCategory = normalizeCategory(qs("category")) || normalizeCategory(getStoredCategory());
      if (currentCategory) {
        setStoredCategory(currentCategory);
        setUrlCategory(currentCategory);
      }

      updateCategoryUI();
      bindCategoryLinks();

      // Always update UI gating immediately (works even if auth.js is still warming up)
      await refreshAuthUIOnly();

      // Now get real session and apply rules
      try {
        await ready();
      } catch {}

      currentSession = await refreshSession();

      // Checkout page must have session
      if (IS_CHECKOUT_PAGE && !currentSession) {
        const known = currentCategory || normalizeCategory(getStoredCategory()) || "";
        location.href = "/upgrade/?category=" + encodeURIComponent(known) + "#checkout";
        return;
      }

      // Apply signed-in gating + hint line
      const email = currentSession && currentSession.user ? currentSession.user.email : "";
      setSignedInUI(!!currentSession, email);

      // Wire change category
      const changeCategoryBtn = document.getElementById("sl-change-category");
      if (changeCategoryBtn) {
        changeCategoryBtn.addEventListener("click", () => {
          if (IS_CHECKOUT_PAGE) {
            location.href = "/upgrade/?return=checkout#categories";
          } else {
            location.href = "/upgrade/#categories";
          }
        });
      }

      // Account button
      const accountBtn = document.getElementById("sl-account");
      if (accountBtn) {
        accountBtn.addEventListener("click", () => {
          location.href = "/account/";
        });
      }

      // Wire checkout button
      const checkoutBtn = document.getElementById("sl-checkout");
      if (checkoutBtn) {
        checkoutBtn.addEventListener("click", async () => {
          if (!currentSession) return;
          if (!currentCategory) return;

          checkoutBtn.disabled = true;
          showStatus("Opening Stripe Checkout…");

          try {
            const res = await fetch("/api/create-checkout-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                category: currentCategory,
                email: currentSession.user.email,
              }),
            });

            if (!res.ok) throw new Error("checkout_failed");

            const data = await res.json();
            if (!data || !data.url) throw new Error("missing_url");

            location.href = data.url;
          } catch {
            checkoutBtn.disabled = false;
            showStatus("Failed to start checkout");
          }
        });
      }

      updateCategoryUI();
    } finally {
      _initRunning = false;
    }
  }

  // Boot + BFCache restore
  document.addEventListener("DOMContentLoaded", () => {
    attachAuthListenersOnce();
    init().catch(() => {});
  });

  window.addEventListener("pageshow", () => {
    attachAuthListenersOnce();
    init().catch(() => {});
  });
})();