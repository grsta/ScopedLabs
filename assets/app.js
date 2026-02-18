/* /assets/app.js
   ScopedLabs Upgrade controller (single-page /upgrade/).

   Responsibilities:
   - Keep selected category in sync: URL ?category=  <->  localStorage(sl_selected_category)
   - Update UI label(s) and render a selected-category preview card in the checkout section
   - Handle "Change Category" return flow (scroll back to #categories)
   - After magic-link login, scroll to #checkout if URL includes #checkout (or if we were already in checkout mode)
   - Wire checkout button: POST /api/create-checkout-session {category,email} -> redirect to returned url

   PATCH 0217:
   - Force checkout layout: left column (price + email + button) | right column (preview card)
     WITHOUT changing HTML/CSS files by building a wrapper at runtime.
*/

(() => {
  "use strict";

  const LS_KEY = "sl_selected_category";

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeSlug(v) {
    return (v || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function titleFromSlug(slug) {
    if (!slug) return "";
    return slug
      .split("-")
      .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : ""))
      .join(" ");
  }

  function readCategoryFromUrl() {
    try {
      const url = new URL(window.location.href);
      return safeSlug(url.searchParams.get("category"));
    } catch {
      return "";
    }
  }

  function writeCategoryToUrl(cat) {
    try {
      const url = new URL(window.location.href);
      if (cat) url.searchParams.set("category", cat);
      else url.searchParams.delete("category");
      // preserve hash (#checkout / #categories)
      history.replaceState({}, "", url.toString());
    } catch {}
  }

  function getCategory() {
    return readCategoryFromUrl() || safeSlug(localStorage.getItem(LS_KEY)) || "";
  }

  function setCategory(cat) {
    const slug = safeSlug(cat);
    if (slug) localStorage.setItem(LS_KEY, slug);
    else localStorage.removeItem(LS_KEY);
    writeCategoryToUrl(slug);
    return slug;
  }

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- category preview ----------
  const CATEGORY_COPY = {
    wireless: {
      desc: "Link planning, channel assumptions, and reliability headroom.",
      bullets: ["Link budget & margin checks", "Coverage + capacity planning", "Interference risk helpers"],
    },
    thermal: {
      desc: "Heat load planning, airflow assumptions, and environment constraints.",
      bullets: ["BTU/Watt conversion helpers", "Room/rack thermal planning", "Cooling headroom checks"],
    },
    "access-control": {
      desc: "Door + credential planning, strike/maglock basics, and power sizing.",
      bullets: ["Door hardware checklists", "Power + battery sizing", "Basic compliance reminders"],
    },
    power: {
      desc: "UPS sizing, runtime planning, load growth, and redundancy checks.",
      bullets: ["UPS runtime helpers", "Battery/VA/Watt conversions", "Load growth planning"],
    },
    network: {
      desc: "Bandwidth planning, oversubscription, and latency budgeting.",
      bullets: ["Bandwidth planner", "Oversubscription estimator", "Latency budget calculator"],
    },
    "video-storage": {
      desc: "Retention planning, bitrate assumptions, and storage overhead.",
      bullets: ["Storage calculator", "Retention helpers", "RAID impact estimates"],
    },
  };

  function renderSelectedPreview(mount, cat) {
    if (!mount) return;

    // Right-column card constraints
    mount.style.marginTop = "0px";
    mount.style.alignSelf = "start";
    mount.style.justifySelf = "end";
    mount.style.minWidth = "320px";

    mount.innerHTML = "";

    if (!cat) return;

    const copy = CATEGORY_COPY[cat] || {
      desc: `Unlock Pro tools for ${titleFromSlug(cat)} (current + future).`,
      bullets: ["All current Pro tools in this category", "All future Pro tools added here", "No renewals"],
    };

    const title = titleFromSlug(cat);

    const card = document.createElement("div");
    card.className = "card";
    card.style.background = "rgba(0,0,0,.16)";
    card.style.maxWidth = "440px";

    card.innerHTML = `
      <span class="pill pro" style="display:inline-flex; align-items:center; gap:.35rem;">
        <span aria-hidden="true">🔒</span>
        <span>Pro — Category Unlock</span>
      </span>
      <h3 style="margin-top:.6rem; font-size:1.25rem;">${title}</h3>
      <p class="muted" style="margin-top:.35rem;">${copy.desc}</p>
      <div class="muted" style="margin-top:.65rem; font-weight:700;">Includes examples like:</div>
      <ul class="muted" style="margin-top:.5rem; padding-left:1.1rem;">
        ${copy.bullets.map((b) => `<li>${b}</li>`).join("")}
      </ul>
      <div class="muted" style="margin-top:.65rem;">You’ll also receive future Pro tools added to <em>${title}</em>.</div>
    `;

    mount.appendChild(card);
  }

  // ---------- checkout layout (runtime wrapper; no HTML edits) ----------
  function ensureCheckoutTwoColumnLayout() {
    const card = $("#sl-checkout-card");
    if (!card) return;

    const mount =
      $("#sl-selected-category-preview") ||
      $("#selected-category-preview") ||
      $("#sl-selected-category-preview-checkout") ||
      null;

    if (!mount) return;

    // Already wrapped?
    if (card.querySelector('[data-sl="checkout-grid"]')) return;

    // Build a two-column layout wrapper
    const grid = document.createElement("div");
    grid.setAttribute("data-sl", "checkout-grid");

    // Use flex with wrap so mobile stays sane
    grid.style.display = "flex";
    grid.style.gap = "18px";
    grid.style.alignItems = "flex-start";
    grid.style.justifyContent = "space-between";
    grid.style.flexWrap = "wrap";

    const left = document.createElement("div");
    left.setAttribute("data-sl", "checkout-left");
    left.style.flex = "1 1 360px";
    left.style.minWidth = "280px";

    const right = document.createElement("div");
    right.setAttribute("data-sl", "checkout-right");
    right.style.flex = "0 0 440px";
    right.style.maxWidth = "440px";
    right.style.marginLeft = "auto";

    // Move children: everything except the preview mount goes left.
    // Then put the preview mount into the right column.
    const kids = Array.from(card.children);
    for (const k of kids) {
      if (k === mount) continue;
      left.appendChild(k);
    }
    right.appendChild(mount);

    // Replace card content with wrapper
    card.innerHTML = "";
    grid.appendChild(left);
    grid.appendChild(right);
    card.appendChild(grid);
  }

  // ---------- UI sync ----------
  function findSelectedCategoryEl() {
    return (
      $("#selected-category") ||
      $("#sl-selected-category") ||
      $("#sl-selected-cat") ||
      $('[data-role="selected-category"]')
    );
  }

  function syncCategoryUI(cat) {
    const labelEl = findSelectedCategoryEl();
    if (labelEl) labelEl.textContent = cat || "None selected";

    const h = $("#sl-checkout-title");
    if (h) h.textContent = cat ? `Unlock ${cat}` : "Unlock a category";

    // Ensure layout wrapper exists before rendering (so mount is in right column)
    ensureCheckoutTwoColumnLayout();

    const mount =
      $("#sl-selected-category-preview") ||
      $("#selected-category-preview") ||
      $("#sl-selected-category-preview-checkout") ||
      null;

    renderSelectedPreview(mount, cat);
  }

  // ---------- auth + checkout wiring ----------
  async function getSession(sb) {
    try {
      const res = await sb.auth.getSession();
      return res && res.data ? res.data.session : null;
    } catch {
      return null;
    }
  }

  function showSignedIn(email) {
    const card = $("#sl-checkout-card");
    const status = $("#sl-status");
    const signout = $("#sl-signout");

    if (card) card.style.display = "";
    if (status) status.textContent = email ? `Signed in as ${email}` : "Signed in.";
    if (signout) signout.style.display = "";

    // Re-apply layout after we unhide the card (prevents “preview drops below”)
    ensureCheckoutTwoColumnLayout();
  }

  function showSignedOut() {
    const card = $("#sl-checkout-card");
    const status = $("#sl-status");
    const signout = $("#sl-signout");

    if (card) card.style.display = "none";
    if (status) status.textContent = "";
    if (signout) signout.style.display = "none";
  }

  function wireCategoryPickers(sb) {
    const candidates = [
      ...$$("[data-category]"),
      ...$$('a[href*="/upgrade/?category="]'),
      ...$$('[id^="sl-unlock-"]'),
    ];

    const seen = new Set();
    for (const el of candidates) {
      if (seen.has(el)) continue;
      seen.add(el);

      el.addEventListener("click", async (e) => {
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

        setCategory(cat);
        syncCategoryUI(cat);

        const url = new URL(window.location.href);
        const wantsCheckout = url.hash === "#checkout" || url.searchParams.get("return") === "checkout";
        if (wantsCheckout && sb) {
          const s = await getSession(sb);
          if (s) {
            e.preventDefault();
            scrollToId("checkout");
          }
        }
      });
    }
  }

  async function wireCheckout(sb) {
    const checkoutBtn = $("#sl-checkout");
    const status = $("#sl-status");
    const emailInput = $("#sl-email");

    if (!checkoutBtn) return;

    checkoutBtn.addEventListener("click", async () => {
      const cat = getCategory();
      const s = await getSession(sb);

      if (!s) return;
      if (!cat) {
        if (status) status.textContent = "Choose a category to continue.";
        return;
      }

      checkoutBtn.disabled = true;
      if (status) status.textContent = "Opening Stripe Checkout…";

      const email = (s.user && s.user.email) || (emailInput ? emailInput.value.trim() : "");

      try {
        const r = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: cat, email }),
        });

        if (!r.ok) throw new Error("bad_status");
        const data = await r.json();
        if (!data || !data.url) throw new Error("no_url");

        window.location.href = data.url;
      } catch (err) {
        checkoutBtn.disabled = false;
        if (status) status.textContent = "Failed to start checkout";
        console.warn("[SL_APP] checkout error", err);
      }
    });
  }

  async function wireSignout(sb) {
    const btn = $("#sl-signout");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      try {
        await sb.auth.signOut();
      } catch {}
      localStorage.removeItem(LS_KEY);
      const url = new URL(window.location.href);
      url.searchParams.delete("category");
      url.hash = "#checkout";
      window.location.href = url.toString();
    });
  }

  function wireChangeCategoryButton() {
    const btn = $("#sl-change-category");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const url = new URL(window.location.href);
      url.searchParams.set("return", "checkout");
      url.hash = "#categories";
      window.location.href = url.toString();
    });
  }

  // ---------- init ----------
  async function init() {
    // 0) ensure checkout layout wrapper exists early (doesn't break anything if hidden)
    ensureCheckoutTwoColumnLayout();

    // 1) category sync
    const cat = setCategory(getCategory());
    syncCategoryUI(cat);

    // 2) change-category return flow
    wireChangeCategoryButton();

    // 3) auth readiness
    const auth = window.SL_AUTH || {};
    const sb = auth.sb || null;

    if (auth.ready && typeof auth.ready.then === "function") {
      try {
        await auth.ready;
      } catch {}
    }

    if (sb) {
      const s = await getSession(sb);
      if (s) showSignedIn(s.user && s.user.email);
      else showSignedOut();

      try {
        sb.auth.onAuthStateChange((_event, session) => {
          if (session) showSignedIn(session.user && session.user.email);
          else showSignedOut();
        });
      } catch {}

      wireCategoryPickers(sb);
      wireCheckout(sb);
      wireSignout(sb);
    } else {
      wireCategoryPickers(null);
    }

    if (window.location.hash === "#checkout") {
      setTimeout(() => scrollToId("checkout"), 150);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

