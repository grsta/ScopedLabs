/* ScopedLabs Upgrade App (Race-safe + selector-safe)
   - Waits for sl-auth-ready before gating checkout
   - Reads ?category= from URL and reflects in UI
   - Enables checkout only if: signed in AND category selected
   - Shows selected category preview card in checkout
*/

function clearSelectedCard() {
  document
    .querySelectorAll(".upgrade-card.is-selected")
    .forEach(el => el.classList.remove("is-selected"));
}

function findCategoryCard(category) {
  if (!category) return null;

  // Your cards are: <div class="card upgrade-card" id="wireless"> ... </div>
  // So the simplest, most reliable lookup is by id.
  const byId = document.getElementById(category);
  if (byId && byId.classList.contains("upgrade-card")) return byId;

  // Fallback: just in case class/id drift
  const sel = `.upgrade-card#${CSS.escape(category)}`;
  return document.querySelector(sel);
}

function renderSelectedCategoryPreview(cardEl) {
  const mount = document.getElementById("selected-category-preview");
  if (!mount) return;

  if (!cardEl) {
    mount.innerHTML = "";
    return;
  }

  const clone = cardEl.cloneNode(true);

  clone.classList.remove("is-selected");

  // Remove unlock button + any links/buttons in preview
  clone.querySelectorAll(".upgrade-cta").forEach(n => n.remove());
  clone.querySelectorAll("a, button").forEach(b => b.remove());

  clone.style.marginTop = "0.75rem";

  mount.innerHTML = `
    <div class="muted" style="margin-top:.5rem; margin-bottom:.35rem;">
      You are unlocking:
    </div>
  `;
  mount.appendChild(clone);
}

function syncSelectedCategoryUI(category) {
  clearSelectedCard();
  const card = findCategoryCard(category);
  if (card) card.classList.add("is-selected");
  renderSelectedCategoryPreview(card);
}

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

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
      $("#sl-checkout") || // YOUR button id in HTML
      $("#btn-checkout") ||
      $("#checkout-btn") ||
      $("#checkoutBtn") ||
      document.querySelector("[data-checkout]")
    );
  }

  function findCheckoutStatusEl() {
    return (
      $("#sl-status") || // YOUR status id in HTML
      $("#checkout-status") ||
      $("#checkoutStatus") ||
      document.querySelector("[data-checkout-status]")
    );
  }

  function setCheckoutStatus(msg, isError = false) {
    const s = findCheckoutStatusEl();
    if (!s) return;
    s.textContent = msg || "";
    s.classList.toggle("error", !!isError);
  }

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

  function reflectCategory(category) {
    const el = findSelectedCategoryEl();
    if (el) {
      el.textContent = category ? category : "None selected";
      el.classList.toggle("muted", !category);
    }

    // Also update the title label if present
    const hLabel = $("#sl-category-label");
    if (hLabel) hLabel.textContent = category ? category : "a category";
  }

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

  function boot() {
    wireCheckoutButton();
    refreshGateState();

    window.addEventListener("sl-auth-changed", () => refreshGateState());
    window.addEventListener("popstate", () => refreshGateState());
  }

  function bootWhenAuthReady() {
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


