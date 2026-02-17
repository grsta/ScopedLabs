/* /assets/app.js
   ScopedLabs Upgrade controller (stable)

   Fixes:
   - Keeps category in sync: URL ?category= OR localStorage
   - Updates BOTH:
       #selected-category  (pill)
       #sl-category-label  (heading span)
   - Highlights selected category card (by id)
   - Renders selected category preview into #selected-category-preview
   - Enables Checkout only when signed-in + category selected
*/

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  // ---------- UI element helpers ----------
  function elCategoryPill() {
    return $("#selected-category");
  }

  function elCategoryLabel() {
    return $("#sl-category-label");
  }

  function elPreviewMount() {
    return $("#selected-category-preview");
  }

  function elCheckoutBtn() {
    return $("#sl-checkout") || $("#checkout-btn") || $("#btn-checkout");
  }

  function elStatus() {
    return $("#sl-status") || $("#checkout-status");
  }

  function setStatus(msg, isError = false) {
    const el = elStatus();
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "#ffb3b3" : "";
  }

  // ---------- Category state ----------
  function getCategoryFromUrl() {
    const url = new URL(window.location.href);
    const c = (url.searchParams.get("category") || "").trim().toLowerCase();
    return c;
  }

  function getCategoryFromStorage() {
    try {
      // prefer the “official” key you’ve been using
      const a = (localStorage.getItem("sl_selected_category") || "").trim().toLowerCase();
      if (a) return a;

      // fallback for older experiments
      const b = (localStorage.getItem("sl_last_category") || "").trim().toLowerCase();
      return b;
    } catch {
      return "";
    }
  }

  function setCategoryToStorage(cat) {
    try {
      localStorage.setItem("sl_selected_category", cat || "");
      localStorage.setItem("sl_last_category", cat || "");
    } catch {}
  }

  function getCurrentCategory() {
    return getCategoryFromUrl() || getCategoryFromStorage() || "";
  }

  // ---------- Category UI ----------
  function reflectCategory(category) {
    const cat = (category || "").trim();

    const pill = elCategoryPill();
    if (pill) pill.textContent = cat ? cat : "None selected";

    const label = elCategoryLabel();
    if (label) label.textContent = cat ? cat : "a category";
  }

  function clearSelectedCardHighlight() {
    document.querySelectorAll(".upgrade-card.is-selected").forEach((el) => {
      el.classList.remove("is-selected");
    });
  }

  function findCategoryCard(category) {
    if (!category) return null;

    // Your choose-grid cards are <div class="card upgrade-card" id="wireless"> ...
    const byId = document.getElementById(category);
    if (byId && byId.classList.contains("upgrade-card")) return byId;

    // fallback
    return document.querySelector(`.upgrade-card#${CSS.escape(category)}`);
  }

  function renderSelectedCategoryPreview(category) {
    const mount = elPreviewMount();
    if (!mount) return;

    if (!category) {
      mount.innerHTML = "";
      return;
    }

    const sourceCard = findCategoryCard(category);
    if (!sourceCard) {
      // if card not found, still show a small confirmation box
      mount.innerHTML = `
        <div class="card" style="max-width: 520px;">
          <div class="muted" style="margin-bottom:.35rem;">You are unlocking:</div>
          <div style="font-weight:700;">${escapeHtml(category)}</div>
        </div>
      `;
      return;
    }

    const clone = sourceCard.cloneNode(true);

    // remove CTA(s) inside the preview so users don’t “click buy” again
    clone.querySelectorAll("a, button").forEach((n) => n.remove());

    // keep it visually “confirmation-like”
    clone.classList.add("is-preview");
    clone.style.pointerEvents = "none";

    mount.innerHTML = "";
    mount.appendChild(clone);
  }

  function syncSelectedCategoryUI(category) {
    clearSelectedCardHighlight();

    const card = findCategoryCard(category);
    if (card) card.classList.add("is-selected");

    renderSelectedCategoryPreview(category);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ---------- Auth / checkout gating ----------
  async function isSignedIn() {
    const sb = window.SL_AUTH?.sb;
    if (!sb) return false;
    try {
      const { data } = await sb.auth.getSession();
      return !!data?.session?.user;
    } catch {
      return false;
    }
  }

  async function refreshGateState() {
    const btn = elCheckoutBtn();
    const cat = getCurrentCategory();

    // always keep UI in sync
    reflectCategory(cat);
    syncSelectedCategoryUI(cat);

    if (!btn) return;

    btn.disabled = true;

    if (!cat) {
      setStatus("Select a category to continue.");
      return;
    }

    const signedIn = await isSignedIn();
    if (!signedIn) {
      setStatus("Sign in to unlock Pro access.");
      return;
    }

    setStatus("");
    btn.disabled = false;
  }

  // ---------- Persist category when user clicks a category CTA link ----------
  function wireCategoryLinks() {
    // Any link that contains ?category=...
    document.querySelectorAll('a[href*="category="]').forEach((a) => {
      a.addEventListener("click", () => {
        try {
          const u = new URL(a.getAttribute("href") || "", window.location.origin);
          const c = (u.searchParams.get("category") || "").trim().toLowerCase();
          if (c) setCategoryToStorage(c);
        } catch {}
      });
    });
  }

  // ---------- Wire checkout button ----------
  function wireCheckoutButton() {
    const btn = elCheckoutBtn();
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const category = getCurrentCategory();
      if (!category) {
        alert("Please choose a category before checking out.");
        setStatus("Select a category to continue.", true);
        return;
      }

      const signedIn = await isSignedIn();
      if (!signedIn) {
        alert("Please sign in before checking out.");
        setStatus("Sign in to unlock Pro access.", true);
        return;
      }

      // OPTIONAL: explicit confirmation to reduce refunds
      const ok = confirm(`You are about to unlock: "${category}".\n\nClick OK to continue.`);
      if (!ok) return;

      btn.disabled = true;
      setStatus("Opening Stripe Checkout…");

      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (!data || !data.url) throw new Error("Missing checkout url");

        window.location.href = data.url;
      } catch (e) {
        console.warn("[SL_APP] checkout error:", e);
        setStatus("Failed to start checkout.", true);
        btn.disabled = false;
      }
    });
  }

  // ---------- Boot ----------
  function boot() {
    wireCategoryLinks();
    wireCheckoutButton();
    refreshGateState();

    // When auth restores after magic link, auth.js should ideally dispatch sl-auth-changed.
    // But we also refresh on load and popstate.
    window.addEventListener("sl-auth-changed", refreshGateState);
    window.addEventListener("popstate", refreshGateState);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();


