/* ScopedLabs Upgrade + Checkout UI
   - Runs on /upgrade/ and /upgrade/checkout/
   - Reads ?category=slug
   - Renders selected category label + card
   - Checkout button calls /api/create-checkout-session
*/
(() => {
  "use strict";

  const LOG_PREFIX = "[app]";
  const $ = (id) => document.getElementById(id);

  function log(...args) { console.log(LOG_PREFIX, ...args); }

  function getCategory() {
    const u = new URL(window.location.href);
    return (u.searchParams.get("category") || "").trim() || null;
  }

  function isCheckoutPage() {
    return window.location.pathname.startsWith("/upgrade/checkout");
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text ?? "";
  }

  function setHtml(id, html) {
    const el = $(id);
    if (el) el.innerHTML = html ?? "";
  }

  function setDisabled(id, disabled) {
    const el = $(id);
    if (el) el.disabled = !!disabled;
  }

  function formatLabel(slug) {
    const map = window.SCOPEDLABS_STRIPE || {};
    return map[slug]?.label || slug;
  }

  // Minimal meta so the card looks like the upgrade cards.
  // You can expand these strings later; structure matches your existing card markup/classes.
  const CATEGORY_META = {
    "power": {
      desc: "UPS runtime, load growth, redundancy, and battery planning.",
      bullets: ["UPS sizing + runtime", "Redundancy impact", "Load growth planning"]
    },
    "network": {
      desc: "Bandwidth, PoE budgets, throughput, and deployment planning.",
      bullets: ["PoE budget checks", "Bandwidth planning", "MTU/latency helpers"]
    },
    "video-storage": {
      desc: "Storage planner, retention, and video bandwidth planning.",
      bullets: ["Storage planning", "Retention modeling", "RAID impact"]
    },
    "wireless": {
      desc: "Link budgets, RF planning, and interference risk checks.",
      bullets: ["Link budget checks", "Coverage + capacity planning", "Interference risk helpers"]
    },
    "access-control": {
      desc: "Door hardware, credential formats, PoE power budgets, and deployment planning.",
      bullets: ["Controller sizing + expansion", "Power & cabling headroom", "Fail-safe / fail-secure modeling"]
    },
    "thermal": {
      desc: "Heat loads, ventilation planning, and equipment temperature checks.",
      bullets: ["Rack/room heat load", "Ventilation planning", "Thermal risk checks"]
    },
    "compute": {
      desc: "Server sizing, workload estimates, and resource headroom planning.",
      bullets: ["CPU/RAM capacity planning", "Growth + utilization targets", "Performance vs cost trade-offs"]
    },
    "infrastructure": {
      desc: "Power chain planning, rack/room constraints, and deployment readiness checks.",
      bullets: ["Rack density & load planning", "Power/space/cooling constraints", "Failure impact + contingency"]
    }
  };

  function renderSelectedCategoryPill(slug) {
    // Upgrade page UI bits
    setText("sl-selected-category", slug ? formatLabel(slug) : "None selected");
    setDisabled("sl-checkout", !slug); // if present
  }

  function categoryCardHtml(slug) {
    if (!slug) return "";

    const meta = CATEGORY_META[slug] || { desc: "", bullets: [] };
    const label = formatLabel(slug);

    // Matches your card style: .card.tool-card, .pill.pro, etc.
    const bullets = (meta.bullets || []).map(b => `<li>${b}</li>`).join("");

    return `
      <div class="card tool-card">
        <div class="pill pro"><span class="lock">🔒</span> Pro — Category Unlock</div>
        <h3>${label}</h3>
        ${meta.desc ? `<p class="muted">${meta.desc}</p>` : ""}
        ${bullets ? `<div class="muted" style="margin-top:.65rem; font-weight:600;">Includes examples like:</div>
        <ul class="muted" style="margin-top:.35rem;">${bullets}</ul>` : ""}
      </div>
    `;
  }

  async function startCheckout(slug) {
    const sb = window.SL_AUTH?.sb;
    if (!sb) {
      setText("sl-status", "Auth not ready yet. Refresh and try again.");
      return;
    }

    const { data } = await sb.auth.getSession();
    const session = data?.session;
    if (!session) {
      setText("sl-status", "Please sign in first.");
      return;
    }

    if (!slug) {
      setText("sl-status", "Select a category first.");
      return;
    }

    setText("sl-status", "Starting checkout…");

    // You already have this endpoint wired server-side.
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: slug,
        userEmail: session.user.email
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      setText("sl-status", `Checkout failed: ${res.status} ${text}`.trim());
      return;
    }

    const payload = await res.json();
    const url = payload?.url || payload?.checkout_url;
    if (!url) {
      setText("sl-status", "Checkout failed: no URL returned.");
      return;
    }

    window.location.href = url;
  }

  function wireCheckoutButton() {
    const btn = $("sl-checkout");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const slug = getCategory();
      await startCheckout(slug);
    });
  }

  function wireChangeCategoryButtons() {
    // On checkout page: “Choose different category” should go back to /upgrade/
    const btn = $("sl-change-category");
    if (btn) {
      btn.addEventListener("click", () => {
        window.location.href = "/upgrade/#categories";
      });
    }

    // Optional “Browse tools”
    const btnTools = $("sl-browse-tools");
    if (btnTools) {
      btnTools.addEventListener("click", () => {
        window.location.href = "/tools/";
      });
    }
  }

  function renderCheckoutPage(slug) {
    // Inject selected category card into checkout page container
    setHtml("sl-selected-card", categoryCardHtml(slug));
    // Also show the label text line
    setText("sl-selected-label", slug ? formatLabel(slug) : "None selected");
    setDisabled("sl-checkout", !slug);
  }

  function renderUpgradePage(slug) {
    // If your upgrade page shows “Selected category: …”
    renderSelectedCategoryPill(slug);

    // Your category cards already exist on the page. We just need them to navigate to checkout page.
    document.querySelectorAll("[data-upgrade-category]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const c = btn.getAttribute("data-upgrade-category");
        if (!c) return;
        const u = new URL(window.location.origin + "/upgrade/");
        u.searchParams.set("category", c);
        u.hash = "checkout";
        window.location.href = u.toString();
      });
    });
  }

  function ensureCategorySelectedOrBounce() {
    if (!isCheckoutPage()) return;
    const slug = getCategory();
    if (!slug) {
      window.location.href = "/upgrade/#categories";
    }
  }

  function main() {
    const slug = getCategory();
    log("category =", slug, "page =", isCheckoutPage() ? "checkout" : "upgrade");

    wireCheckoutButton();
    wireChangeCategoryButtons();

    if (isCheckoutPage()) {
      ensureCategorySelectedOrBounce();
      renderCheckoutPage(slug);
    } else {
      renderUpgradePage(slug);
    }

    // If auth loads after app.js, auth will later toggle buttons — but we keep UI consistent.
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();

