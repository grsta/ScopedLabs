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
    // keep hash
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

  function renderSelectedPreview() {
    const host =
      document.getElementById(IS_CHECKOUT_PAGE ? "sl-selected-category-preview-checkout" : "sl-selected-category-preview");

    if (!host) return;

    const def = CATEGORY_DEFS[currentCategory] || null;

    const title = def ? def.title : (currentCategory ? currentCategory : "None selected");
    const desc = def ? def.desc : "Choose a category to see what you’ll unlock.";
    const bullets = def ? def.bullets : ["Pick a lane to unlock Pro tools.", "One-time purchase per category.", "Keep it forever."];

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

    // if someone removed the mount, create it
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

  function showStatus(msg) {
    const s = document.getElementById("sl-status");
    if (s) s.textContent = msg || "";
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showSignedIn(email) {
    const el = document.getElementById("sl-auth-state");
    if (el) el.textContent = `Signed in as ${email}`;

    // Hide login UI when already signed in (upgrade page)
    const loginBox = document.getElementById("sl-login-box");
    if (loginBox) loginBox.style.display = "none";
    const emailInput = document.getElementById("sl-email");
    if (emailInput) emailInput.disabled = true;
    const sendBtn = document.getElementById("sl-sendlink");
    if (sendBtn) sendBtn.style.display = "none";

    const card = document.getElementById("sl-checkout-card");
    if (card) card.style.display = "";

    const btn = document.getElementById("sl-checkout");
    if (btn) btn.disabled = !currentCategory;
  }

  function showSignedOut() {
    const el = document.getElementById("sl-auth-state");
    if (el) el.textContent = "Signed out.";

    // Show login UI (upgrade page)
    const loginBox = document.getElementById("sl-login-box");
    if (loginBox) loginBox.style.display = "";
    const emailInput = document.getElementById("sl-email");
    if (emailInput) emailInput.disabled = false;
    const sendBtn = document.getElementById("sl-sendlink");
    if (sendBtn) sendBtn.style.display = "";

    const card = document.getElementById("sl-checkout-card");
    if (card) card.style.display = "";

    const btn = document.getElementById("sl-checkout");
    if (btn) btn.disabled = true;
  }

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
    const buttons = Array.from(document.querySelectorAll("[data-category], [id^='sl-unlock-'], a[href*='?category=']"));

    buttons.forEach((btn) => {
      // prefer explicit data-category
      let cat = btn.getAttribute("data-category") || null;

      // id="sl-unlock-foo"
      if (!cat) {
        const id = btn.getAttribute("id") || "";
        if (id.startsWith("sl-unlock-")) cat = id.replace("sl-unlock-", "");
      }

      // href ?category=
      if (!cat && btn.tagName.toLowerCase() === "a") {
        try {
          const u = new URL(btn.getAttribute("href"), location.origin);
          cat = u.searchParams.get("category");
        } catch {}
      }

      cat = normalizeCategory(cat);
      if (!cat) return;

      btn.addEventListener("click", (e) => {
        // only intercept if it looks like an unlock/select intent
        // (anchors still work as fallback)
        e.preventDefault();
        goToCheckoutFor(cat);
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

  async function init() {
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

    await ready();

    currentSession = await refreshSession();

    if (IS_CHECKOUT_PAGE) {
      // Must have a session on checkout page
      if (!currentSession) {
        const known = currentCategory || normalizeCategory(getStoredCategory()) || "";
        location.href = "/upgrade/?category=" + encodeURIComponent(known) + "#checkout";
        return;
      }
    }

    // Update auth state UI
    if (currentSession && currentSession.user && currentSession.user.email) {
      showSignedIn(currentSession.user.email);
    } else {
      showSignedOut();
    }

    // Wire change category
    const changeCategoryBtn = document.getElementById("sl-change-category");

    const accountBtn = document.getElementById("sl-account");
    if (accountBtn) {
      accountBtn.addEventListener("click", () => {
        // Placeholder account page route (safe default)
        location.href = "/account/";
      });
    }

    if (changeCategoryBtn) {
      changeCategoryBtn.addEventListener("click", () => {
        if (IS_CHECKOUT_PAGE) {
          // return flow to pick a category and come back
          location.href = "/upgrade/?return=checkout#categories";
        } else {
          location.href = "/upgrade/#categories";
        }
      });
    }

    // Wire checkout button (POST /api/create-checkout-session)
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
  }

  if (document && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", () => {
      init().catch(() => {});
      window.addEventListener("pageshow", (e) => {
        if (e && e.persisted) init().catch(() => {});
      });
    });
  } else {
    init().catch(() => {});
    window.addEventListener("pageshow", (e) => {
      if (e && e.persisted) init().catch(() => {});
    });
  }
})();
