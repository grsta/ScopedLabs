// /assets/stripe-map.js
// Single source of truth for Stripe wiring.
// Fill in productId + priceId (and optionally paymentLink).

// ===============================
// Supabase Config
// ===============================
window.SL_SUPABASE_URL = "https://ybnzjtuecirzajraddft.supabase.co";
window.SL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";


window.SCOPEDLABS_STRIPE = {
  // slug: MUST match ?category=<slug> and your folder naming convention (kebab-case)
  "power": {
    label: "Power",
    productId: "prod_Tx0UvLUWPvURF7",
    priceId: "price_1Sz6TvJcSGIDDXHxNn6clJHL",
    unlockKey: "scopedlabs_pro_power",
  },
  "network": {
    label: "Network",
    productId: "prod_Tx0jyuna7SJ8oJ",
    priceId: "price_1Sz6iRJcSGIDDXHxstDPBoTO",
    unlockKey: "scopedlabs_pro_network",
  },
  "video-storage": {
    label: "Video Storage",
    productId: "prod_Tx0q1LBHMuWAJt",
    priceId: "price_1Sz6ozJcSGIDDXHxt8iogOYL",
    unlockKey: "scopedlabs_pro_video-storage",
  },
  "access-control": {
    label: "Access Control",
    productId: "prod_TwdVaEq5XjeCOw",
    priceId: "price_1SykEjJcSGIDDXHx2PvT5bG5",
    unlockKey: "scopedlabs_pro_access-control",
  },
  "physical-security": {
    label: "Physical Security",
    productId: "prod_Tx1GkjsOhy5eG9",
    priceId: "price_1Sz7DmJcSGIDDXHxYwryjsaS",
    unlockKey: "scopedlabs_pro_physical-security",
  },
  "compute": {
    label: "Compute",
    productId: "prod_Tx1k7ble8pa2K4",
    priceId: "price_1Sz7hEJcSGIDDXHxJgUpKfI6",
    unlockKey: "scopedlabs_pro_compute",
  },
  "wireless": {
    label: "Wireless",
    productId: "prod_Tx19dYNPdoM0Ki",
    priceId: "price_1Sz76mJcSGIDDXHxXsw4EPko",
    unlockKey: "scopedlabs_pro_wireless",
  },
  "thermal": {
    label: "Thermal",
    productId: "prod_Tx1YqGNCxLFw5C",
    priceId: "price_1Sz7VCJcSGIDDXHxzbmhV0lN",
    unlockKey: "scopedlabs_pro_thermal",
  },
  "performance": {
    label: "Performance",
    productId: "prod_Tx1cnQB3uLMmJ8",
    priceId: "price_1Sz7ZVJcSGIDDXHxf0433bqS",
    unlockKey: "scopedlabs_pro_performance",
  },
  "infrastructure": {
    label: "Infrastructure",
    productId: "prod_Tx1fZSoTKtRtQy",
    priceId: "price_1Sz7cWJcSGIDDXHxmBoB7dfo",
    unlockKey: "scopedlabs_pro_infrastructure",
  },
};
