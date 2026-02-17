/* ScopedLabs Upgrade App (selector-safe + preview card)
   - Renders a “Selected category” preview card to the RIGHT of checkout card
   - Reads ?category= from URL (and localStorage fallback)
   - Highlights the selected category card in the grid (best effort)
   - Enables checkout only if: signed in AND category selected
*/

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  // ---------- CSS injection (layout + highlight) ----------
  function ensurePreviewStyles() {
    if (document.getElementById("sl-preview-css")) return;

    const css = `
      /* Checkout two-column row */
      .sl-checkout-row {
        display: grid;
        grid-template-columns: 1.2fr .8fr;
        gap: 1rem;
        align-items: start;
      }
      @media (max-width: 980px) {
        .sl-checkout-row { grid-template-columns: 1fr; }
      }

      /* Preview card uses same “card” look, but a bit tighter */
      #selected-category-preview .card,
      .sl-selected-preview-card.card {
        padding: 1rem;
      }

      /* Selected card highlight (choose grid) */
      .is-selected {
        outline: 2px solid rgba(46, 255, 132, .35);
        box-shadow: 0 0 0 1px rgba(46, 255, 132, .18), 0 10px 30px rgba(0,0,0,.35);
      }
    `.trim();

    const style = document.createElement("style");
    style.id = "sl-preview-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------- Robust element finders ----------
  function findSelectedCategoryEl() {
    return (
      $("#selected-category") ||
      $("#selectedCategory") ||
      document.querySelector("[data-selected-category]") ||
      document.querySelector(".selected-category")
    );
  }

  function findCheckoutBtn() {
    return (
      $("#btn-checkout") ||
      $("#checkout-btn") ||
      $("#checkoutBtn") ||
      $("#sl-checkout") ||
      document.querySelector("[data-checkout]")
    );
  }

  function findCheckoutStatusEl() {
    return (
      $("#checkout-status") ||
      $("#checkoutStatus") ||
      $("#sl-status") ||
      document.querySelector("[data-checkout-status]")
    );
  }

  function setCheckoutStatus(msg, isError = false) {
    const s = findCheckoutStatusEl();
    if (!s) return;
    s.textContent = msg || "";
    s.classList.toggle("error", !!isError);
  }

  // ---------- Category helpers ----------
  function getCategoryFromUrl() {
    const url = new URL(window.location.href);
    const c = (url.searchParams.get("category") || "").trim().toLowerCase();
    if (c) {
      try { localStorage.setItem("sl_last_category", c); } catch (_) {}
      return c;
    }
    try {
      return (localStorage.getItem("sl_last_category") || "").trim().toLowerCase();
    } catch (_) {
      return "";
    }
  }

  function setCategoryInUrl(category) {
    const url = new URL(window.location.href);
    if (category) url.searchParams.set("category", category);
    else url.searchParams.delete("category");
    window.history.replaceState({}, "", url.toString());
    try { localStorage.setItem("sl_last_category", category || ""); } catch (_) {}
  }

  function reflectCategory(category) {
    const el = findSelectedCategoryEl();
    if (el) {
      el.textContent = category ? category : "None selected";
      el.classList.toggle("muted", !category);
      return;
    }

    // fallback: replace any literal "None selected" text node
    const fallback = Array.from(document.querySelectorAll("button, span, div, p, a"))
      .find((n) => (n.textContent || "").trim() === "None selected");

    if (fallback) {
      fallback.textContent = category ? category : "None selected";
      fallback.classList.toggle("muted", !category);
    }
  }

  // ---------- Find the matching category card (robust) ----------
  function findCategoryCard(category) {
    if (!category) return null;
    const cat = String(category).trim().toLowerCase();
    if (!cat) return null;

    // 1) Preferred: data-category on the CARD
    let el =
      document.querySelector(`[data-category="${cat}"]`) ||
      document.querySelector(`.sl-category-card[data-category="${cat}"]`);
    if (el) return el;

    // 2) If your card IDs match the slug (ex: id="access-control")
    el = document.getElementById(cat);
    if (el) return el;

    // 3) If cards use upgrade-card pattern (ex: <div class="card upgrade-card" id="access-control">)
    el = document.querySelector(`.upgrade-card#${CSS.escape(cat)}`);
    if (el) return el;

    // 4) Scan cards for a CTA link containing ?category=<cat>
    const cards = Array.from(document.querySelectorAll(".upgrade-card, .card"));
    for (const card of cards) {
      const a = card.querySelector('a[href*="category="], a[href*="/upgrade/?"], a[href*="/upgrade?"]');
      if (!a) continue;
      try {
        const href = a.getAttribute("href") || "";
        // handle relative hrefs
        const u = new URL(href, window.location.origin);
        const c = (u.searchParams.get("category") || "").trim().toLowerCase();
        if (c === cat) return card;
      } catch (_) {}
    }

    return null;
  }

  function clearSelectedCard() {
    document.querySelectorAll(".is-selected").forEach(el => el.classList.remove("is-selected"));
  }

  function syncSelectedCategoryUI(category) {
    clearSelectedCard();
    const card = findCategoryCard(category);
    if (card) card.classList.add("is-selected");
    renderSelectedCategoryPreview(card, category);
  }

  // ---------- Move preview mount to the RIGHT of checkout card ----------
  function ensureCheckoutRowLayout() {
    ensurePreviewStyles();

    const checkoutSection = $("#checkout");
    if (!checkoutSection) return;

    // The main checkout card = first direct .card inside #checkout (best-effort)
    const mainCard =
      checkoutSection.querySelector(":scope > .card") ||
      checkoutSection.querySelector(".card");

    if (!mainCard) return;

    // Preview mount may currently be inside main card; we will move it
    let previewMount = $("#selected-category-preview");
    if (!previewMount) {
      // create one if missing
      previewMount = document.createElement("div");
      previewMount.id = "selected-category-preview";
    }

    // If already wrapped, skip
    let row = checkoutSection.querySelector(":scope > .sl-checkout-row");
    if (!row) {
      row = document.createElement("div");
      row.className = "sl-checkout-row";
      checkoutSection.insertBefore(row, mainCard);
    }

    // Ensure row contains mainCard and previewMount as siblings
    if (mainCard.parentElement !== row) row.appendChild(mainCard);
    if (previewMount.parentElement !== row) row.appendChild(previewMount);
  }

  // ---------- Render preview card ----------
  function renderSelectedCategoryPreview(cardEl, category) {
    ensureCheckoutRowLayout();

    const mount = $("#selected-category-preview");
    if (!mount) return;

    if (!category) {
      mount.innerHTML = "";
      return;
    }

    if (!cardEl) {
      mount.innerHTML = `
        <div class="card sl-selected-preview-card">
          <span class="pill">Selected</span>
          <h3 style="margin-top:.6rem;">${escapeHtml(category)}</h3>
          <p class="muted" style="margin-top:.35rem;">
            (Couldn’t find the matching category card to preview — but this is the category that will be unlocked.)
          </p>
        </div>
      `;
      return;
    }

    const clone = cardEl.cloneNode(true);

    // Remove selection highlight on clone
    clone.classList.remove("is-selected");

    // Strip CTA buttons/links inside the preview
    clone.querySelectorAll(".upgrade-cta").forEach(n => n.remove());
    clone.querySelectorAll("a, button").forEach(n => n.remove());

    // Force “card” class for consistent styling
    if (!clone.classList.contains("card")) clone.classList.add("card");

    mount.innerHTML = `
      <div class="muted" style="margin:.25rem 0 .5rem;">
        You are unlocking:
      </div>
    `;
    mount.appendChild(clone);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ---------- Auth / gate ----------
  async function isSignedIn() {
    const sb = window.SL_AUTH?.sb;
    if (!sb) return false;
    try {
      const { data } = await sb.auth.getSession();
      return !!data?.session?.user;
    } catch (_e) {
      return false;
    }
  }

  async function createCheckoutSession(category) {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category })
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Checkout session failed (${res.status}): ${txt}`);
    }

    const data = await res.json();
    if (!data || !data.url) throw new Error("Checkout session did not return a URL.");
    return data.url;
  }

  async function refreshGateState() {
    const btn = findCheckoutBtn();
    const category = getCategoryFromUrl();

    reflectCategory(category);
    syncSelectedCategoryUI(category);

    if (!btn) return;

    btn.disabled = true;

    const signedIn = await isSignedIn();

    if (!category) {
      setCheckoutStatus("Select a category to continue.");
      return;
    }
    if (!signedIn) {
      setCheckoutStatus("Sign in to unlock Pro access.");
      return;
    }

    setCheckoutStatus("");
    btn.disabled = false;
  }

  // ---------- Wire category selection ----------
  function wireCategoryButtons() {
    // Buttons/links that have data-category
    const buttons = document.querySelectorAll("[data-category]");
    if (buttons && buttons.length) {
      buttons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          // allow normal anchor behavior only if you want it
          // e.preventDefault();
          const category = (btn.getAttribute("data-category") || "").trim().toLowerCase();
          if (!category) return;
          setCategoryInUrl(category);
          refreshGateState();

          const checkout = $("#checkout");
          if (checkout) checkout.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }

    // ALSO: if your CTA links look like /upgrade/?category=xxx#checkout, capture click and persist
    const upgradeLinks = document.querySelectorAll('a[href*="/upgrade"], a[href*="category="]');
    upgradeLinks.forEach((a) => {
      a.addEventListener("click", () => {
        try {
          const u = new URL(a.getAttribute("href") || "", window.location.origin);
          const c = (u.searchParams.get("category") || "").trim().toLowerCase();
          if (c) setCategoryInUrl(c);
        } catch (_) {}
      });
    });
  }

  function wireCheckoutButton() {
    const btn = findCheckoutBtn();
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const category = getCategoryFromUrl();
      if (!category) {
        setCheckoutStatus("Select a category first.", true);
        return;
      }

      btn.disabled = true;
      setCheckoutStatus("Redirecting to checkout…");

      try {
        const url = await createCheckoutSession(category);
        window.location.href = url;
      } catch (e) {
        console.warn("[SL_APP] checkout error:", e);
        setCheckoutStatus("Could not start checkout. Try again.", true);
        btn.disabled = false;
      }
    });
  }

  // ---------- Boot ----------
  function boot() {
    ensureCheckoutRowLayout();
    wireCategoryButtons();
    wireCheckoutButton();
    refreshGateState();

    window.addEventListener("sl-auth-changed", () => refreshGateState());
    window.addEventListener("popstate", () => refreshGateState());
    window.addEventListener("hashchange", () => refreshGateState());
  }

  function bootWhenAuthReady() {
    // If auth is missing, still boot for URL/category reflection
    if (!window.SL_AUTH) {
      boot();
      return;
    }

    if (window.SL_AUTH.ready) {
      boot();
      return;
    }

    window.addEventListener("sl-auth-ready", () => boot(), { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootWhenAuthReady);
  } else {
    bootWhenAuthReady();
  }
})();


