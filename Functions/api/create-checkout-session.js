// Cloudflare Pages Function: POST /api/create-checkout-session
// Expects: Authorization: Bearer <supabase_access_token>
// Body: { category: "power" }
// Returns: { url: "https://checkout.stripe.com/..." }

export async function onRequestPost({ request, env }) {
  try {
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
    const STRIPE_PRICE_ID_CATEGORY = env.STRIPE_PRICE_ID_CATEGORY; // same price for all categories

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !STRIPE_SECRET_KEY || !STRIPE_PRICE_ID_CATEGORY) {
      return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500, headers: { "Content-Type": "application/json" }});
    }

    const auth = request.headers.get("Authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" }});

    const token = m[1];

    // Validate token + get user from Supabase Auth
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_ANON_KEY
      }
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" }});
    }

    const user = await userRes.json();
    const userId = user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" }});
    }

    const body = await request.json().catch(() => ({}));
    const category = String(body.category || "").toLowerCase().trim();

    const allowed = new Set([
      "access-control",
      "compute",
      "infrastructure",
      "network",
      "performance",
      "physical-security",
      "power",
      "thermal",
      "video-storage",
      "wireless"
    ]);

    if (!allowed.has(category)) {
      return new Response(JSON.stringify({ error: "Invalid category" }), { status: 400, headers: { "Content-Type": "application/json" }});
    }

    const origin = new URL(request.url).origin;
    const successUrl = `${origin}/account/?success=1&category=${encodeURIComponent(category)}`;
    const cancelUrl  = `${origin}/upgrade/?canceled=1&category=${encodeURIComponent(category)}#checkout`;

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("client_reference_id", userId);
    params.set("metadata[category]", category);

    // single shared price id (same price for all categories)
    params.set("line_items[0][price]", STRIPE_PRICE_ID_CATEGORY);
    params.set("line_items[0][quantity]", "1");

    // Optionally collect billing address:
    // params.set("billing_address_collection", "auto");

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    if (!stripeRes.ok) {
      const errText = await stripeRes.text();
      return new Response(JSON.stringify({ error: "Stripe error", detail: errText.slice(0, 300) }), { status: 502, headers: { "Content-Type": "application/json" }});
    }

    const session = await stripeRes.json();
    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
}
