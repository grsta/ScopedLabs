export async function onRequestPost(ctx) {
  try {
    const { request, env } = ctx;

    // REQUIRED ENV
    const SITE_ORIGIN = env.SITE_ORIGIN;                 // e.g. https://scopedlabs.com
    const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;     // sk_live_...
    if (!SITE_ORIGIN) throw new Error("Missing env var: SITE_ORIGIN");
    if (!STRIPE_SECRET_KEY) throw new Error("Missing env var: STRIPE_SECRET_KEY");

    // Parse body
    const body = await request.json().catch(() => ({}));
    const priceId = body?.priceId;
    const category = body?.category;

    if (!priceId) {
      return json({ ok: false, error: "missing_priceId" }, 400);
    }

    // IMPORTANT:
    // Since this is static-site checkout, we use Stripe Checkout Session.
    // Success returns to your site; the actual "unlock" should be done by webhook later.
    const success_url =
      `${SITE_ORIGIN}/tools/?unlocked=1&category=${encodeURIComponent(category || "")}&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url =
      `${SITE_ORIGIN}/upgrade/?category=${encodeURIComponent(category || "")}#checkout`;

    // Create Checkout Session (Stripe API)
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.append("line_items[0][price]", priceId);
    form.append("line_items[0][quantity]", "1");
    form.set("success_url", success_url);
    form.set("cancel_url", cancel_url);

    // Optional: allow promotion codes, tax, etc
    // form.set("allow_promotion_codes", "true");

    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return json({ ok: false, error: "stripe_error", detail: data }, 502);
    }

    return json({ ok: true, url: data.url });
  } catch (e) {
    return json({ ok: false, error: "worker_exception", detail: String(e?.message || e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
