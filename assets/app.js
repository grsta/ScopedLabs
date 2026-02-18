/* /assets/app.js
   ScopedLabs Upgrade controller (single-page /upgrade/).

   Responsibilities:
   - Keep selected category in sync: URL ?category=  <->  localStorage(sl_selected_category)
   - Update UI label(s) and render a selected-category preview card in the checkout section
   - Handle "Change Category" return flow (scroll back to #categories)
   - After magic-link login, scroll to #checkout if URL includes #checkout (or if we were already in checkout mode)
   - Wire checkout button: POST /api/create-checkout-session {category,email} -> redirect to returned url
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

  function getUrlParam(name) {
    try {
      return new URL(location.href).searchParams.get(name);
    } catch {
      return null;
    }
  }

  function setUrlParam(name, value) {
    try {
      const u = new URL(location.href);
      if (!value) u.searchParams.delete(name);
      else u.searchParams.set(name, value);
      history.replaceState({}, "", u.toString());
    } catch {}
  }

  function scrollToHash(hash) {
    const id = (hash || "").replace(/^#/, "");
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- category copy ----------
  const CATEGORY_COPY = {
    thermal: {
      desc: "Heat load planning, airflow assumptions, and environment constraints.",
      bullets: ["BTU/Watt conversion helpers", "Room/rack thermal planning", "Cooling headroom checks"],
    },
    wireless: {
      desc: "Link planning, channel assumptions, and reliability headroom.",
      bullets: ["Link budget & margin checks", "Coverage + capacity planning", "Interference risk helpers"],
    },
    power: {
      desc: "UPS sizing, runtime margin, redundancy, and failure planning.",
      bullets: ["Load growth simulation", "Redundancy / N+1 impact modeling", "Worst-case runtime stress tests"],
    },
    network: {
      desc: "Bandwidth planning, latency budgets, and congestion headroom.",
      bullets: ["Oversubscription analysis", "Latency budget calculators", "Uplink capacity planning"],
    },
    "video-storage": {
      desc: "Retention planning, storage survivability, and failure behavior.",
      bullets: ["Advanced storage scenarios", "RAID impact + rebuild risk", "Retention survivability modeling"],
    },
    compute: {
      desc: "Server sizing, workload estimates, and resource headroom planning.",
      bullets: ["Capacity planning (CPU/RAM/IO)", "Growth projections", "Performance vs cost trade-offs"],
    },
    infrastructure: {
      desc: "Power chain planning, rack/room constraints, and deployment readiness checks.",
      bullets: ["Rack density & load planning", "Constraint checks", "Failure impact planning"],
    },
    performance: {
      desc: "Sizing targets, efficiency assumptions, and stress-test planning tools.",
      bullets: ["Baseline vs peak modeling", "Headroom targets", "Bottleneck risk checks"],
    },
    "physical-security": {
      desc: "Coverage planning, deployment assumptions, and survivability checks.",
      bullets: ["Coverage + risk planners", "Runtime/storage survivability", "Readiness scoring"],
    },
    "access-control": {
      desc: "Door hardware, credential formats, PoE power budgets, and deployment planning.",
      bullets: ["Controller sizing", "Power/cabling headroom", "Fail-safe impact modeling"],
    },
  };

  // ---------- category state ----------
  function getCategory() {
    const fromUrl = safeSlug(getUrlParam("category"));
    if (fromUrl) return fromUrl;

    try {
      const fromLs = safeSlug(localStorage.getItem(LS_KEY));
      if (fromLs) return fromLs;
    } catch {}

    return "";
  }

  function setCategory(cat) {
    const slug = safeSlug(cat);
    try {
      if (slug) localStorage.setItem(LS_KEY, slug);
      else localStorage.removeItem(LS_KEY);
    } catch {}

    if (slug) setUrlParam("category", slug);
    return slug;
  }

  function findSelectedCategoryEl() {
    return $("#selected-category") || $("#sl-category-pill") || $("#sl-selected-category");
  }

  // ---------- preview renderer ----------
  function renderSelectedPreview(mount, cat) {
    if (!mount) return;

    // Align top-right
    mount.style.marginTop = "0px";
    mount.style.alignSelf = "start";
    mount.style.justifySelf = "end";
    mount.style.display = "";

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
      <span class="pill pro" style="display:inline-flex; align-items:center; gap:.45rem;">
        🔒 <span>Pro — Category Unlock</span>
      </span>
      <h3 style="margin-top:.6rem;">${escapeHtml(title)}</h3>
      <p class="muted">${escapeHtml(copy.desc)}</p>

      <div class="muted" style="font-size:.95rem; margin-top:.65rem;">
        <strong>Includes examples like:</strong>
      </div>
      <ul class="muted" style="margin:.5rem 0 0 1.15rem;">
        ${(copy.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
      </ul>

      <div class="muted" style="font-size:.85rem; margin-top:.85rem;">
        You’ll also receive future Pro tools added to <em>${escapeHtml(title)}</em>.
      </div>
    `;

    mount.appendChild(card);
  }

  function escapeHtml(s) {
    return (s || "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // NEW: ensure the preview mount exists (creates it if HTML doesn’t have it)
  function ensurePreviewMount() {
    // Prefer existing mounts (upgrade page + any legacy ids)
    let mount =
      $("#sl-selected-category-preview") ||
      $("#selected-category-preview") ||
      $("#sl-selected-category-preview-checkout") ||
      null;

    if (mount) {
      mount.style.display = "";
      return mount;
    }

    // If missing, create it inside the checkout grid/card.
    const host =
      $("#sl-checkout-grid") || // preferred (our new upgrade HTML)
      $("#checkout-grid") ||
      $("#checkout") ||
      null;

    if (!host) return null;

    mount = document.createElement("div");
    mount.id = "sl-selected-category-preview";
    mount.style.marginTop = "0px";
    mount.style.maxWidth = "440px";
    mount.style.width = "100%";
    mount.style.alignSelf = "start";
    mount.style.justifySelf = "end";

    host.appendChild(mount);
    return mount;
  }

  function syncCategoryUI(cat) {
    const labelEl = findSelectedCategoryEl();
    if (labelEl) labelEl.textContent = cat || "None selected";

    // Title tweak
    const h = $("#sl-checkout-title");
    if (h) h.textContent = cat ? `Unlock ${cat}` : "Unlock a category";

    // Preview card (self-healing)
    const mount = ensurePreviewMount();
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
  }

  function showSignedOut() {
    const card = $("#sl-checkout-card");
    const status = $("#sl-status");
    const signout = $("#sl-signout");

    if (card) card.style.display = "none";
    if (status) status.textContent = "";
    if (signout) signout.style.display = "none";
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  function wireCheckoutButton(sb) {
    const btn = $("#sl-checkout");
    const status = $("#sl-status");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const currentCategory = getCategory();
      const session = sb ? await getSession(sb) : null;

      if (!session || !session.user) return;
      if (!currentCategory) return;

      btn.disabled = true;
      if (status) status.textContent = "Opening Stripe Checkout…";

      try {
        const data = await postJson("/api/create-checkout-session", {
          category: currentCategory,
          email: session.user.email,
        });

        if (data && data.url) {
          location.href = data.url;
          return;
        }

        throw new Error("No checkout url returned");
      } catch (e) {
        if (status) status.textContent = "Failed to start checkout";
        btn.disabled = false;
      }
    });
  }

  function wireChangeCategoryButton() {
    const btn = $("#sl-change-category");
    if (!btn) return;

    btn.addEventListener("click", () => {
      // preserve return flow to categories on upgrade page
      try {
        const u = new URL(location.href);
        u.searchParams.set("return", "checkout");
        u.hash = "#categories";
        location.href = u.toString();
      } catch {
        location.href = "/upgrade/?return=checkout#categories";
      }
    });
  }

  function wireCategoryButtons() {
    // Any element with data-category or id sl-unlock-<cat>
    const btns = $$("[data-category], a[href*='?category='], button[id^='sl-unlock-']");
    btns.forEach((el) => {
      const cat =
        safeSlug(el.getAttribute("data-category")) ||
        safeSlug((el.id || "").replace(/^sl-unlock-/, "")) ||
        safeSlug(getCategoryFromHref(el.getAttribute("href")));

      if (!cat) return;

      el.addEventListener("click", (e) => {
        // Let normal nav happen, but make sure we persist the category
        setCategory(cat);
      });
    });
  }

  function getCategoryFromHref(href) {
    if (!href) return "";
    try {
      const u = new URL(href, location.origin);
      return u.searchParams.get("category") || "";
    } catch {
      return "";
    }
  }

  async function goToCheckoutFor(cat, sessionExists) {
    const c = setCategory(cat);

    if (sessionExists) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(c);
    } else {
      location.href = "/upgrade/?category=" + encodeURIComponent(c) + "#checkout";
    }
  }

  function isCheckoutPage() {
    return location.pathname.startsWith("/upgrade/checkout");
  }

  async function handleReturnFlow(sb) {
    const returnMode = safeSlug(getUrlParam("return"));
    const currentCategory = getCategory();
    const session = sb ? await getSession(sb) : null;

    // If we’re on upgrade and return=checkout and already have session + category -> go straight to checkout page
    if (!isCheckoutPage() && returnMode === "checkout" && session && currentCategory) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(currentCategory);
      return true;
    }

    // If we’re on checkout page and no session -> kick back to upgrade checkout section
    if (isCheckoutPage() && !session) {
      location.href = "/upgrade/?category=" + encodeURIComponent(currentCategory || "") + "#checkout";
      return true;
    }

    return false;
  }

  async function init() {
    // 1) category sync
    const cat = setCategory(getCategory());
    syncCategoryUI(cat);

    // 2) change-category return flow
    wireChangeCategoryButton();

    // 3) wire category buttons (persist selection)
    wireCategoryButtons();

    // 4) auth readiness
    const auth = window.SL_AUTH || {};
    const sb = auth.sb || null;

    if (auth.ready && typeof auth.ready.then === "function") {
      try {
        await auth.ready;
      } catch {}
    }

    if (sb) {
      // return flow may navigate away
      const navigated = await handleReturnFlow(sb);
      if (navigated) return;

      // reflect initial signed-in state
      const s = await getSession(sb);
      if (s) showSignedIn(s.user && s.user.email);
      else showSignedOut();

      // keep UI in sync on auth state changes
      try {
        sb.auth.onAuthStateChange((_event, session) => {
          if (session) showSignedIn(session.user && session.user.email);
          else showSignedOut();
        });
      } catch {}

      // sign out button (if present)
      const signout = $("#sl-signout");
      if (signout) {
        signout.addEventListener("click", async () => {
          try {
            await sb.auth.signOut();
          } catch {}
          try {
            localStorage.removeItem(LS_KEY);
          } catch {}
          location.href = "/upgrade/#checkout";
        });
      }

      // checkout wiring
      wireCheckoutButton(sb);

      // If on upgrade page and user clicks a category unlock while signed in, go straight to checkout page
      const unlockedBtns = $$("[data-category], button[id^='sl-unlock-']");
      unlockedBtns.forEach((btn) => {
        const cat =
          safeSlug(btn.getAttribute("data-category")) ||
          safeSlug((btn.id || "").replace(/^sl-unlock-/, ""));
        if (!cat) return;

        btn.addEventListener("click", async (e) => {
          // Only take over if we’re on /upgrade and signed in
          if (isCheckoutPage()) return;

          const s = await getSession(sb);
          if (!s) return;

          e.preventDefault();
          await goToCheckoutFor(cat, true);
        });
      });
    }

    // 5) If URL has #checkout, scroll there
    if (location.hash === "#checkout") {
      setTimeout(() => scrollToHash("#checkout"), 50);
    }
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      init().catch(() => {});
    });
  } else {
    init().catch(() => {});
  }
})();

