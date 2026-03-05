/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller (stable).

   Fixes:
   - Selected category pill updates reliably on /upgrade/ and /upgrade/checkout/
   - Clicking a category card on /upgrade/ scrolls back to #checkout
   - Checkout preview card is auto-rendered into #sl-selected-category-preview-checkout (if empty)
   - "Change category" on checkout navigates to /upgrade/?return=checkout#categories (NO category param)
   - Safe fallback category meta (bullets/desc) if stripe-map is missing fields
*/

(() => {
  "use strict";

  const PATH = location.pathname || "/";
  const IS_CHECKOUT_PAGE = PATH.startsWith("/upgrade/checkout");
  const STORE_KEY = "sl_selected_category";

  const els = {
    // shared
    status: document.getElementById("sl-status"),
    signedIn: document.getElementById("sl-signedin"),

    // upgrade page (top card)
    categoryPillUpgrade: document.getElementById("sl-category-pill"),
    selectedLabelUpgrade: document.getElementById("sl-selected-category-label"),
    continueBtn: document.getElementById("sl-continue"),
    sendLinkBtn: document.getElementById("sl-sendlink"),
    emailInput: document.getElementById("sl-email"),
    signOutBtn: document.getElementById("sl-signout"),
    accountBtn: document.getElementById("sl-account"),

    // upgrade preview card
    previewTitleUpgrade: document.getElementById("sl-preview-title"),
    previewDescUpgrade: document.getElementById("sl-preview-desc"),
    previewBulletsUpgrade: document.getElementById("sl-preview-bullets"),
    previewFootUpgrade: document.getElementById("sl-preview-foot"),

    // checkout page (top card)
    categoryPillCheckout: document.getElementById("sl-selected-category"),
    selectedLabelCheckout: document.getElementById("sl-selected-category-label"),
    checkoutBtn: document.getElementById("sl-checkout"),
    changeCatBtnCheckout: document.getElementById("sl-change-category"),
    mustSignin: document.getElementById("sl-must-signin"),

    // checkout preview container (may be empty in HTML)
    checkoutPreviewMount: document.getElementById("sl-selected-category-preview-checkout"),
  };

  // ---------- utilities ----------
  const qs = () => new URLSearchParams(location.search || "");

  function cleanSlug(x) {
    if (!x) return "";
    return String(x).trim().toLowerCase();
  }

  function getCategoryFromUrl() {
    return cleanSlug(qs().get("category") || "");
  }

  function getReturnMode() {
    return cleanSlug(qs().get("return") || "");
  }

  function getStoredCategory() {
    return cleanSlug(localStorage.getItem(STORE_KEY) || "");
  }

  function setStoredCategory(cat) {
    if (cat) localStorage.setItem(STORE_KEY, cat);
    else localStorage.removeItem(STORE_KEY);
  }

  function setStatus(msg) {
    if (els.status) els.status.textContent = msg || "";
  }

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      location.hash = "#" + id;
    }
  }

  // ---------- category meta ----------
  const FALLBACK_META = {
    "access-control": {
      label: "Access Control",
      desc: "Door hardware, credential formats, PoE power budgets, and deployment planning.",
      bullets: [
        "Controller sizing + expansion planning",
        "Power & cabling headroom checks",
        "Fail-safe / fail-secure impact modeling",
      ],
      foot: "You’ll also receive future Pro tools added to Access Control.",
    },
    compute: {
      label: "Compute",
      desc: "Server sizing, workload estimates, and resource headroom planning.",
      bullets: [
        "Capacity planning (CPU/RAM/IO)",
        "Growth projections + utilization targets",
        "Performance vs. cost trade-offs",
      ],
      foot: "You’ll also receive future Pro tools added to Compute.",
    },
    infrastructure: {
      label: "Infrastructure",
      desc: "Power chain planning, rack/room layout, and reliability baselines.",
      bullets: [
        "Rack power + UPS planning",
        "Cooling assumptions + load estimates",
        "Baseline redundancy planning",
      ],
      foot: "You’ll also receive future Pro tools added to Infrastructure.",
    },
    network: {
      label: "Network",
      desc: "Bandwidth planning, latency budgets, and topology checks.",
      bullets: [
        "Bandwidth planner + contention",
        "Latency budget breakdown",
        "Oversubscription sanity checks",
      ],
      foot: "You’ll also receive future Pro tools added to Network.",
    },
    "video-storage": {
      label: "Video Storage",
      desc: "Retention, bitrate, and storage impact planning.",
      bullets: [
        "Retention & capacity planning",
        "Bitrate assumptions + overhead",
        "RAID impact + usable storage",
      ],
      foot: "You’ll also receive future Pro tools added to Video Storage.",
    },
    wireless: {
      label: "Wireless",
      desc: "RF sanity checks, throughput planning, and link budgeting helpers.",
      bullets: [
        "Link budget + path loss sanity",
        "Throughput estimation + SNR targets",
        "Roaming thresholds + stability checks",
      ],
      foot: "You’ll also receive future Pro tools added to Wireless.",
    },
    thermal: {
      label: "Thermal",
      desc: "Thermal camera coverage planning and scenario modeling.",
      bullets: [
        "Detection / recognition ranges",
        "Scene assumptions + targets",
        "Lens + pixel density checks",
      ],
      foot: "You’ll also receive future Pro tools added to Thermal.",
    },
    "physical-security": {
      label: "Physical Security",
      desc: "Coverage planning, system design, and reliability checks.",
      bullets: [
        "System sizing + power checks",
        "Recording/storage planning",
        "Design trade-offs",
      ],
      foot: "You’ll also receive future Pro tools added to Physical Security.",
    },
    performance: {
      label: "Performance",
      desc: "Throughput modeling, bottleneck checks, and efficiency planning.",
      bullets: [
        "Workload bottleneck mapping",
        "Headroom + utilization targets",
        "Cost/perf trade-offs",
      ],
      foot: "You’ll also receive future Pro tools added to Performance.",
    },
  };

  function getMeta(cat) {
    const map = (window.SCOPEDLABS_STRIPE && window.SCOPEDLABS_STRIPE.map) || window.SCOPEDLABS_STRIPE || null;

    // You currently use window.SCOPEDLABS_STRIPE = { slug: {label, productId, priceId, unlockKey} }
    // Some builds may not include desc/bullets/foot; we fill from fallback.
    const fromMap = map && cat && map[cat] ? map[cat] : null;
    const fb = cat && FALLBACK_META[cat] ? FALLBACK_META[cat] : null;

    const label = (fromMap && fromMap.label) || (fb && fb.label) || (cat ? cat : "Category");
    const desc = (fromMap && fromMap.desc) || (fb && fb.desc) || "";
    const bullets = (fromMap && Array.isArray(fromMap.bullets) && fromMap.bullets.length ? fromMap.bullets : null) || (fb && fb.bullets) || [];
    const foot = (fromMap && fromMap.foot) || (fb && fb.foot) || (cat ? `You’ll also receive future Pro tools added to ${label}.` : "");

    return { label, desc, bullets, foot };
  }

  // ---------- UI apply ----------
  function applyCategoryUI(cat) {
    const shown = cat || "None";

    // pills/labels
    if (els.categoryPillUpgrade) els.categoryPillUpgrade.textContent = shown;
    if (els.selectedLabelUpgrade) els.selectedLabelUpgrade.textContent = shown;

    if (els.categoryPillCheckout) els.categoryPillCheckout.textContent = shown;
    if (els.selectedLabelCheckout) els.selectedLabelCheckout.textContent = shown;

    // upgrade preview card
    if (els.previewTitleUpgrade || els.previewDescUpgrade || els.previewBulletsUpgrade || els.previewFootUpgrade) {
      const meta = getMeta(cat);
      if (els.previewTitleUpgrade) els.previewTitleUpgrade.textContent = meta.label || "Category";
      if (els.previewDescUpgrade) els.previewDescUpgrade.textContent = meta.desc || "";
      if (els.previewFootUpgrade) els.previewFootUpgrade.textContent = meta.foot || "";
      if (els.previewBulletsUpgrade) {
        els.previewBulletsUpgrade.innerHTML = "";
        (meta.bullets || []).forEach((b) => {
          const li = document.createElement("li");
          li.textContent = b;
          els.previewBulletsUpgrade.appendChild(li);
        });
      }
    }

    // checkout preview card: render markup if mount exists and is empty
    if (els.checkoutPreviewMount) {
      const mount = els.checkoutPreviewMount;

      // If mount is empty, build a standard preview card body with known IDs.
      if (!mount.querySelector("[data-sl-preview-built='1']")) {
        mount.innerHTML = `
          <div data-sl-preview-built="1" class="card" style="height:100%;">
            <div class="pill" style="margin-bottom:12px;">Preview</div>
            <h3 style="margin-top:0;"><span id="sl-preview-title-checkout">Category</span></h3>
            <p class="muted" id="sl-preview-desc-checkout" style="margin:0 0 10px 0;">Includes examples like:</p>
            <ul class="muted" id="sl-preview-bullets-checkout" style="margin-top:10px;"></ul>
            <p class="muted" id="sl-preview-foot-checkout" style="margin-bottom:0;"></p>
          </div>
        `;
      }

      const meta = getMeta(cat);
      const t = mount.querySelector("#sl-preview-title-checkout");
      const d = mount.querySelector("#sl-preview-desc-checkout");
      const ul = mount.querySelector("#sl-preview-bullets-checkout");
      const f = mount.querySelector("#sl-preview-foot-checkout");

      if (t) t.textContent = meta.label || "Category";
      if (d) d.textContent = meta.desc ? `Includes examples like:` : `Includes examples like:`;
      if (f) f.textContent = meta.foot || "";

      if (ul) {
        ul.innerHTML = "";
        (meta.bullets || []).forEach((b) => {
          const li = document.createElement("li");
          li.textContent = b;
          ul.appendChild(li);
        });
      }
    }
  }

  function setCategory(cat, { updateUrl = true, scrollCheckout = false } = {}) {
    const c = cleanSlug(cat);
    setStoredCategory(c);

    if (updateUrl) {
      const u = new URL(location.href);
      if (c) u.searchParams.set("category", c);
      else u.searchParams.delete("category");
      history.replaceState({}, "", u.toString());
    }

    applyCategoryUI(c);

    if (scrollCheckout) scrollToId("checkout");
  }

  function resolveInitialCategory() {
    const fromUrl = getCategoryFromUrl();
    const fromStore = getStoredCategory();
    return fromUrl || fromStore || "";
  }

  // ---------- bindings ----------
  function bindUpgradeCategoryCards() {
    // In your HTML, each card uses class "upgrade-card" and the slug is the card's id
    const cards = Array.from(document.querySelectorAll(".upgrade-card[id]"));
    if (!cards.length) return;

    cards.forEach((card) => {
      const cat = cleanSlug(card.id);
      if (!cat) return;

      card.addEventListener("click", (e) => {
        // allow clicks on buttons/links to still work, but we’ll also enforce the behavior
        // If it’s an external nav click, don’t interfere.
        const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (a && a.getAttribute("href") && a.getAttribute("href").startsWith("http")) return;

        // keep user on upgrade page, update selection, scroll to checkout card
        setCategory(cat, { updateUrl: true, scrollCheckout: true });

        // If there is a return=checkout intent AND user is signed in, app.js later can send them to checkout when they hit Continue.
        // We do NOT auto-redirect here (your chosen flow keeps the explicit Continue button).
        e.preventDefault();
      });
    });
  }

  function bindCheckoutChangeCategory() {
    if (!els.changeCatBtnCheckout) return;

    els.changeCatBtnCheckout.addEventListener("click", (e) => {
      e.preventDefault();

      // IMPORTANT: do NOT include category param, or return logic will bounce back.
      // Also clear stored selection so "None selected" is honest until user picks again.
      setStoredCategory("");

      const target = "/upgrade/?return=checkout#categories";
      location.href = target;
    });
  }

  // ---------- auth & signout ----------
  async function getSupabase() {
    // auth.js exposes window.SL_AUTH = { sb, ready }
    const SL = window.SL_AUTH;
    if (!SL || !SL.sb) return null;
    if (SL.ready && typeof SL.ready.then === "function") {
      try {
        await SL.ready;
      } catch {}
    }
    return SL.sb || null;
  }

  async function getSession(sb) {
    if (!sb) return null;
    try {
      const res = await sb.auth.getSession();
      return res && res.data && res.data.session ? res.data.session : null;
    } catch {
      return null;
    }
  }

  function setSignedInUI(session) {
    const email = session && session.user && session.user.email ? session.user.email : "";
    if (els.signedIn) els.signedIn.textContent = email ? `Signed in as ${email}` : "Not signed in";

    // Optional: hide the "must sign in" banner on checkout when signed in
    if (els.mustSignin) {
      els.mustSignin.style.display = email ? "none" : "";
    }
  }

  async function wireSignOut(sb) {
    if (!els.signOutBtn) return;

    els.signOutBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      // Stop any confusing stale UI immediately.
      setSignedInUI(null);
      setStatus("Signing out…");

      // Always clear local selection when signing out.
      setStoredCategory("");

      // Try a local-only sign out to reduce multi-tab lock drama.
      try {
        if (sb) await sb.auth.signOut({ scope: "local" });
      } catch {
        // even if this fails due to lock, we still hard refresh to reconcile UI
      }

      // Hard refresh to clear any cached auth state + re-run auth.js/app.js cleanly
      const base = IS_CHECKOUT_PAGE ? "/upgrade/#checkout" : "/upgrade/#checkout";
      location.replace(base);
      // If replace is blocked somehow, fallback:
      setTimeout(() => location.reload(), 250);
    });
  }

  // ---------- checkout button (if present on checkout page) ----------
  async function wireCheckoutButton(sb, session, category) {
    if (!els.checkoutBtn) return;

    els.checkoutBtn.disabled = !(session && category);

    els.checkoutBtn.addEventListener("click", async () => {
      const s = await getSession(sb);
      const cat = resolveInitialCategory();

      if (!s || !cat) {
        setStatus(!cat ? "Choose a category to continue." : "You must be signed in to continue.");
        els.checkoutBtn.disabled = true;
        return;
      }

      els.checkoutBtn.disabled = true;
      setStatus("Opening Stripe Checkout…");

      try {
        const r = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: cat,
            email: s.user.email,
          }),
        });

        const j = await r.json().catch(() => null);

        if (!r.ok || !j || !j.url) {
          els.checkoutBtn.disabled = false;
          setStatus("Failed to start checkout");
          return;
        }

        location.href = j.url;
      } catch {
        els.checkoutBtn.disabled = false;
        setStatus("Failed to start checkout");
      }
    });
  }

  // ---------- main ----------
  (async function main() {
    // Apply category immediately (do not wait on auth)
    const initialCat = resolveInitialCategory();
    setCategory(initialCat, { updateUrl: true, scrollCheckout: false });

    // Upgrade page: clicking cards should scroll up to checkout
    if (!IS_CHECKOUT_PAGE) {
      bindUpgradeCategoryCards();
      // If you landed with #checkout or want to force scroll after selection, the card click handler does it.
    }

    // Checkout page: change category should NOT carry category param (prevents bounce)
    if (IS_CHECKOUT_PAGE) {
      bindCheckoutChangeCategory();
    }

    // Now deal with auth
    const sb = await getSupabase();
    const session = await getSession(sb);

    setSignedInUI(session);

    // If return=checkout is set AND we’re on upgrade page at #categories, do NOT auto redirect.
    // Your flow is: pick category (scroll), then Continue to checkout.
    // So we only auto-jump back to checkout if user is already ON checkout page.
    const returnMode = getReturnMode();

    // Wire sign-out (refresh/replace after sign out)
    await wireSignOut(sb);

    // Checkout button wiring (only matters on checkout page)
    if (IS_CHECKOUT_PAGE) {
      await wireCheckoutButton(sb, session, initialCat);
    }

    // If you want: when coming from checkout to upgrade with return=checkout, force view categories
    if (!IS_CHECKOUT_PAGE && returnMode === "checkout") {
      // Ensure they actually see the category grid
      if (location.hash !== "#categories") {
        // don’t fight the user if they’re already at #checkout
        // but if no hash, put them on categories
        if (!location.hash) history.replaceState({}, "", "/upgrade/?return=checkout#categories");
      }
    }
  })();
})();