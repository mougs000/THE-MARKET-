import React, { useState, useEffect, useCallback, useMemo } from "react";

/* ============================================================
   THE MARKET — direct supplier-to-buyer marketplace (MVP demo)
   Design tokens:
     ink   #14150F   paper #F1EFE6   teal  #0E4A47
     lime  #D8FF4F   line  #DAD5C4   rust  #B4442E (alerts only)
   Display: "Fraunces" / Body: "Inter" / Utility: "IBM Plex Mono"
   Signature: the "direct line" tag — a seller-dot—line—buyer-dot
   marker that appears on every listing, literalizing "no middlemen".
   ============================================================ */

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600..900&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`;

const COLORS = {
  ink: "#3A3A38",
  paper: "#FAF8F4",
  paper2: "#F0EAE0",
  teal: "#E8862B",
  tealDark: "#C96A1B",
  lime: "#FFC93C",
  line: "#E6DFD2",
  rust: "#C4472B",
};

const CATEGORIES = [
  { id: "vehicles", label: "Vehicles", icon: "🚗" },
  { id: "electronics", label: "Electronics", icon: "🔌" },
  { id: "phones", label: "Phones & Tablets", icon: "📱" },
  { id: "computers", label: "Computers", icon: "💻" },
  { id: "clothing", label: "Clothing", icon: "👕" },
  { id: "furniture", label: "Furniture", icon: "🛋️" },
  { id: "home-garden", label: "Home & Garden", icon: "🪴" },
  { id: "machinery", label: "Machinery", icon: "⚙️" },
  { id: "tools", label: "Tools", icon: "🔧" },
  { id: "agriculture", label: "Agriculture", icon: "🌾" },
  { id: "building", label: "Building Materials", icon: "🧱" },
  { id: "sports", label: "Sports", icon: "🏀" },
  { id: "baby-kids", label: "Baby & Kids", icon: "🧸" },
  { id: "food", label: "Food & Grocery", icon: "🥑" },
  { id: "industrial", label: "Industrial", icon: "🏭" },
  { id: "auto-parts", label: "Automotive Parts", icon: "🔩" },
  { id: "services", label: "Services", icon: "🛠️" },
  { id: "other", label: "Other", icon: "📦" },
];

const CURRENCIES = ["NAD", "ZAR", "USD", "GBP", "EUR"];
const OFFER_CATEGORIES = new Set(["vehicles", "machinery", "furniture", "electronics", "computers", "industrial"]);
const TRACK_STAGES = [
  "Order placed", "Seller confirmed", "Preparing order", "Ready for collection",
  "Collected", "In transit", "Out for delivery", "Delivered",
];

/* ---------- countries / currency conversion (illustrative, static rates) ---------- */
const COUNTRIES = ["Namibia", "South Africa", "United States", "United Kingdom", "Germany"];
const COUNTRY_CURRENCY = { Namibia: "NAD", "South Africa": "ZAR", "United States": "USD", "United Kingdom": "GBP", Germany: "EUR" };
// Value of 1 unit of each currency, expressed in USD. Static estimates for demo purposes only — a
// production build would call a live FX-rate provider (see architecture doc, "Currency service").
const USD_VALUE = { NAD: 0.055, ZAR: 0.055, USD: 1, GBP: 1.27, EUR: 1.09 };
function convertCurrency(amount, fromCur, toCur) {
  if (!amount || fromCur === toCur) return amount;
  const usd = amount * (USD_VALUE[fromCur] ?? 1);
  return usd / (USD_VALUE[toCur] ?? 1);
}

/* ---------- compliance engine (rule-based, demo scope) ----------
   Real rules vary by destination country's customs, food-safety, consumer-protection
   and import/export law and must be reviewed by local counsel per market before launch
   (see spec section 9). This is a simplified stand-in: category -> cross-border policy. */
const COMPLIANCE_RULES = {
  food: { crossBorder: "blocked", note: "Food products can only be sold for delivery within the seller's own country, due to import food-safety rules." },
  agriculture: { crossBorder: "blocked", note: "Agricultural produce is typically restricted from cross-border delivery due to biosecurity rules." },
  vehicles: { crossBorder: "restricted", note: "Cross-border vehicle sales usually require an import permit and customs clearance in the buyer's country." },
  industrial: { crossBorder: "restricted", note: "May require an import or export license depending on the destination country." },
  machinery: { crossBorder: "restricted", note: "May require an import or export license depending on the destination country." },
  building: { crossBorder: "restricted", note: "Some building materials must meet destination-country certification standards." },
};
function checkCompliance(category, sellerCountry, buyerCountry) {
  if (!buyerCountry || !sellerCountry) return { status: "unknown" };
  if (sellerCountry === buyerCountry) return { status: "allowed" };
  const rule = COMPLIANCE_RULES[category];
  if (!rule || rule.crossBorder === "allowed") return { status: "allowed" };
  return { status: rule.crossBorder, note: rule.note };
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const money = (n, cur) => `${cur} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const SEED_PRODUCTS = [
  {
    id: uid(), title: "2016 Toyota Hilux 2.8 GD-6", description:
      "Single owner, full service history, new tyres fitted last month. Diesel, manual, 4x4. Selling directly — no dealer markup.",
    category: "vehicles", condition: "Used", price: 285000, currency: "NAD", qty: 1,
    location: "Windhoek, Namibia", country: "Namibia", seller: "Johan K.", sellerType: "Individual", verified: "Identity Verified",
    delivery: true, deliveryFee: 3500, offerEnabled: true, color: "#0E4A47", icon: "🚗", createdAt: Date.now() - 86400000 * 2,
    images: ["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800"],
  },
  {
    id: uid(), title: "Handmade Oshiwambo Basket Set (3pc)", description:
      "Woven by hand using natural palm fibre. Set of three nesting baskets, made to order by a family cooperative.",
    category: "other", condition: "New", price: 450, currency: "NAD", qty: 12,
    location: "Oshakati, Namibia", country: "Namibia", seller: "Ndeshi Crafts Collective", sellerType: "Business", verified: "Business Verified",
    delivery: true, deliveryFee: 85, offerEnabled: false, color: "#B4442E", icon: "🧺", createdAt: Date.now() - 86400000,
  },
  {
    id: uid(), title: "iPhone 13, 128GB — Blue", description:
      "Screen protector on since day one, battery health 91%. Comes with box and original cable, no charger brick.",
    category: "phones", condition: "Used", price: 8200, currency: "NAD", qty: 1,
    location: "Cape Town, South Africa", country: "South Africa", seller: "Amara T.", sellerType: "Individual", verified: "Phone Verified",
    delivery: true, deliveryFee: 120, offerEnabled: false, color: "#14150F", icon: "📱", createdAt: Date.now() - 3600000 * 6,
  },
  {
    id: uid(), title: "Industrial Bag-Sealing Machine", description:
      "Continuous band sealer, 220V, lightly used in a small packaging line. Manuals included, buyer to arrange freight.",
    category: "machinery", condition: "Used", price: 14500, currency: "ZAR", qty: 1,
    location: "Gqeberha, South Africa", country: "South Africa", seller: "Coastal Pack Supplies", sellerType: "Business", verified: "Trusted Seller",
    delivery: false, deliveryFee: 0, offerEnabled: true, color: "#0E4A47", icon: "⚙️", createdAt: Date.now() - 3600000 * 20,
  },
  {
    id: uid(), title: "Free-range Chicken Eggs (30 tray)", description:
      "Collected daily from our smallholding. Local delivery only, please order by Wednesday for weekend collection.",
    category: "food", condition: "New", price: 95, currency: "NAD", qty: 40,
    location: "Okahandja, Namibia", country: "Namibia", seller: "Karibib Farm Fresh", sellerType: "Individual", verified: "Phone Verified",
    delivery: true, deliveryFee: 25, offerEnabled: false, color: "#D8FF4F", icon: "🥚", createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: uid(), title: "Solid Oak Dining Table (6-seat)", description:
      "Built by a local carpenter, minor surface scratches from normal use. Chairs sold separately.",
    category: "furniture", condition: "Used", price: 3200, currency: "NAD", qty: 1,
    location: "Swakopmund, Namibia", country: "Namibia", seller: "Petra vW.", sellerType: "Individual", verified: "Unverified",
    delivery: false, deliveryFee: 0, offerEnabled: true, color: "#B4442E", icon: "🪑", createdAt: Date.now() - 3600000 * 40,
  },
];

/* ---------- storage helpers ---------- */
async function loadShared(key, fallback) {
  try {
    const r = await window.storage.get(key, true);
    return r ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}
async function saveShared(key, value) {
  try { await window.storage.set(key, JSON.stringify(value), true); } catch (e) { console.error(e); }
}
async function loadPersonal(key, fallback) {
  try {
    const r = await window.storage.get(key, false);
    return r ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}
async function savePersonal(key, value) {
  try { await window.storage.set(key, JSON.stringify(value), false); } catch (e) { console.error(e); }
}

/* ---------- tiny UI atoms ---------- */
function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
      <rect width="32" height="32" rx="9" fill={COLORS.lime} />
      {/* briefcase handle */}
      <rect x="12.5" y="7.5" width="7" height="4.5" rx="1.6" stroke={COLORS.ink} strokeWidth="2" fill="none" />
      {/* briefcase body */}
      <rect x="6.5" y="12.5" width="19" height="12.5" rx="2.4" fill={COLORS.ink} />
      {/* clasp / strap */}
      <rect x="6.5" y="17.3" width="19" height="2.6" fill={COLORS.lime} />
      <rect x="14.6" y="16.5" width="2.8" height="4.2" rx="0.8" fill={COLORS.lime} />
    </svg>
  );
}

function Tag({ children, tone = "teal" }) {
  const bg = tone === "lime" ? COLORS.lime : tone === "rust" ? COLORS.rust : COLORS.teal;
  const fg = tone === "lime" ? COLORS.ink : "#fff";
  return (
    <span style={{ background: bg, color: fg, fontFamily: "'IBM Plex Mono', monospace" }}
      className="text-[10px] tracking-wide uppercase px-2 py-1 rounded-sm font-semibold">
      {children}
    </span>
  );
}

function DirectLine({ small }) {
  return (
    <div className="flex items-center gap-1" style={{ opacity: 0.75 }}>
      <span className="rounded-full" style={{ width: 5, height: 5, background: COLORS.teal, display: "inline-block" }} />
      <span style={{ width: small ? 18 : 28, height: 1, background: COLORS.teal, display: "inline-block" }} />
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: 1, color: COLORS.teal }}>DIRECT</span>
      <span style={{ width: small ? 18 : 28, height: 1, background: COLORS.teal, display: "inline-block" }} />
      <span className="rounded-full" style={{ width: 5, height: 5, background: COLORS.teal, display: "inline-block" }} />
    </div>
  );
}

function Thumb({ color, icon, size = 64 }) {
  return (
    <div style={{
      width: size, height: size, background: color, borderRadius: 10,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.42, flexShrink: 0,
      border: `1px solid ${COLORS.ink}22`,
    }}>{icon}</div>
  );
}

function Btn({ children, onClick, variant = "primary", full, disabled, small }) {
  const base = "font-semibold transition active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100";
  const pad = small ? "px-3 py-1.5 text-xs" : "px-4 py-3 text-sm";
  const styles = {
    primary: { background: COLORS.ink, color: COLORS.lime, boxShadow: "0 3px 10px rgba(20,21,15,0.25)" },
    lime: { background: `linear-gradient(135deg, ${COLORS.lime}, #c2ee2e)`, color: COLORS.ink, boxShadow: "0 3px 12px rgba(216,255,79,0.4)" },
    outline: { background: "transparent", color: COLORS.ink, border: `1.5px solid ${COLORS.ink}` },
    ghost: { background: COLORS.paper2, color: COLORS.ink },
    rust: { background: COLORS.rust, color: "#fff", boxShadow: "0 3px 10px rgba(180,68,46,0.3)" },
  };
  return (
    <button disabled={disabled} onClick={onClick}
      className={`${base} ${pad} rounded-xl ${full ? "w-full" : ""}`}
      style={styles[variant]}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.teal, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</div>
      {children}
    </label>
  );
}
const inputCls = "w-full px-3 py-2.5 rounded-lg text-sm outline-none";
const inputStyle = { background: "#fff", border: `1.5px solid ${COLORS.line}`, color: COLORS.ink };

function Stepper({ status }) {
  const idx = Math.max(0, TRACK_STAGES.indexOf(status));
  return (
    <div className="space-y-0">
      {TRACK_STAGES.map((s, i) => (
        <div key={s} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="rounded-full flex items-center justify-center" style={{
              width: 18, height: 18, background: i <= idx ? COLORS.teal : "#fff",
              border: `2px solid ${i <= idx ? COLORS.teal : COLORS.line}`,
            }}>
              {i <= idx && <div style={{ width: 6, height: 6, borderRadius: 99, background: COLORS.lime }} />}
            </div>
            {i < TRACK_STAGES.length - 1 && <div style={{ width: 2, height: 22, background: i < idx ? COLORS.teal : COLORS.line }} />}
          </div>
          <div className={`text-sm pb-2 ${i <= idx ? "font-semibold" : "opacity-45"}`} style={{ color: COLORS.ink }}>{s}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- AUTH ---------------- */
function AuthView({ onDone }) {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || password.length < 6) {
      setError("Enter an email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const client = window.supabaseClient;
      const { error: err } =
        mode === "signup"
          ? await client.auth.signUp({ email: email.trim(), password })
          : await client.auth.signInWithPassword({ email: email.trim(), password });
      if (err) setError(err.message);
      else if (mode === "signup") setError("Check your email to confirm your account, then sign in.");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: `linear-gradient(160deg, ${COLORS.ink} 0%, ${COLORS.tealDark} 55%, ${COLORS.teal} 100%)`, minHeight: "100vh" }}
      className="flex flex-col justify-center px-6 relative overflow-hidden">
      <style>{FONT_IMPORT}</style>
      <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 999, background: `${COLORS.lime}22` }} />
      <div style={{ position: "absolute", bottom: -80, left: -60, width: 260, height: 260, borderRadius: 999, background: `${COLORS.lime}14` }} />

      <div className="relative flex flex-col items-center mb-8">
        <div className="mb-3" style={{ filter: "drop-shadow(0 6px 18px rgba(216,255,79,0.25))" }}><Logo size={52} /></div>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 800, color: "#fff" }} className="text-2xl tracking-tight">THE MARKET</div>
        <div className="text-xs mt-1" style={{ color: COLORS.lime }}>Buy Direct. Sell Direct.</div>
        <div className="mt-2"><DirectLine small /></div>
      </div>

      <div className="relative p-5 rounded-2xl" style={{ background: COLORS.paper, boxShadow: "0 20px 50px rgba(0,0,0,0.35)" }}>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode("signin")} className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition"
            style={{ background: mode === "signin" ? COLORS.ink : "#fff", color: mode === "signin" ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Sign in</button>
          <button onClick={() => setMode("signup")} className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition"
            style={{ background: mode === "signup" ? COLORS.ink : "#fff", color: mode === "signup" ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Create account</button>
        </div>

        <Field label="Email"><input type="email" autoCapitalize="none" className={inputCls} style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
        <Field label="Password"><input type="password" className={inputCls} style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></Field>

        {error && <div className="text-xs mb-3" style={{ color: error.startsWith("Check") ? COLORS.teal : COLORS.rust }}>{error}</div>}

        <Btn full variant="lime" disabled={busy} onClick={submit}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</Btn>
      </div>
    </div>
  );
}

/* ============================================================ */

export default function TheMarket() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("home");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState({ commissionRate: 0.01 });
  const [support, setSupport] = useState([]);
  const [profile, setProfile] = useState(null);
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [openProduct, setOpenProduct] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [toast, setToast] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  useEffect(() => {
    const client = window.supabaseClient;
    if (!client) { setSession(null); return; }
    client.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = client.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setReady(false); return; }
    const userId = session.user.id;
    (async () => {
      const [p, o, m, r, s, prof, c, sup] = await Promise.all([
        loadShared("products", null),
        loadShared("orders", []),
        loadShared("messages", []),
        loadShared("reviews", []),
        loadShared("settings", { commissionRate: 0.01 }),
        loadPersonal(`profile:${userId}`, null),
        loadPersonal(`cart:${userId}`, []),
        loadShared("support", []),
      ]);
      if (!p) { setProducts(SEED_PRODUCTS); await saveShared("products", SEED_PRODUCTS); }
      else setProducts(p);
      setOrders(o); setMessages(m); setReviews(r); setSettings(s); setSupport(sup);
      setProfile(prof ? { ...prof, email: session.user.email } : prof); setCart(c);
      setReady(true);
    })();
  }, [session]);

  const persistProducts = async (next) => { setProducts(next); await saveShared("products", next); };
  const persistOrders = async (next) => { setOrders(next); await saveShared("orders", next); };
  const persistMessages = async (next) => { setMessages(next); await saveShared("messages", next); };
  const persistReviews = async (next) => { setReviews(next); await saveShared("reviews", next); };
  const persistSettings = async (next) => { setSettings(next); await saveShared("settings", next); };
  const persistSupport = async (next) => { setSupport(next); await saveShared("support", next); };
  const sendSupportMessage = async (text, from = "user", targetUserId = null) => {
    const msg = { id: uid(), userId: targetUserId || session.user.id, userName: profile?.name || session.user.email, from, text, createdAt: Date.now() };
    await persistSupport([...support, msg]);
  };
  const persistCart = async (next) => { setCart(next); await savePersonal(`cart:${session.user.id}`, next); };

  const saveProfile = async (p) => { setProfile(p); await savePersonal(`profile:${session.user.id}`, p); };

  const logOut = async () => {
    await window.supabaseClient.auth.signOut();
    setProfile(null); setCart([]); setOrders([]); setReady(false);
  };

  const results = useMemo(() => {
    let list = products;
    if (activeCategory) list = list.filter(p => p.category === activeCategory);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.includes(q));
    }
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [products, activeCategory, query]);

  const cartItems = cart.map(ci => ({ ...ci, product: products.find(p => p.id === ci.productId) })).filter(ci => ci.product);
  const cartCount = cartItems.reduce((n, ci) => n + ci.qty, 0);

  const myOrdersAsBuyer = orders.filter(o => o.buyer === profile?.name);
  const myOrdersAsSeller = orders.filter(o => o.seller === profile?.name);

  const ensureProfile = () => {
    if (!profile) { flash("Set up your name first"); setTab("account"); return false; }
    return true;
  };

  const addToCart = async (product, qty = 1) => {
    if (!ensureProfile()) return;
    const existing = cart.find(c => c.productId === product.id);
    const next = existing
      ? cart.map(c => c.productId === product.id ? { ...c, qty: c.qty + qty } : c)
      : [...cart, { productId: product.id, qty }];
    await persistCart(next);
    flash("Added to cart");
  };

  const removeFromCart = async (productId) => persistCart(cart.filter(c => c.productId !== productId));

  const placeOrder = async (items, deliveryChoice) => {
    if (!ensureProfile()) return;
    const rate = settings.commissionRate;
    const newOrders = items.map(ci => {
      const p = ci.product;
      const subtotal = p.price * ci.qty;
      const deliveryFee = deliveryChoice === "pickup" ? 0 : (p.deliveryFee || 0);
      const commission = +(subtotal * rate).toFixed(2);
      return {
        id: uid(), productId: p.id, productTitle: p.title, qty: ci.qty,
        currency: p.currency, unitPrice: p.price, subtotal, deliveryFee,
        deliveryMethod: deliveryChoice, commission, sellerPayout: +(subtotal - commission).toFixed(2),
        total: subtotal + deliveryFee, buyer: profile.name, seller: p.seller,
        status: "Order placed", createdAt: Date.now(),
      };
    });
    await persistOrders([...newOrders, ...orders]);
    await persistCart(cart.filter(c => !items.find(i => i.productId === c.productId)));
    flash(`Order${newOrders.length > 1 ? "s" : ""} placed`);
    setTab("orders");
  };

  const advanceOrder = async (orderId) => {
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return;
    const cur = TRACK_STAGES.indexOf(orders[idx].status);
    if (cur >= TRACK_STAGES.length - 1) return;
    const next = [...orders];
    next[idx] = { ...next[idx], status: TRACK_STAGES[cur + 1] };
    await persistOrders(next);
  };

  const publishListing = async (draft) => {
    if (!ensureProfile()) return;
    const p = {
      id: uid(), ...draft, seller: profile.name, sellerType: profile.role === "business" ? "Business" : "Individual",
      verified: profile.verified || "Unverified", createdAt: Date.now(),
    };
    await persistProducts([p, ...products]);
    flash("Listing published");
    setTab("home");
  };

  const sendMessage = async (productId, text, extra = {}) => {
    if (!ensureProfile()) return;
    const msg = { id: uid(), productId, from: profile.name, text, timestamp: Date.now(), ...extra };
    await persistMessages([...messages, msg]);
  };

  const respondOffer = async (msgId, decision) => {
    const next = messages.map(m => m.id === msgId ? { ...m, offerStatus: decision } : m);
    await persistMessages(next);
    flash(`Offer ${decision}`);
  };

  const leaveReview = async (orderId, rating, text) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    await persistReviews([...reviews, { id: uid(), orderId, seller: order.seller, buyer: order.buyer, rating, text, createdAt: Date.now() }]);
    flash("Review posted");
  };

  if (session === undefined) {
    return (
      <div style={{ background: COLORS.paper, minHeight: "100vh" }} className="flex items-center justify-center">
        <style>{FONT_IMPORT}</style>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 800, color: COLORS.ink }} className="text-xl animate-pulse">THE MARKET</div>
      </div>
    );
  }

  if (session === null) return <AuthView />;

  if (!ready) {
    return (
      <div style={{ background: COLORS.paper, minHeight: "100vh" }} className="flex items-center justify-center">
        <style>{FONT_IMPORT}</style>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 800, color: COLORS.ink }} className="text-xl animate-pulse">THE MARKET</div>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.paper, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>

      {/* header */}
      <div style={{ background: `linear-gradient(135deg, ${COLORS.ink} 0%, ${COLORS.tealDark} 130%)`, boxShadow: "0 6px 24px rgba(0,0,0,0.18)" }}
        className="sticky top-0 z-30 px-4 pt-4 pb-3 rounded-b-2xl">
        <div className="flex items-center justify-between">
          <button onClick={() => setTab("home")} className="flex items-center gap-2">
            <Logo size={26} />
            <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 800, color: COLORS.lime }} className="text-lg tracking-tight">
              THE MARKET
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setTab("cart")} className="relative px-2.5 py-1.5 rounded-xl transition active:scale-95" style={{ background: "rgba(255,255,255,0.08)" }}>
              <span style={{ color: "#fff" }} className="text-sm">🛒</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: COLORS.lime, color: COLORS.ink, width: 16, height: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>{cartCount}</span>
              )}
            </button>
            <button onClick={() => setTab("account")} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition active:scale-95"
              style={{ background: COLORS.lime, color: COLORS.ink, boxShadow: "0 2px 8px rgba(216,255,79,0.35)" }}>
              {profile?.name ? profile.name[0].toUpperCase() : "?"}
            </button>
          </div>
        </div>
        {(tab === "home" || tab === "categories") && (
          <div className="mt-3 flex gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="What are you looking for?"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }} />
          </div>
        )}
      </div>

      {/* body */}
      <div className="px-4 pb-28 pt-4">
        {tab === "home" && (
          <HomeView products={results} query={query} onOpen={p => { setOpenProduct(p); setTab("product"); }}
            onCategory={c => { setActiveCategory(c); setTab("categories"); }} />
        )}
        {tab === "categories" && (
          <CategoryView results={results} activeCategory={activeCategory} setActiveCategory={setActiveCategory}
            onOpen={p => { setOpenProduct(p); setTab("product"); }} />
        )}
        {tab === "product" && openProduct && (
          <ProductView product={products.find(p => p.id === openProduct.id) || openProduct}
            reviews={reviews} settings={settings}
            onBack={() => setTab(activeCategory ? "categories" : "home")}
            onAddCart={addToCart}
            onBuyNow={(p, qty, delivery) => placeOrder([{ productId: p.id, qty, product: p }], delivery)}
            onMessage={sendMessage}
            onRespondOffer={respondOffer}
            onOffer={(p, amount) => sendMessage(p.id, `Offer: ${money(amount, p.currency)}`, { type: "offer", offerAmount: amount, offerStatus: "pending", to: p.seller })}
            messages={messages.filter(m => m.productId === openProduct.id)}
            profile={profile}
          />
        )}
        {tab === "sell" && <SellView onPublish={publishListing} profile={profile} onNeedProfile={() => setTab("account")} />}
        {tab === "cart" && (
          <CartView items={cartItems} onRemove={removeFromCart} onCheckout={placeOrder} settings={settings} />
        )}
        {tab === "orders" && (
          <OrdersView buyerOrders={myOrdersAsBuyer} sellerOrders={myOrdersAsSeller}
            onAdvance={advanceOrder} onReview={leaveReview} reviews={reviews} profile={profile} />
        )}
        {tab === "account" && (
          <AccountView profile={profile} nameInput={nameInput} setNameInput={setNameInput}
            onSave={saveProfile} messages={messages} products={products} respondOffer={respondOffer}
            onShowAdmin={() => setShowAdmin(true)} email={session.user.email} onLogOut={logOut}
            support={support.filter(s => s.userId === session.user.id)} onSendSupport={sendSupportMessage} />
        )}
      </div>

      {showAdmin && (
        <AdminModal onClose={() => setShowAdmin(false)} products={products} orders={orders} settings={settings}
          onSaveSettings={persistSettings} support={support} onSendSupport={sendSupportMessage} />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
          style={{ background: COLORS.ink, color: COLORS.lime }}>{toast}</div>
      )}

      {/* bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl" style={{ background: "#fff", boxShadow: "0 -8px 24px rgba(0,0,0,0.08)" }}>
        <div className="flex items-stretch justify-around px-1 py-2">
          {[
            { id: "home", label: "Home", icon: "🏠" },
            { id: "categories", label: "Browse", icon: "🔎" },
            { id: "sell", label: "Sell", icon: "＋", highlight: true },
            { id: "orders", label: "Orders", icon: "📦" },
            { id: "account", label: "Account", icon: "👤" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition active:scale-95"
              style={
                t.highlight
                  ? { background: `linear-gradient(135deg, ${COLORS.lime}, #c2ee2e)`, boxShadow: "0 3px 10px rgba(216,255,79,0.45)" }
                  : tab === t.id ? { background: `${COLORS.teal}14` } : {}
              }>
              <span className="text-base">{t.icon}</span>
              <span className="text-[10px] font-semibold" style={{ color: tab === t.id ? COLORS.teal : COLORS.ink, opacity: tab === t.id || t.highlight ? 1 : 0.5 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- HOME ---------------- */
function HomeView({ products, onOpen, onCategory }) {
  const featured = products.slice(0, 4);
  const nearYou = [...products].reverse().slice(0, 4);
  return (
    <div>
      <div className="mb-5 p-4 rounded-2xl relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${COLORS.teal} 0%, ${COLORS.tealDark} 100%)`, color: "#fff", boxShadow: "0 8px 24px rgba(14,74,71,0.3)" }}>
        <div style={{ position: "absolute", top: -30, right: -20, width: 120, height: 120, borderRadius: 999, background: "rgba(216,255,79,0.12)" }} />
        <div className="relative flex items-center gap-2 mb-2"><Logo size={22} /><span className="text-[10px] font-semibold uppercase tracking-wide opacity-70" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>THE MARKET</span></div>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 800 }} className="relative text-lg leading-tight mb-1">Buy Direct.<br />Sell Direct.</div>
        <div className="relative text-xs opacity-80 mb-2">Every listing connects you straight to the supplier — no unnecessary middlemen.</div>
        <div className="relative"><DirectLine /></div>
      </div>

      <SectionTitle>Categories</SectionTitle>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {CATEGORIES.slice(0, 8).map(c => (
          <button key={c.id} onClick={() => onCategory(c.id)} className="flex flex-col items-center gap-1 p-2 rounded-xl transition active:scale-95"
            style={{ background: "#fff", boxShadow: "0 2px 8px rgba(20,21,15,0.06)" }}>
            <span className="text-lg">{c.icon}</span>
            <span className="text-[9px] font-medium text-center leading-tight">{c.label}</span>
          </button>
        ))}
      </div>

      <SectionTitle>Featured</SectionTitle>
      <ProductGrid products={featured} onOpen={onOpen} />

      <SectionTitle>New listings</SectionTitle>
      <ProductGrid products={nearYou} onOpen={onOpen} />
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="text-xs font-bold uppercase tracking-wide mb-2 mt-1" style={{ color: COLORS.teal, fontFamily: "'IBM Plex Mono', monospace" }}>{children}</div>;
}

function ProductGrid({ products, onOpen }) {
  if (!products.length) return <div className="text-sm opacity-50 py-6 text-center">No listings yet.</div>;
  return (
    <div className="grid grid-cols-2 gap-3 mb-2">
      {products.map(p => (
        <button key={p.id} onClick={() => onOpen(p)} className="text-left p-3 rounded-2xl transition active:scale-[0.98]" style={{ background: "#fff", boxShadow: "0 2px 10px rgba(20,21,15,0.07)" }}>
          {p.images && p.images.length ? (
            <img src={p.images[0]} alt="" className="w-12 h-12 object-cover rounded-lg" onError={e => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <Thumb color={p.color} icon={p.icon} size={48} />
          )}
          <div className="mt-2 text-xs font-semibold leading-snug line-clamp-2">{p.title}</div>
          <div className="mt-1 text-sm font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{money(p.price, p.currency)}</div>
          <div className="flex items-center gap-1 mt-1">
            <Tag tone={p.condition === "New" ? "lime" : "teal"}>{p.condition}</Tag>
          </div>
          <div className="text-[10px] opacity-60 mt-1">{p.location}</div>
        </button>
      ))}
    </div>
  );
}

/* ---------------- CATEGORIES / SEARCH ---------------- */
function CategoryView({ results, activeCategory, setActiveCategory, onOpen }) {
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: "none" }}>
        <button onClick={() => setActiveCategory(null)} className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
          style={{ background: !activeCategory ? COLORS.ink : "#fff", color: !activeCategory ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>
          All
        </button>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setActiveCategory(c.id)} className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
            style={{ background: activeCategory === c.id ? COLORS.ink : "#fff", color: activeCategory === c.id ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <div className="text-xs opacity-60 mb-2">{results.length} result{results.length !== 1 ? "s" : ""}</div>
      <ProductGrid products={results} onOpen={onOpen} />
    </div>
  );
}

/* ---------------- PRODUCT ---------------- */
function ProductView({ product: p, onBack, onAddCart, onBuyNow, onMessage, onOffer, onRespondOffer, messages, profile, reviews, settings }) {
  const [qty, setQty] = useState(1);
  const [delivery, setDelivery] = useState(p.delivery ? "delivery" : "pickup");
  const [msgText, setMsgText] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [gi, setGi] = useState(0);
  const deliveryFee = delivery === "delivery" ? (p.deliveryFee || 0) : 0;
  const total = p.price * qty + deliveryFee;
  const sellerReviews = reviews.filter(r => r.seller === p.seller);
  const avgRating = sellerReviews.length ? (sellerReviews.reduce((s, r) => s + r.rating, 0) / sellerReviews.length).toFixed(1) : null;
  const images = p.images && p.images.length ? p.images : null;
  const compliance = checkCompliance(p.category, p.country, profile?.country);
  const blocked = compliance.status === "blocked";
  const converted = profile?.currency && profile.currency !== p.currency ? convertCurrency(total, p.currency, profile.currency) : null;

  return (
    <div>
      <button onClick={onBack} className="text-sm font-semibold mb-3" style={{ color: COLORS.teal }}>← Back</button>

      {images ? (
        <div className="mb-3">
          <div className="rounded-xl overflow-hidden mb-2" style={{ aspectRatio: "4/3", background: COLORS.paper2 }}>
            <img src={images[gi]} alt={p.title} className="w-full h-full object-cover"
              onError={e => { e.currentTarget.style.display = "none"; }} />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((src, i) => (
                <button key={i} onClick={() => setGi(i)} className="rounded-lg overflow-hidden" style={{ width: 44, height: 44, border: i === gi ? `2px solid ${COLORS.teal}` : `1px solid ${COLORS.line}` }}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl p-6 flex items-center justify-center mb-3" style={{ background: p.color }}>
          <span style={{ fontSize: 64 }}>{p.icon}</span>
        </div>
      )}

      {p.videoUrl && (
        <div className="mb-3 rounded-xl overflow-hidden" style={{ background: COLORS.ink }}>
          <video controls src={p.videoUrl} className="w-full" style={{ maxHeight: 220 }} />
        </div>
      )}

      <div className="flex items-center gap-2 mb-1">
        <Tag tone={p.condition === "New" ? "lime" : "teal"}>{p.condition}</Tag>
        {p.delivery && <Tag tone="teal">Delivery available</Tag>}
      </div>
      <h1 className="text-lg font-bold mt-1 mb-1">{p.title}</h1>
      <div className="text-2xl font-bold mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: COLORS.teal }}>{money(p.price, p.currency)}</div>
      {profile?.currency && profile.currency !== p.currency && (
        <div className="text-xs opacity-50 mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          ≈ {money(convertCurrency(p.price, p.currency, profile.currency), profile.currency)} (estimate, not a live rate)
        </div>
      )}
      <p className="text-sm leading-relaxed opacity-80 mb-3">{p.description}</p>

      {compliance.status !== "allowed" && compliance.status !== "unknown" && (
        <div className="p-3 rounded-xl mb-3 text-xs" style={{ background: compliance.status === "blocked" ? `${COLORS.rust}18` : `${COLORS.teal}14`, border: `1px solid ${compliance.status === "blocked" ? COLORS.rust : COLORS.teal}` }}>
          <div className="font-semibold mb-0.5">{compliance.status === "blocked" ? "Not available to your country" : "Cross-border restriction"}</div>
          <div className="opacity-80">{compliance.note}</div>
        </div>
      )}

      <div className="p-3 rounded-xl mb-3" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-semibold">{p.seller}</div>
            <div className="text-[11px] opacity-60">{p.sellerType} · {p.location}</div>
          </div>
          <Tag tone="lime">{p.verified}</Tag>
        </div>
        {avgRating && <div className="text-xs">⭐ {avgRating} ({sellerReviews.length} review{sellerReviews.length !== 1 ? "s" : ""})</div>}
        <div className="mt-2"><DirectLine small /></div>
      </div>

      <Field label="Quantity">
        <div className="flex items-center gap-3">
          <button onClick={() => setQty(q => Math.max(1, q - 1))} className={inputCls} style={{ ...inputStyle, width: 40, textAlign: "center" }}>−</button>
          <div className="text-sm font-semibold">{qty}</div>
          <button onClick={() => setQty(q => Math.min(p.qty, q + 1))} className={inputCls} style={{ ...inputStyle, width: 40, textAlign: "center" }}>+</button>
          <span className="text-xs opacity-50">{p.qty} available</span>
        </div>
      </Field>

      {p.delivery && (
        <Field label="Delivery">
          <div className="flex gap-2">
            <button onClick={() => setDelivery("delivery")} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ background: delivery === "delivery" ? COLORS.ink : "#fff", color: delivery === "delivery" ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>
              Delivery · {money(p.deliveryFee, p.currency)}
            </button>
            <button onClick={() => setDelivery("pickup")} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ background: delivery === "pickup" ? COLORS.ink : "#fff", color: delivery === "pickup" ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>
              Pickup · Free
            </button>
          </div>
        </Field>
      )}

      <div className="p-3 rounded-xl mb-4 text-xs space-y-1" style={{ background: COLORS.paper2 }}>
        <Row label="Product price" value={money(p.price * qty, p.currency)} />
        <Row label="Delivery fee" value={money(deliveryFee, p.currency)} />
        <div style={{ borderTop: `1px solid ${COLORS.line}` }} className="pt-1 mt-1">
          <Row label="Total" value={money(total, p.currency)} bold />
        </div>
        {converted != null && <Row label={`≈ in ${profile.currency}`} value={money(converted, profile.currency)} />}
        <div className="opacity-50 pt-1">Platform commission ({(settings.commissionRate * 100).toFixed(0)}%) is deducted from the seller's payout, not added to your total.</div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <Btn variant="lime" disabled={blocked} onClick={() => onBuyNow(p, qty, delivery)}>{blocked ? "Unavailable" : "Buy Now"}</Btn>
        <Btn variant="outline" disabled={blocked} onClick={() => onAddCart(p, qty)}>Add to Cart</Btn>
      </div>

      {p.offerEnabled && (
        <div className="flex gap-2 mb-4">
          <input value={offerAmount} onChange={e => setOfferAmount(e.target.value)} placeholder={`Your offer (${p.currency})`} type="number"
            className={inputCls} style={inputStyle} />
          <Btn variant="ghost" small onClick={() => { if (offerAmount) { onOffer(p, Number(offerAmount)); setOfferAmount(""); } }}>Make Offer</Btn>
        </div>
      )}

      <SectionTitle>Message seller</SectionTitle>
      <div className="space-y-2 mb-2 max-h-40 overflow-y-auto">
        {messages.length === 0 && <div className="text-xs opacity-45">No messages yet — ask a question about this listing.</div>}
        {messages.map(m => (
          <div key={m.id} className="p-2 rounded-lg text-xs" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
            <div className="font-semibold">{m.from}{m.type === "offer" && <Tag tone="rust"> Offer</Tag>}</div>
            <div>{m.text}</div>
            {m.type === "offer" && m.offerStatus === "pending" && profile?.name === p.seller && (
              <div className="flex gap-2 mt-1">
                <Btn small variant="lime" onClick={() => onRespondOffer(m.id, "accepted")}>Accept</Btn>
                <Btn small variant="outline" onClick={() => onRespondOffer(m.id, "rejected")}>Reject</Btn>
              </div>
            )}
            {m.type === "offer" && m.offerStatus && m.offerStatus !== "pending" && (
              <div className="mt-1"><Tag tone={m.offerStatus === "accepted" ? "lime" : "rust"}>{m.offerStatus}</Tag></div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Ask a question…" className={inputCls} style={inputStyle} />
        <Btn small onClick={() => { if (msgText.trim()) { onMessage(p.id, msgText.trim()); setMsgText(""); } }}>Send</Btn>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between">
      <span className="opacity-70">{label}</span>
      <span className={bold ? "font-bold" : ""} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
    </div>
  );
}

/* ---------------- SELL ---------------- */
function SellView({ onPublish, profile, onNeedProfile }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    title: "", description: "", category: "other", condition: "New", price: "", currency: "NAD",
    qty: 1, location: "", country: "Namibia", delivery: false, deliveryFee: "", offerEnabled: false,
    color: "#0E4A47", icon: "📦", images: [], videoUrl: "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = React.useRef(null);
  const videoInputRef = React.useRef(null);
  const iconChoices = ["📦", "🚗", "📱", "💻", "🛋️", "🧱", "⚙️", "👕", "🥑", "🧸", "🏀", "🔧"];
  const colorChoices = ["#0E4A47", "#14150F", "#B4442E", "#D8FF4F", "#4C5B61"];

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const client = window.supabaseClient;
      const slots = Math.max(0, 6 - d.images.length);
      const newUrls = [];
      for (const file of files.slice(0, slots)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
        const { error } = await client.storage.from("product-images").upload(path, file);
        if (error) { console.error(error); continue; }
        const { data } = client.storage.from("product-images").getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
      setD(prev => ({ ...prev, images: [...prev.images, ...newUrls] }));
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const client = window.supabaseClient;
      const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const { error } = await client.storage.from("product-images").upload(path, file);
      if (error) { console.error(error); }
      else {
        const { data } = client.storage.from("product-images").getPublicUrl(path);
        setD(prev => ({ ...prev, videoUrl: data.publicUrl }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  if (!profile) {
    return (
      <div className="text-center py-10">
        <div className="text-sm opacity-60 mb-3">Set up your name to start selling.</div>
        <Btn variant="lime" onClick={onNeedProfile}>Go to Account</Btn>
      </div>
    );
  }

  const steps = ["Category", "Details", "Price & photos", "Delivery", "Review"];
  const canNext = [
    !!d.category,
    d.title.trim().length > 2 && d.description.trim().length > 5,
    Number(d.price) > 0 && d.location.trim().length > 1,
    true,
    true,
  ];

  return (
    <div>
      <div className="flex items-center gap-1 mb-4">
        {steps.map((s, i) => (
          <div key={s} className="flex-1 h-1 rounded-full" style={{ background: i <= step ? COLORS.teal : COLORS.line }} />
        ))}
      </div>
      <div className="text-xs font-bold uppercase mb-3" style={{ color: COLORS.teal, fontFamily: "'IBM Plex Mono', monospace" }}>
        Step {step + 1} of {steps.length} · {steps[step]}
      </div>

      {step === 0 && (
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setD({ ...d, category: c.id })} className="flex flex-col items-center gap-1 p-3 rounded-lg"
              style={{ background: d.category === c.id ? COLORS.ink : "#fff", border: `1px solid ${COLORS.line}` }}>
              <span className="text-lg">{c.icon}</span>
              <span className="text-[9px] font-medium text-center" style={{ color: d.category === c.id ? COLORS.lime : COLORS.ink }}>{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div>
          <Field label="Product title"><input className={inputCls} style={inputStyle} value={d.title} onChange={e => setD({ ...d, title: e.target.value })} placeholder="e.g. 2018 Honda Civic 1.8" /></Field>
          <Field label="Description"><textarea rows={4} className={inputCls} style={inputStyle} value={d.description} onChange={e => setD({ ...d, description: e.target.value })} placeholder="Condition, history, why you're selling…" /></Field>
          <Field label="Condition">
            <div className="flex gap-2">
              {["New", "Used"].map(c => (
                <button key={c} onClick={() => setD({ ...d, condition: c })} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: d.condition === c ? COLORS.ink : "#fff", color: d.condition === c ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>{c}</button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="flex gap-2">
            <div className="flex-[2]"><Field label="Price"><input type="number" className={inputCls} style={inputStyle} value={d.price} onChange={e => setD({ ...d, price: e.target.value })} /></Field></div>
            <div className="flex-1"><Field label="Currency">
              <select className={inputCls} style={inputStyle} value={d.currency} onChange={e => setD({ ...d, currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field></div>
          </div>
          <Field label="Quantity"><input type="number" min={1} className={inputCls} style={inputStyle} value={d.qty} onChange={e => setD({ ...d, qty: Number(e.target.value) })} /></Field>
          <div className="flex gap-2">
            <div className="flex-1"><Field label="Location"><input className={inputCls} style={inputStyle} value={d.location} onChange={e => setD({ ...d, location: e.target.value })} placeholder="City" /></Field></div>
            <div className="flex-1"><Field label="Country">
              <select className={inputCls} style={inputStyle} value={d.country} onChange={e => setD({ ...d, country: e.target.value })}>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field></div>
          </div>

          <Field label="Photos">
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
            <Btn small variant="ghost" disabled={uploading || d.images.length >= 6} onClick={() => fileInputRef.current?.click()}>
              {uploading ? "Uploading…" : "📷 Choose photos"}
            </Btn>
            {d.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {d.images.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt="" className="w-14 h-14 object-cover rounded-lg" style={{ border: `1px solid ${COLORS.line}` }}
                      onError={e => { e.currentTarget.style.opacity = 0.25; }} />
                    <button onClick={() => setD({ ...d, images: d.images.filter((_, idx) => idx !== i) })}
                      className="absolute -top-1 -right-1 rounded-full text-[10px] w-4 h-4 flex items-center justify-center"
                      style={{ background: COLORS.rust, color: "#fff" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[11px] opacity-45 mt-1">Up to 6 photos, uploaded straight from your device.</div>
          </Field>

          <Field label="Product video (optional)">
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
            {d.videoUrl ? (
              <div className="flex items-center gap-2">
                <video src={d.videoUrl} className="w-16 h-16 rounded-lg object-cover" style={{ border: `1px solid ${COLORS.line}` }} />
                <Btn small variant="outline" onClick={() => setD({ ...d, videoUrl: "" })}>Remove</Btn>
              </div>
            ) : (
              <Btn small variant="ghost" disabled={uploadingVideo} onClick={() => videoInputRef.current?.click()}>
                {uploadingVideo ? "Uploading…" : "🎥 Choose video"}
              </Btn>
            )}
            <div className="text-[11px] opacity-45 mt-1">Uploaded straight from your device. Buyers can play it on the product page.</div>
          </Field>

          {!d.images.length && (
            <>
              <Field label="Cover icon (fallback if no photos)">
                <div className="flex flex-wrap gap-2">
                  {iconChoices.map(ic => (
                    <button key={ic} onClick={() => setD({ ...d, icon: ic })} className="w-9 h-9 rounded-lg text-base"
                      style={{ background: d.icon === ic ? COLORS.ink : "#fff", border: `1px solid ${COLORS.line}` }}>{ic}</button>
                  ))}
                </div>
              </Field>
              <Field label="Card colour">
                <div className="flex gap-2">
                  {colorChoices.map(c => (
                    <button key={c} onClick={() => setD({ ...d, color: c })} className="w-8 h-8 rounded-full"
                      style={{ background: c, border: d.color === c ? `2px solid ${COLORS.ink}` : "1px solid #0002" }} />
                  ))}
                </div>
              </Field>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <Field label="Delivery">
            <div className="flex gap-2">
              <button onClick={() => setD({ ...d, delivery: false })} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ background: !d.delivery ? COLORS.ink : "#fff", color: !d.delivery ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Pickup only</button>
              <button onClick={() => setD({ ...d, delivery: true })} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ background: d.delivery ? COLORS.ink : "#fff", color: d.delivery ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Offer delivery</button>
            </div>
          </Field>
          {d.delivery && <Field label={`Delivery fee (${d.currency})`}><input type="number" className={inputCls} style={inputStyle} value={d.deliveryFee} onChange={e => setD({ ...d, deliveryFee: e.target.value })} /></Field>}
          {OFFER_CATEGORIES.has(d.category) && (
            <Field label="Allow offers">
              <div className="flex gap-2">
                <button onClick={() => setD({ ...d, offerEnabled: true })} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: d.offerEnabled ? COLORS.ink : "#fff", color: d.offerEnabled ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Yes, allow "Make an Offer"</button>
                <button onClick={() => setD({ ...d, offerEnabled: false })} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: !d.offerEnabled ? COLORS.ink : "#fff", color: !d.offerEnabled ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Fixed price only</button>
              </div>
            </Field>
          )}
          {COMPLIANCE_RULES[d.category] && (
            <div className="p-3 rounded-xl text-xs mt-1" style={{ background: `${COLORS.teal}14`, border: `1px solid ${COLORS.teal}` }}>
              <div className="font-semibold mb-0.5">Compliance note</div>
              <div className="opacity-80">{COMPLIANCE_RULES[d.category].note} Buyers outside {d.country} will see this before purchasing.</div>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="p-3 rounded-xl mb-3" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
          {d.images.length ? (
            <img src={d.images[0]} alt="" className="w-14 h-14 object-cover rounded-lg" />
          ) : (
            <Thumb color={d.color} icon={d.icon} size={56} />
          )}
          <div className="mt-2 font-bold">{d.title || "Untitled listing"}</div>
          <div className="text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{money(d.price || 0, d.currency)}</div>
          <div className="text-xs opacity-70 mt-1">{d.description}</div>
          <div className="text-xs opacity-60 mt-2">{d.location}, {d.country} · Qty {d.qty} · {d.delivery ? `Delivery ${money(d.deliveryFee || 0, d.currency)}` : "Pickup only"}</div>
          {d.images.length > 0 && <div className="text-xs opacity-60 mt-1">{d.images.length} photo{d.images.length !== 1 ? "s" : ""}{d.videoUrl ? " · video attached" : ""}</div>}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        {step > 0 && <Btn variant="ghost" onClick={() => setStep(step - 1)}>Back</Btn>}
        {step < steps.length - 1 && <Btn full variant="lime" disabled={!canNext[step]} onClick={() => setStep(step + 1)}>Continue</Btn>}
        {step === steps.length - 1 && (
          <Btn full variant="lime" onClick={() => {
            onPublish({ ...d, price: Number(d.price), deliveryFee: Number(d.deliveryFee) || 0, qty: Number(d.qty) || 1 });
          }}>
            Publish listing
          </Btn>
        )}
      </div>
    </div>
  );
}

/* ---------------- CART ---------------- */
function CartView({ items, onRemove, onCheckout, settings }) {
  const [delivery, setDelivery] = useState("delivery");
  if (!items.length) return <div className="text-center py-10 text-sm opacity-50">Your cart is empty.</div>;
  const subtotal = items.reduce((s, ci) => s + ci.product.price * ci.qty, 0);
  const deliveryFee = delivery === "delivery" ? items.reduce((s, ci) => s + (ci.product.deliveryFee || 0), 0) : 0;
  const total = subtotal + deliveryFee;
  return (
    <div>
      <SectionTitle>Cart</SectionTitle>
      <div className="space-y-2 mb-4">
        {items.map(ci => (
          <div key={ci.productId} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
            <Thumb color={ci.product.color} icon={ci.product.icon} size={44} />
            <div className="flex-1">
              <div className="text-xs font-semibold line-clamp-1">{ci.product.title}</div>
              <div className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{ci.qty} × {money(ci.product.price, ci.product.currency)}</div>
            </div>
            <button onClick={() => onRemove(ci.productId)} className="text-xs opacity-50">✕</button>
          </div>
        ))}
      </div>
      <Field label="Delivery">
        <div className="flex gap-2">
          <button onClick={() => setDelivery("delivery")} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: delivery === "delivery" ? COLORS.ink : "#fff", color: delivery === "delivery" ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Delivery</button>
          <button onClick={() => setDelivery("pickup")} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: delivery === "pickup" ? COLORS.ink : "#fff", color: delivery === "pickup" ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Pickup</button>
        </div>
      </Field>
      <div className="p-3 rounded-xl mb-3 text-xs space-y-1" style={{ background: COLORS.paper2 }}>
        <Row label="Subtotal" value={money(subtotal, items[0].product.currency)} />
        <Row label="Delivery" value={money(deliveryFee, items[0].product.currency)} />
        <div style={{ borderTop: `1px solid ${COLORS.line}` }} className="pt-1 mt-1"><Row label="Total" value={money(total, items[0].product.currency)} bold /></div>
      </div>
      <Btn full variant="lime" onClick={() => onCheckout(items, delivery)}>Checkout</Btn>
    </div>
  );
}

/* ---------------- ORDERS ---------------- */
function OrdersView({ buyerOrders, sellerOrders, onAdvance, onReview, reviews, profile }) {
  const [view, setView] = useState("buying");
  const [reviewFor, setReviewFor] = useState(null);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");

  if (!profile) return <div className="text-center py-10 text-sm opacity-50">Set up your account to see orders.</div>;

  const list = view === "buying" ? buyerOrders : sellerOrders;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView("buying")} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: view === "buying" ? COLORS.ink : "#fff", color: view === "buying" ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Buying ({buyerOrders.length})</button>
        <button onClick={() => setView("selling")} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: view === "selling" ? COLORS.ink : "#fff", color: view === "selling" ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Selling ({sellerOrders.length})</button>
      </div>

      {list.length === 0 && <div className="text-center py-10 text-sm opacity-50">No orders yet.</div>}

      <div className="space-y-3">
        {list.map(o => {
          const already = reviews.find(r => r.orderId === o.id);
          return (
            <div key={o.id} className="p-3 rounded-xl" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-semibold">{o.productTitle}</div>
                  <div className="text-[11px] opacity-60">{view === "buying" ? `Seller: ${o.seller}` : `Buyer: ${o.buyer}`}</div>
                </div>
                <div className="text-sm font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{money(o.total, o.currency)}</div>
              </div>
              <div className="mb-2"><Stepper status={o.status} /></div>
              {view === "selling" && (
                <div className="text-[11px] opacity-60 mb-2">
                  Commission ({o.currency} {o.commission}) deducted · Payout {money(o.sellerPayout, o.currency)}
                </div>
              )}
              {view === "selling" && o.status !== "Delivered" && (
                <Btn small variant="ghost" onClick={() => onAdvance(o.id)}>Mark as: {TRACK_STAGES[TRACK_STAGES.indexOf(o.status) + 1]}</Btn>
              )}
              {view === "buying" && o.status === "Delivered" && !already && (
                reviewFor === o.id ? (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setRating(n)} className="text-lg">{n <= rating ? "⭐" : "☆"}</button>
                      ))}
                    </div>
                    <textarea className={inputCls} style={inputStyle} rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="How was it?" />
                    <Btn small variant="lime" onClick={() => { onReview(o.id, rating, text); setReviewFor(null); setText(""); }}>Submit review</Btn>
                  </div>
                ) : <Btn small variant="ghost" onClick={() => setReviewFor(o.id)}>Leave a review</Btn>
              )}
              {already && <Tag tone="lime">Reviewed ⭐{already.rating}</Tag>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- ACCOUNT ---------------- */
function AccountView({ profile, nameInput, setNameInput, onSave, messages, products, respondOffer, onShowAdmin, email, onLogOut, support, onSendSupport }) {
  const myOfferMsgs = messages.filter(m => m.type === "offer" && m.to === profile?.name);
  const [supportText, setSupportText] = useState("");
  return (
    <div>
      {!profile ? (
        <div className="p-4 rounded-xl" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
          <div className="text-xs opacity-50 mb-1">Signed in as {email}</div>
          <div className="text-sm font-semibold mb-2">Welcome — what should we call you?</div>
          <input className={inputCls} style={inputStyle} value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Your name" />
          <div className="mt-2 flex gap-2">
            <Btn variant="lime" full onClick={() => nameInput.trim() && onSave({ name: nameInput.trim(), role: "individual", verified: "Unverified" })}>Save</Btn>
          </div>
        </div>
      ) : (
        <div>
          <div className="p-4 rounded-xl mb-4" style={{ background: COLORS.ink, color: "#fff" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-2" style={{ background: COLORS.lime, color: COLORS.ink }}>
              {profile.name[0].toUpperCase()}
            </div>
            <div className="font-bold">{profile.name}</div>
            <div className="text-xs opacity-70">{email}</div>
            <div className="text-xs opacity-70">{profile.role === "business" ? "Business seller" : "Individual"} · {profile.verified}</div>
          </div>

          <SectionTitle>Seller type</SectionTitle>
          <div className="flex gap-2 mb-4">
            {["individual", "business"].map(r => (
              <button key={r} onClick={() => onSave({ ...profile, role: r })} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold capitalize"
                style={{ background: profile.role === r ? COLORS.ink : "#fff", color: profile.role === r ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>{r}</button>
            ))}
          </div>

          <SectionTitle>Your country</SectionTitle>
          <div className="mb-1">
            <select className={inputCls} style={inputStyle} value={profile.country || ""} onChange={e => onSave({ ...profile, country: e.target.value, currency: profile.currency || COUNTRY_CURRENCY[e.target.value] })}>
              <option value="" disabled>Select country…</option>
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="text-[11px] opacity-45 mb-4">Used to check delivery eligibility and import rules on cross-border listings.</div>

          <SectionTitle>Preferred currency</SectionTitle>
          <div className="flex flex-wrap gap-2 mb-1">
            {CURRENCIES.map(c => (
              <button key={c} onClick={() => onSave({ ...profile, currency: c })} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: profile.currency === c ? COLORS.ink : "#fff", color: profile.currency === c ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>{c}</button>
            ))}
          </div>
          <div className="text-[11px] opacity-45 mb-4">Shows an estimated conversion next to listings priced in another currency. Rates are static demo values, not live.</div>

          {myOfferMsgs.length > 0 && (
            <>
              <SectionTitle>Offers on your listings</SectionTitle>
              <div className="space-y-2 mb-4">
                {myOfferMsgs.map(m => {
                  const p = products.find(pp => pp.id === m.productId);
                  return (
                    <div key={m.id} className="p-2 rounded-lg text-xs" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
                      <div className="font-semibold">{p?.title}</div>
                      <div>{m.from}: {m.text}</div>
                      {m.offerStatus === "pending" ? (
                        <div className="flex gap-2 mt-1">
                          <Btn small variant="lime" onClick={() => respondOffer(m.id, "accepted")}>Accept</Btn>
                          <Btn small variant="outline" onClick={() => respondOffer(m.id, "rejected")}>Reject</Btn>
                        </div>
                      ) : <Tag tone={m.offerStatus === "accepted" ? "lime" : "rust"}>{m.offerStatus}</Tag>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <SectionTitle>Help & support</SectionTitle>
          <div className="p-3 rounded-xl mb-2" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
            {support.length === 0 && <div className="text-xs opacity-45 mb-2">Have a question or ran into a problem? Message THE MARKET team directly.</div>}
            <div className="space-y-2 mb-2 max-h-48 overflow-y-auto">
              {support.map(m => (
                <div key={m.id} className={`p-2 rounded-lg text-xs ${m.from === "admin" ? "" : ""}`}
                  style={{ background: m.from === "admin" ? COLORS.paper2 : "#fff", border: `1px solid ${COLORS.line}` }}>
                  <div className="font-semibold">{m.from === "admin" ? "THE MARKET support" : "You"}</div>
                  <div>{m.text}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={inputCls} style={inputStyle} value={supportText} onChange={e => setSupportText(e.target.value)} placeholder="Message support…" />
              <Btn small onClick={() => { if (supportText.trim()) { onSendSupport(supportText.trim()); setSupportText(""); } }}>Send</Btn>
            </div>
          </div>

          <SectionTitle>Platform</SectionTitle>
          <Btn variant="ghost" full onClick={onShowAdmin}>Open admin dashboard</Btn>
          <div className="mt-2"><Btn variant="outline" full onClick={onLogOut}>Log out</Btn></div>
        </div>
      )}
    </div>
  );
}

/* ---------------- ADMIN ---------------- */
function AdminModal({ onClose, products, orders, settings, onSaveSettings, support, onSendSupport }) {
  const [rate, setRate] = useState((settings.commissionRate * 100).toString());
  const [replyText, setReplyText] = useState({});
  const totalGMV = orders.reduce((s, o) => s + o.subtotal, 0);
  const totalCommission = orders.reduce((s, o) => s + o.commission, 0);
  const sellers = new Set(products.map(p => p.seller)).size;
  const byCategory = CATEGORIES.map(c => ({ ...c, count: products.filter(p => p.category === c.id).length })).sort((a, b) => b.count - a.count).slice(0, 5);
  const threads = {};
  support.forEach(m => { (threads[m.userId] = threads[m.userId] || []).push(m); });
  const openThreads = Object.entries(threads);

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "#00000066" }}>
      <div className="w-full rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto" style={{ background: COLORS.paper }}>
        <div className="flex justify-between items-center mb-3">
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 800 }} className="text-base">Admin</div>
          <button onClick={onClose} className="text-sm opacity-60">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <Stat label="Listings" value={products.length} />
          <Stat label="Sellers" value={sellers} />
          <Stat label="Orders" value={orders.length} />
          <Stat label="Commission earned" value={totalCommission.toFixed(2)} />
        </div>

        <SectionTitle>Top categories</SectionTitle>
        <div className="space-y-1 mb-4">
          {byCategory.map(c => (
            <div key={c.id} className="flex justify-between text-xs p-2 rounded-lg" style={{ background: "#fff" }}>
              <span>{c.icon} {c.label}</span><span className="font-semibold">{c.count}</span>
            </div>
          ))}
        </div>

        <SectionTitle>Commission rate (default)</SectionTitle>
        <div className="flex gap-2 mb-2">
          <input type="number" className={inputCls} style={inputStyle} value={rate} onChange={e => setRate(e.target.value)} />
          <Btn small variant="lime" onClick={() => onSaveSettings({ ...settings, commissionRate: Number(rate) / 100 })}>Save %</Btn>
        </div>
        <div className="text-[11px] opacity-50 mb-4">Configurable per seller type, category, country or negotiated deal in the full build — this demo applies one global default rate.</div>

        <SectionTitle>GMV</SectionTitle>
        <div className="text-sm font-bold mb-4" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{totalGMV.toLocaleString()}</div>

        <SectionTitle>Compliance rules (cross-border)</SectionTitle>
        <div className="space-y-1 mb-2">
          {Object.entries(COMPLIANCE_RULES).map(([cat, rule]) => (
            <div key={cat} className="p-2 rounded-lg text-xs" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
              <div className="flex justify-between">
                <span className="font-semibold capitalize">{cat.replace("-", " ")}</span>
                <Tag tone={rule.crossBorder === "blocked" ? "rust" : "teal"}>{rule.crossBorder}</Tag>
              </div>
              <div className="opacity-60 mt-0.5">{rule.note}</div>
            </div>
          ))}
        </div>
        <div className="text-[11px] opacity-45">Demo rule set only — a production compliance engine needs country-specific legal review before each market launch (spec section 9).</div>

        <SectionTitle>Support inbox</SectionTitle>
        {openThreads.length === 0 && <div className="text-xs opacity-45 mb-2">No support messages yet.</div>}
        <div className="space-y-3 mb-2">
          {openThreads.map(([userId, msgs]) => (
            <div key={userId} className="p-2 rounded-lg" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
              <div className="text-xs font-semibold mb-1">{msgs[msgs.length - 1].userName}</div>
              <div className="space-y-1 mb-2">
                {msgs.map(m => (
                  <div key={m.id} className="text-xs p-1.5 rounded" style={{ background: m.from === "admin" ? COLORS.paper2 : COLORS.paper }}>
                    <span className="font-semibold">{m.from === "admin" ? "You: " : ""}</span>{m.text}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className={inputCls} style={inputStyle} value={replyText[userId] || ""} onChange={e => setReplyText({ ...replyText, [userId]: e.target.value })} placeholder="Reply…" />
                <Btn small variant="lime" onClick={() => { if (replyText[userId]?.trim()) { onSendSupport(replyText[userId].trim(), "admin", userId); setReplyText({ ...replyText, [userId]: "" }); } }}>Reply</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
      <div className="text-[10px] uppercase opacity-50" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
