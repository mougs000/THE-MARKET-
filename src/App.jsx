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

const THEME_PRESETS = {
  sunset: { name: "Sunset", ink: "#3A3A38", paper: "#FAF8F4", paper2: "#F0EAE0", teal: "#E8862B", tealDark: "#C96A1B", lime: "#FFC93C", line: "#E6DFD2" },
  ocean: { name: "Ocean", ink: "#1E2A38", paper: "#F3F7FA", paper2: "#E5EEF3", teal: "#1D6FA5", tealDark: "#154F78", lime: "#4FD1C5", line: "#D9E4EA" },
  forest: { name: "Forest", ink: "#23321F", paper: "#F5F7F0", paper2: "#E8EDE0", teal: "#3F7D32", tealDark: "#2C5A22", lime: "#A8E063", line: "#DDE5D0" },
  berry: { name: "Berry", ink: "#2E1F33", paper: "#FAF5FA", paper2: "#F0E4F0", teal: "#8E3B8F", tealDark: "#6B2B6C", lime: "#FF7FC1", line: "#ECDCEC" },
};

function applyTheme(theme) {
  // theme is either { preset: 'ocean' } or { custom: { teal, lime } }
  if (theme?.preset && THEME_PRESETS[theme.preset]) {
    Object.assign(COLORS, THEME_PRESETS[theme.preset]);
  } else if (theme?.custom) {
    Object.assign(COLORS, THEME_PRESETS.sunset, theme.custom);
  } else {
    Object.assign(COLORS, THEME_PRESETS.sunset);
  }
}

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

const CURRENCIES = ["NAD", "ZAR", "USD", "GBP", "EUR", "CNY", "NGN", "KES", "GHS", "EGP", "BWP", "ZMW", "TZS", "MZN", "AOA"];
const OFFER_CATEGORIES = new Set(["vehicles", "machinery", "furniture", "electronics", "computers", "industrial"]);
const TRACK_STAGES = [
  "Order placed", "Seller confirmed", "Preparing order", "Ready for collection",
  "Collected", "In transit", "Out for delivery", "Delivered",
];

/* ---------- countries / currency conversion (illustrative, static rates) ---------- */
const COUNTRIES = [
  "Namibia", "South Africa", "United States", "United Kingdom", "Germany", "China",
  "Nigeria", "Kenya", "Ghana", "Egypt", "Botswana", "Zambia", "Tanzania", "Zimbabwe", "Mozambique", "Angola",
];
const COUNTRY_CURRENCY = {
  Namibia: "NAD", "South Africa": "ZAR", "United States": "USD", "United Kingdom": "GBP", Germany: "EUR",
  China: "CNY", Nigeria: "NGN", Kenya: "KES", Ghana: "GHS", Egypt: "EGP", Botswana: "BWP",
  Zambia: "ZMW", Tanzania: "TZS", Zimbabwe: "USD", Mozambique: "MZN", Angola: "AOA",
};
// Value of 1 unit of each currency, expressed in USD. Static estimates for demo purposes only — a
// production build would call a live FX-rate provider (see architecture doc, "Currency service").
const USD_VALUE = {
  NAD: 0.055, ZAR: 0.055, USD: 1, GBP: 1.27, EUR: 1.09, CNY: 0.14, NGN: 0.00062, KES: 0.0077,
  GHS: 0.067, EGP: 0.020, BWP: 0.073, ZMW: 0.037, TZS: 0.00040, MZN: 0.0157, AOA: 0.0011,
};
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

const DEFAULT_BANK_DETAILS = {
  bankName: "FNB Namibia",
  accountName: "Morgen Salmon Haraseb",
  accountNumber: "64282513968",
  accountType: "Gold Lifestyle",
  branchCode: "280172",
};

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

function CategoryIcon({ id, size = 22, color = COLORS.ink }) {
  const s = { stroke: color, strokeWidth: 2, fill: "none", strokeLinejoin: "round", strokeLinecap: "round" };
  const paths = {
    vehicles: <g><path d="M4 16 L5.5 10 Q6 8.5 8 8.5 H18 Q20 8.5 20.5 10 L22 16" {...s} /><rect x="3" y="16" width="20" height="4.5" rx="1.5" fill={color} /><circle cx="7.5" cy="21" r="2.2" fill={color} /><circle cx="18.5" cy="21" r="2.2" fill={color} /></g>,
    electronics: <g><rect x="7" y="4" width="12" height="7" rx="1.5" {...s} /><path d="M13 11 V16" {...s} /><path d="M9 16 H17 M9 20 H17" {...s} /><path d="M13 20 V22.5" {...s} /></g>,
    phones: <g><rect x="8" y="3" width="10" height="20" rx="2.5" {...s} /><circle cx="13" cy="19.5" r="1.3" fill={color} /></g>,
    computers: <g><rect x="4" y="5" width="18" height="12" rx="1.5" {...s} /><path d="M2 20.5 H24 L22 17.5 H4 Z" fill={color} /></g>,
    clothing: <path d="M9 3 L13 6 L17 3 L22 7 L19 10.5 L17 9 V22 H9 V9 L7 10.5 L4 7 Z" {...s} />,
    furniture: <g><path d="M6 12 V6.5 Q6 4.5 8 4.5 H18 Q20 4.5 20 6.5 V12" {...s} /><rect x="4" y="12" width="18" height="6.5" rx="1.5" {...s} /><path d="M5.5 18.5 V22 M20.5 18.5 V22" {...s} /></g>,
    "home-garden": <g><path d="M13 22 V13" {...s} /><path d="M13 13 C13 13 6 12 6 5 C13 5 13 13 13 13 Z" fill={color} /><path d="M13 15 C13 15 20 13 20 8 C13 8 13 15 13 15 Z" fill={color} /></g>,
    machinery: <g><path d="M13 4 L14.5 6.5 L17.3 5.7 L17.7 8.6 L20.5 9.4 L19.2 12 L21 14.3 L18.4 15.6 L18.2 18.5 L15.3 18 L13.8 20.5 L13 17.7 L12.2 20.5 L10.7 18 L7.8 18.5 L7.6 15.6 L5 14.3 L6.8 12 L5.5 9.4 L8.3 8.6 L8.7 5.7 L11.5 6.5 Z" stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round" /><circle cx="13" cy="13" r="3.2" fill={color} /></g>,
    tools: <path d="M17 4 C19.5 4 21.5 6 21.5 8.5 C21.5 9.6 21.1 10.6 20.4 11.4 L11.5 20.3 C10.7 21.1 9.4 21.1 8.6 20.3 C7.8 19.5 7.8 18.2 8.6 17.4 L17.5 8.5 C16.9 7.4 17 6 17.9 5.1 C17.6 4.7 17.3 4.3 17 4 Z" {...s} />,
    agriculture: <g><path d="M13 22 V10" {...s} /><path d="M13 10 C13 10 8 9 8 4 C13 4 13 10 13 10 Z" fill={color} /><path d="M13 13 C13 13 18 12 18 7 C13 7 13 13 13 13 Z" fill={color} /></g>,
    building: <g><rect x="5" y="9" width="16" height="13" {...s} /><path d="M5 9 L13 3 L21 9" {...s} /><rect x="11" y="15" width="4" height="7" fill={color} /></g>,
    sports: <g><circle cx="13" cy="13" r="9" {...s} /><path d="M13 4 V22 M4 13 H22 M6.5 6.5 Q13 13 19.5 6.5 M6.5 19.5 Q13 13 19.5 19.5" stroke={color} strokeWidth="1.4" fill="none" /></g>,
    "baby-kids": <g><path d="M10 3 H16 V6 H10 Z" fill={color} /><rect x="9" y="6" width="8" height="15" rx="3" {...s} /><path d="M9 12 H17" {...s} /></g>,
    food: <g><path d="M8 3 V12 M6 3 V9 Q6 12 8 12 M10 3 V9 Q10 12 8 12" stroke={color} strokeWidth="1.8" fill="none" /><path d="M8 12 V22" {...s} /><path d="M18 3 C15 3 15 8 15 10 C15 11.5 16 12 17 12 V22" stroke={color} strokeWidth="1.8" fill="none" /></g>,
    industrial: <g><path d="M4 22 V13 L10 16.5 V13 L16 16.5 V10 L22 13 V22 Z" {...s} /><path d="M6 10 V6 M6 6 L4.5 4.5 M6 6 L7.5 4.5" stroke={color} strokeWidth="1.6" fill="none" /></g>,
    "auto-parts": <path d="M9 4 H17 L19 8 L17 10 V13 L19 15 L17 19 H9 L7 15 L9 13 V10 L7 8 Z M13 8.5 A3 3 0 1 0 13 14.5 A3 3 0 1 0 13 8.5 Z" {...s} />,
    services: <g><path d="M6 6 L14 14 M11.5 4.5 C13.3 6.3 13.3 7.7 11.5 9.5 C9.7 11.3 8.3 11.3 6.5 9.5 C4.7 7.7 4.7 6.3 6.5 4.5 C8.3 2.7 9.7 2.7 11.5 4.5 Z" {...s} /><path d="M17 12 L21.5 16.5 C22.2 17.2 22.2 18.3 21.5 19 C20.8 19.7 19.7 19.7 19 19 L14.5 14.5" {...s} /></g>,
    other: <g><circle cx="7" cy="13" r="2" fill={color} /><circle cx="13" cy="13" r="2" fill={color} /><circle cx="19" cy="13" r="2" fill={color} /></g>,
  };
  return <svg width={size} height={size} viewBox="0 0 26 26">{paths[id] || paths.other}</svg>;
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

function Thumb({ src, size = 64, rounded = 12 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: rounded, overflow: "hidden", flexShrink: 0,
      background: COLORS.paper2, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {src
        ? <img src={src} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.opacity = 0.12; }} />
        : <span style={{ fontSize: size * 0.34, opacity: 0.25 }}>🖼️</span>}
    </div>
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
function AuthView({ onClose }) {
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
      else if (onClose) onClose();
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

      {onClose && (
        <button onClick={onClose} className="absolute top-5 right-5 text-sm font-semibold" style={{ color: "#fff", opacity: 0.7, zIndex: 10 }}>✕ Close</button>
      )}

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
  const [settings, setSettings] = useState({ commissionRate: 0.01, bankDetails: DEFAULT_BANK_DETAILS, trustedFollowerThreshold: 100 });
  const [support, setSupport] = useState([]);
  const [follows, setFollows] = useState([]);
  const [profile, setProfile] = useState(null);
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [openProduct, setOpenProduct] = useState(null);
  const [viewingSeller, setViewingSeller] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [toast, setToast] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [themeTick, setThemeTick] = useState(0);
  const [saving, setSaving] = useState(false);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  useEffect(() => {
    const client = window.supabaseClient;
    if (!client) { setSession(null); return; }
    client.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = client.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Public data — loads immediately so anyone can browse without signing in.
  useEffect(() => {
    (async () => {
      const [p, o, m, r, s, sup, fol] = await Promise.all([
        loadShared("products", null),
        loadShared("orders", []),
        loadShared("messages", []),
        loadShared("reviews", []),
        loadShared("settings", { commissionRate: 0.01, bankDetails: DEFAULT_BANK_DETAILS, trustedFollowerThreshold: 100 }),
        loadShared("support", []),
        loadShared("follows", []),
      ]);
      if (!p) { setProducts(SEED_PRODUCTS); await saveShared("products", SEED_PRODUCTS); }
      else setProducts(p);
      setOrders(o); setMessages(m); setReviews(r);
      setSettings({ commissionRate: 0.01, bankDetails: DEFAULT_BANK_DETAILS, trustedFollowerThreshold: 100, ...s });
      setSupport(sup);
      setFollows(fol);
      setReady(true);
    })();
  }, []);

  // Personal data — only once signed in.
  useEffect(() => {
    if (!session) { setProfile(null); setCart([]); applyTheme(null); setThemeTick(t => t + 1); return; }
    const userId = session.user.id;
    (async () => {
      const [prof, c] = await Promise.all([
        loadPersonal(`profile:${userId}`, null),
        loadPersonal(`cart:${userId}`, []),
      ]);
      setProfile(prof ? { ...prof, email: session.user.email } : prof); setCart(c);
      applyTheme(prof?.theme); setThemeTick(t => t + 1);
    })();
  }, [session]);

  const setTheme = async (theme) => {
    applyTheme(theme); setThemeTick(t => t + 1);
    if (profile) await saveProfile({ ...profile, theme });
  };

  const persistProducts = async (next) => { setProducts(next); await saveShared("products", next); };
  const persistOrders = async (next) => { setOrders(next); await saveShared("orders", next); };
  const persistMessages = async (next) => { setMessages(next); await saveShared("messages", next); };
  const persistReviews = async (next) => { setReviews(next); await saveShared("reviews", next); };
  const persistSettings = async (next) => { setSettings(next); await saveShared("settings", next); };
  const persistSupport = async (next) => { setSupport(next); await saveShared("support", next); };
  const sendSupportMessage = async (text, from = "user", targetUserId = null) => {
    if (!session) { setShowAuthPrompt(true); return; }
    const msg = { id: uid(), userId: targetUserId || session.user.id, userName: profile?.name || session.user.email, from, text, createdAt: Date.now() };
    await persistSupport([...support, msg]);
  };
  const persistFollows = async (next) => { setFollows(next); await saveShared("follows", next); };
  const toggleFollow = async (sellerName) => {
    if (!ensureProfile()) return;
    if (sellerName === profile.name) return;
    const existing = follows.find(f => f.followerId === session.user.id && f.sellerName === sellerName);
    if (existing) {
      await persistFollows(follows.filter(f => f.id !== existing.id));
    } else {
      await persistFollows([...follows, { id: uid(), followerId: session.user.id, followerName: profile.name, sellerName, createdAt: Date.now() }]);
    }
  };
  const activatePremium = async () => {
    if (!ensureProfile()) return;
    const current = profile.premiumUntil && profile.premiumUntil > Date.now() ? profile.premiumUntil : Date.now();
    await saveProfile({ ...profile, premiumUntil: current + 30 * 24 * 60 * 60 * 1000 });
    flash("Premium activated for 30 days");
  };
  const persistCart = async (next) => { setCart(next); if (session) await savePersonal(`cart:${session.user.id}`, next); };

  const saveProfile = async (p) => { setProfile(p); if (session) await savePersonal(`profile:${session.user.id}`, p); };

  const logOut = async () => {
    await window.supabaseClient.auth.signOut();
    setProfile(null); setCart([]); setOrders([]); setReady(false);
  };

  const results = useMemo(() => {
    let list = products.filter(p => p.status !== "sold" && p.status !== "removed");
    if (activeCategory) list = list.filter(p => p.category === activeCategory);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.includes(q));
    }
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [products, activeCategory, query]);

  const myListings = profile ? products.filter(p => p.seller === profile.name) : [];

  const cartItems = cart.map(ci => ({ ...ci, product: products.find(p => p.id === ci.productId) })).filter(ci => ci.product);
  const cartCount = cartItems.reduce((n, ci) => n + ci.qty, 0);

  const myOrdersAsBuyer = orders.filter(o => o.buyer === profile?.name);
  const myOrdersAsSeller = orders.filter(o => o.seller === profile?.name);

  const ensureProfile = () => {
    if (!session) { setShowAuthPrompt(true); return false; }
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
    const reference = `MKT-${Date.now().toString(36).toUpperCase()}`;
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
        paymentMethod: "eft", paymentConfirmed: false, paymentReference: reference,
        commissionPaid: false,
        sellerBankDetails: p.sellerBankDetails || null,
      };
    });
    await persistOrders([...newOrders, ...orders]);
    await persistCart(cart.filter(c => !items.find(i => i.productId === c.productId)));
    flash(`Order${newOrders.length > 1 ? "s" : ""} placed`);
    setTab("orders");
  };

  const confirmPayment = async (orderId) => {
    const next = orders.map(o => o.id === orderId ? { ...o, paymentConfirmed: true } : o);
    await persistOrders(next);
    flash("Payment marked as received");
  };

  const markCommissionPaid = async (orderIds) => {
    const idSet = new Set(orderIds);
    const next = orders.map(o => idSet.has(o.id) ? { ...o, commissionPaid: true } : o);
    await persistOrders(next);
    flash("Commission marked as paid");
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
      verified: profile.verified || "Unverified", createdAt: Date.now(), status: "active",
      sellerBankDetails: profile.bankDetails || null,
      sellerPremiumUntil: profile.premiumUntil || null,
    };
    await persistProducts([p, ...products]);
    flash("Listing published");
    setTab("home");
  };

  const markListingSold = async (productId) => {
    await persistProducts(products.map(p => p.id === productId ? { ...p, status: "sold" } : p));
    flash("Marked as sold");
  };

  const deleteListing = async (productId) => {
    await persistProducts(products.filter(p => p.id !== productId));
    flash("Listing deleted");
  };

  const relistListing = async (productId) => {
    await persistProducts(products.map(p => p.id === productId ? { ...p, status: "active" } : p));
    flash("Listing is active again");
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

  if (!ready) {
    return (
      <div style={{ background: COLORS.paper, minHeight: "100vh" }} className="flex items-center justify-center">
        <style>{FONT_IMPORT}</style>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 800, color: COLORS.ink }} className="text-xl animate-pulse">THE MARKET</div>
      </div>
    );
  }

  if (showAuthPrompt) return <AuthView onClose={() => setShowAuthPrompt(false)} />;

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
            <button onClick={() => session ? setTab("cart") : setShowAuthPrompt(true)} className="relative px-2.5 py-1.5 rounded-xl transition active:scale-95" style={{ background: "rgba(255,255,255,0.08)" }}>
              <span style={{ color: "#fff" }} className="text-sm">🛒</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: COLORS.lime, color: COLORS.ink, width: 16, height: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>{cartCount}</span>
              )}
            </button>
            {session ? (
              <button onClick={() => setTab("account")} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition active:scale-95"
                style={{ background: COLORS.lime, color: COLORS.ink, boxShadow: "0 2px 8px rgba(216,255,79,0.35)" }}>
                {profile?.name ? profile.name[0].toUpperCase() : "?"}
              </button>
            ) : (
              <button onClick={() => setShowAuthPrompt(true)} className="px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95"
                style={{ background: COLORS.lime, color: COLORS.ink, boxShadow: "0 2px 8px rgba(216,255,79,0.35)" }}>
                Sign In
              </button>
            )}
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
            onCategory={c => { setActiveCategory(c); setTab("categories"); }} onShowSafety={() => setShowSafety(true)} />
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
            follows={follows} onToggleFollow={toggleFollow} session={session}
            onOpenSeller={(sellerName) => { setViewingSeller(sellerName); setTab("seller"); }}
          />
        )}
        {tab === "seller" && viewingSeller && (
          <SellerView sellerName={viewingSeller} products={products} reviews={reviews} follows={follows}
            onToggleFollow={toggleFollow} session={session} settings={settings} profile={profile}
            onBack={() => setTab("product")}
            onOpen={p => { setOpenProduct(p); setTab("product"); }}
          />
        )}
        {tab === "sell" && <SellView onPublish={publishListing} profile={profile} onNeedProfile={() => setTab("account")} />}
        {tab === "cart" && (
          <CartView items={cartItems} onRemove={removeFromCart} onCheckout={placeOrder} settings={settings} />
        )}
        {tab === "orders" && (
          <OrdersView buyerOrders={myOrdersAsBuyer} sellerOrders={myOrdersAsSeller}
            onAdvance={advanceOrder} onReview={leaveReview} reviews={reviews} profile={profile}
            onConfirmPayment={confirmPayment} onMarkCommissionPaid={markCommissionPaid}
            platformBank={settings.bankDetails || DEFAULT_BANK_DETAILS} />
        )}
        {tab === "account" && (
          <AccountView profile={profile} nameInput={nameInput} setNameInput={setNameInput}
            onSave={saveProfile} messages={messages} products={products} respondOffer={respondOffer}
            onShowAdmin={() => setShowAdmin(true)} email={session?.user?.email} onLogOut={logOut}
            support={support.filter(s => s.userId === session?.user?.id)} onSendSupport={sendSupportMessage}
            myListings={myListings} onMarkSold={markListingSold} onDeleteListing={deleteListing} onRelist={relistListing}
            onShowSafety={() => setShowSafety(true)} onSetTheme={setTheme} onActivatePremium={activatePremium} />
        )}
      </div>

      {showAdmin && (
        <AdminModal onClose={() => setShowAdmin(false)} products={products} orders={orders} settings={settings}
          onSaveSettings={persistSettings} support={support} onSendSupport={sendSupportMessage}
          onMarkSold={markListingSold} onDeleteListing={deleteListing} onRelist={relistListing} />
      )}

      {showSafety && <SafetyModal onClose={() => setShowSafety(false)} />}

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
            { id: "sell", label: "Sell", icon: "＋", highlight: true, needsAuth: true },
            { id: "orders", label: "Orders", icon: "📦", needsAuth: true },
            { id: "account", label: "Account", icon: "👤", needsAuth: true },
          ].map(t => (
            <button key={t.id} onClick={() => (t.needsAuth && !session) ? setShowAuthPrompt(true) : setTab(t.id)}
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
function HomeView({ products, onOpen, onCategory, onShowSafety }) {
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

      <button onClick={onShowSafety} className="w-full text-left p-2.5 rounded-xl mb-5 flex items-center gap-2 text-xs" style={{ background: `${COLORS.rust}12`, border: `1px solid ${COLORS.rust}40` }}>
        <span>⚠️</span>
        <span className="flex-1" style={{ color: COLORS.rust }}>Trade safely — read our fraud tips &amp; terms before you buy or sell</span>
        <span style={{ color: COLORS.rust }}>→</span>
      </button>

      <SectionTitle>Categories</SectionTitle>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {CATEGORIES.slice(0, 8).map(c => (
          <button key={c.id} onClick={() => onCategory(c.id)} className="flex flex-col items-center gap-1 p-2 rounded-xl transition active:scale-95"
            style={{ background: "#fff", boxShadow: "0 2px 8px rgba(20,21,15,0.06)" }}>
            <CategoryIcon id={c.id} size={22} color={COLORS.teal} />
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
      {products.map(p => {
        const img = p.images && p.images.length ? p.images[0] : null;
        return (
          <button key={p.id} onClick={() => onOpen(p)} className="text-left rounded-2xl overflow-hidden transition active:scale-[0.98]" style={{ background: "#fff", boxShadow: "0 2px 10px rgba(20,21,15,0.07)" }}>
            <div className="relative" style={{ aspectRatio: "4/5", background: COLORS.paper2 }}>
              {img ? (
                <img src={img} alt={p.title} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ fontSize: 28, opacity: 0.2 }}>🖼️</div>
              )}
              {p.condition === "New" && <div className="absolute top-2 left-2"><Tag tone="lime">New</Tag></div>}
            </div>
            <div className="px-2.5 py-2">
              <div className="text-sm font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: COLORS.teal }}>{money(p.price, p.currency)}</div>
            </div>
          </button>
        );
      })}
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
          <button key={c.id} onClick={() => setActiveCategory(c.id)} className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5"
            style={{ background: activeCategory === c.id ? COLORS.ink : "#fff", color: activeCategory === c.id ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>
            <CategoryIcon id={c.id} size={13} color={activeCategory === c.id ? COLORS.lime : COLORS.ink} /> {c.label}
          </button>
        ))}
      </div>
      <div className="text-xs opacity-60 mb-2">{results.length} result{results.length !== 1 ? "s" : ""}</div>
      <ProductGrid products={results} onOpen={onOpen} />
    </div>
  );
}

/* ---------------- PRODUCT ---------------- */
function ProductView({ product: p, onBack, onAddCart, onBuyNow, onMessage, onOffer, onRespondOffer, messages, profile, reviews, settings, follows, onToggleFollow, session, onOpenSeller }) {
  const [qty, setQty] = useState(1);
  const [delivery, setDelivery] = useState(p.delivery ? "delivery" : "pickup");
  const [msgText, setMsgText] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [showEft, setShowEft] = useState(false);
  const deliveryFee = delivery === "delivery" ? (p.deliveryFee || 0) : 0;
  const total = p.price * qty + deliveryFee;
  const sellerReviews = reviews.filter(r => r.seller === p.seller);
  const avgRating = sellerReviews.length ? (sellerReviews.reduce((s, r) => s + r.rating, 0) / sellerReviews.length).toFixed(1) : null;
  const images = p.images && p.images.length ? p.images : null;
  const compliance = checkCompliance(p.category, p.country, profile?.country);
  const blocked = compliance.status === "blocked";
  const converted = profile?.currency && profile.currency !== p.currency ? convertCurrency(total, p.currency, profile.currency) : null;
  const followerCount = follows.filter(f => f.sellerName === p.seller).length;
  const isFollowing = !!(session && follows.find(f => f.followerId === session.user.id && f.sellerName === p.seller));
  const isTrusted = followerCount >= (settings.trustedFollowerThreshold || 100);
  const isPremium = p.sellerPremiumUntil && p.sellerPremiumUntil > Date.now();

  if (showEft) {
    const bank = p.sellerBankDetails;
    return (
      <div>
        <button onClick={() => setShowEft(false)} className="text-sm font-semibold mb-3" style={{ color: COLORS.teal }}>← Back</button>
        <SectionTitle>Pay by EFT</SectionTitle>
        <div className="p-4 rounded-xl mb-3" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
          <div className="text-xs font-bold mb-2">{p.seller}</div>
          {bank?.accountNumber ? (
            <>
              <div className="text-xs opacity-60 mb-3">Make the transfer using these details, then confirm below.</div>
              <Row label="Bank" value={bank.bankName} />
              <Row label="Account name" value={bank.accountName} />
              <Row label="Account number" value={bank.accountNumber} />
              {bank.accountType && <Row label="Account type" value={bank.accountType} />}
              <Row label="Branch code" value={bank.branchCode} />
            </>
          ) : (
            <div className="text-xs" style={{ color: COLORS.rust }}>This seller hasn't added payout details yet — message them before paying.</div>
          )}
          <div style={{ borderTop: `1px solid ${COLORS.line}` }} className="pt-2 mt-2">
            <Row label="Amount" value={money(total, p.currency)} bold />
          </div>
        </div>
        <Btn full variant="lime" onClick={() => onBuyNow(p, qty, delivery)}>I've made the EFT — place order</Btn>
      </div>
    );
  }


  return (
    <div>
      <button onClick={onBack} className="text-sm font-semibold mb-3" style={{ color: COLORS.teal }}>← Back</button>

      {images ? (
        <div className="mb-3">
          <div className="flex overflow-x-auto rounded-xl" style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}>
            {images.map((src, i) => (
              <div key={i} className="shrink-0 w-full" style={{ scrollSnapAlign: "center", aspectRatio: "4/3", background: COLORS.paper2 }}>
                <img src={src} alt={p.title} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-2">
              {images.map((_, i) => <div key={i} style={{ width: 5, height: 5, borderRadius: 99, background: COLORS.line }} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl flex items-center justify-center mb-3" style={{ aspectRatio: "4/3", background: COLORS.paper2, fontSize: 40, opacity: 0.25 }}>🖼️</div>
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

      <button onClick={() => onOpenSeller(p.seller)} className="w-full text-left p-3 rounded-xl mb-3 transition active:scale-[0.98]" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-semibold">{p.seller}</div>
            <div className="text-[11px] opacity-60">{p.sellerType} · {p.location}</div>
          </div>
          <Tag tone="lime">{p.verified}</Tag>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {isTrusted && <Tag tone="teal">⭐ Trusted Seller</Tag>}
          {isPremium && <Tag tone="rust">Premium Seller</Tag>}
        </div>
        {avgRating && <div className="text-xs">⭐ {avgRating} ({sellerReviews.length} review{sellerReviews.length !== 1 ? "s" : ""})</div>}
        <div className="flex items-center justify-between mt-2">
          <div className="text-[11px] opacity-60">{followerCount} follower{followerCount !== 1 ? "s" : ""} · tap to view {p.sellerType === "Business" ? "store" : "listings"}</div>
          {profile?.name !== p.seller && (
            <Btn small variant={isFollowing ? "outline" : "lime"} onClick={(e) => { e.stopPropagation(); onToggleFollow(p.seller); }}>{isFollowing ? "Following ✓" : "Follow"}</Btn>
          )}
        </div>
        <div className="mt-2"><DirectLine small /></div>
      </button>

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
        <Btn variant="lime" disabled={blocked} onClick={() => setShowEft(true)}>{blocked ? "Unavailable" : "Buy Now"}</Btn>
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

/* ---------------- SELLER STOREFRONT ---------------- */
function SellerView({ sellerName, products, reviews, follows, onToggleFollow, session, settings, onBack, onOpen, profile }) {
  const listings = products.filter(p => p.seller === sellerName && p.status !== "sold" && p.status !== "removed");
  const soldCount = products.filter(p => p.seller === sellerName && p.status === "sold").length;
  const first = products.find(p => p.seller === sellerName);
  if (!first) return <div className="text-center py-10 text-sm opacity-50">Seller not found.</div>;
  const sellerReviews = reviews.filter(r => r.seller === sellerName);
  const avgRating = sellerReviews.length ? (sellerReviews.reduce((s, r) => s + r.rating, 0) / sellerReviews.length).toFixed(1) : null;
  const followerCount = follows.filter(f => f.sellerName === sellerName).length;
  const isFollowing = !!(session && follows.find(f => f.followerId === session.user.id && f.sellerName === sellerName));
  const isTrusted = followerCount >= (settings.trustedFollowerThreshold || 100);
  const isPremium = first.sellerPremiumUntil && first.sellerPremiumUntil > Date.now();

  return (
    <div>
      <button onClick={onBack} className="text-sm font-semibold mb-3" style={{ color: COLORS.teal }}>← Back</button>

      <div className="p-4 rounded-2xl mb-4" style={{ background: `linear-gradient(135deg, ${COLORS.ink}, ${COLORS.tealDark})`, color: "#fff" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-2" style={{ background: COLORS.lime, color: COLORS.ink }}>
          {sellerName[0].toUpperCase()}
        </div>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 800 }} className="text-lg">{sellerName}</div>
        <div className="text-xs opacity-70 mb-2">{first.sellerType} · {first.location}</div>
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <Tag tone="lime">{first.verified}</Tag>
          {isTrusted && <Tag tone="teal">⭐ Trusted Seller</Tag>}
          {isPremium && <Tag tone="rust">Premium Seller</Tag>}
        </div>
        <div className="flex items-center gap-3 text-xs opacity-80 mb-3">
          {avgRating && <span>⭐ {avgRating} ({sellerReviews.length})</span>}
          <span>{followerCount} follower{followerCount !== 1 ? "s" : ""}</span>
          <span>{listings.length} active · {soldCount} sold</span>
        </div>
        {profile?.name !== sellerName && (
          <Btn small variant={isFollowing ? "outline" : "lime"} onClick={() => onToggleFollow(sellerName)}>{isFollowing ? "Following ✓" : "Follow"}</Btn>
        )}
      </div>

      <SectionTitle>{listings.length} listing{listings.length !== 1 ? "s" : ""}</SectionTitle>
      <ProductGrid products={listings} onOpen={onOpen} />
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
    images: [],
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

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

  if (!profile) {
    return (
      <div className="text-center py-10">
        <div className="text-sm opacity-60 mb-3">Set up your name to start selling.</div>
        <Btn variant="lime" onClick={onNeedProfile}>Go to Account</Btn>
      </div>
    );
  }

  const steps = ["Category", "Details", "Price & photos", "Delivery", "Review"];
  const sd = profile.sellerDetails || {};
  const sellerDetailsComplete = profile.role === "business"
    ? !!(sd.phone && sd.businessName && sd.businessAddress)
    : !!(sd.phone && sd.address);
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
              <CategoryIcon id={c.id} size={20} color={d.category === c.id ? COLORS.lime : COLORS.ink} />
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
            {d.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {d.images.map((src, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "1/1" }}>
                    <img src={src} alt="" className="w-full h-full object-cover"
                      onError={e => { e.currentTarget.style.opacity = 0.25; }} />
                    <button onClick={() => setD({ ...d, images: d.images.filter((_, idx) => idx !== i) })}
                      className="absolute top-1 right-1 rounded-full text-xs w-5 h-5 flex items-center justify-center"
                      style={{ background: COLORS.rust, color: "#fff" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <Btn small variant="ghost" disabled={uploading || d.images.length >= 6} onClick={() => fileInputRef.current?.click()}>
              {uploading ? "Uploading…" : "📷 Choose photos"}
            </Btn>
            <div className="text-[11px] opacity-45 mt-1">Up to 6 photos, uploaded straight from your device. Good photos are what get a listing noticed — add a few clear ones.</div>
          </Field>
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
          <Thumb src={d.images[0]} size={56} />
          <div className="mt-2 font-bold">{d.title || "Untitled listing"}</div>
          <div className="text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{money(d.price || 0, d.currency)}</div>
          <div className="text-xs opacity-70 mt-1">{d.description}</div>
          <div className="text-xs opacity-60 mt-2">{d.location}, {d.country} · Qty {d.qty} · {d.delivery ? `Delivery ${money(d.deliveryFee || 0, d.currency)}` : "Pickup only"}</div>
          {d.images.length > 0 && <div className="text-xs opacity-60 mt-1">{d.images.length} photo{d.images.length !== 1 ? "s" : ""}</div>}
          {!profile.bankDetails?.accountNumber && (
            <div className="text-xs mt-2 p-2 rounded-lg" style={{ background: `${COLORS.rust}18`, color: COLORS.rust }}>
              You haven't added payout bank details yet — add them in Account first, or buyers won't have a way to pay you.
            </div>
          )}
          {!sellerDetailsComplete && (
            <div className="text-xs mt-2 p-2 rounded-lg" style={{ background: `${COLORS.rust}18`, color: COLORS.rust }}>
              Your {profile.role === "business" ? "business" : "seller"} details aren't complete yet — add them in Account first.
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        {step > 0 && <Btn variant="ghost" onClick={() => setStep(step - 1)}>Back</Btn>}
        {step < steps.length - 1 && <Btn full variant="lime" disabled={!canNext[step]} onClick={() => setStep(step + 1)}>Continue</Btn>}
        {step === steps.length - 1 && (
          <Btn full variant="lime" disabled={!profile.bankDetails?.accountNumber || !sellerDetailsComplete} onClick={() => {
            onPublish({ ...d, price: Number(d.price), deliveryFee: Number(d.deliveryFee) || 0, qty: Number(d.qty) || 1 });
          }}>
            {!profile.bankDetails?.accountNumber ? "Add payout details first" : !sellerDetailsComplete ? "Complete seller details first" : "Publish listing"}
          </Btn>
        )}
      </div>
    </div>
  );
}

/* ---------------- CART ---------------- */
function CartView({ items, onRemove, onCheckout, settings }) {
  const [delivery, setDelivery] = useState("delivery");
  const [showEft, setShowEft] = useState(false);
  if (!items.length) return <div className="text-center py-10 text-sm opacity-50">Your cart is empty.</div>;
  const subtotal = items.reduce((s, ci) => s + ci.product.price * ci.qty, 0);
  const deliveryFee = delivery === "delivery" ? items.reduce((s, ci) => s + (ci.product.deliveryFee || 0), 0) : 0;
  const total = subtotal + deliveryFee;

  const sellerGroups = {};
  items.forEach(ci => {
    const key = ci.product.seller;
    if (!sellerGroups[key]) sellerGroups[key] = { seller: key, bank: ci.product.sellerBankDetails, items: [], amount: 0 };
    const itemDelivery = delivery === "delivery" ? (ci.product.deliveryFee || 0) : 0;
    sellerGroups[key].items.push(ci);
    sellerGroups[key].amount += ci.product.price * ci.qty + itemDelivery;
  });
  const groups = Object.values(sellerGroups);

  if (showEft) {
    return (
      <div>
        <button onClick={() => setShowEft(false)} className="text-sm font-semibold mb-3" style={{ color: COLORS.teal }}>← Back to cart</button>
        <SectionTitle>Pay by EFT</SectionTitle>
        <div className="text-xs opacity-60 mb-3">Every seller in your cart gets paid directly — you'll make one transfer per seller below, then confirm.</div>
        {groups.map(g => (
          <div key={g.seller} className="p-4 rounded-xl mb-3" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
            <div className="text-xs font-bold mb-2">{g.seller}</div>
            {g.bank?.accountNumber ? (
              <>
                <Row label="Bank" value={g.bank.bankName} />
                <Row label="Account name" value={g.bank.accountName} />
                <Row label="Account number" value={g.bank.accountNumber} />
                {g.bank.accountType && <Row label="Account type" value={g.bank.accountType} />}
                <Row label="Branch code" value={g.bank.branchCode} />
              </>
            ) : (
              <div className="text-xs" style={{ color: COLORS.rust }}>This seller hasn't added payout details yet — message them before paying.</div>
            )}
            <div style={{ borderTop: `1px solid ${COLORS.line}` }} className="pt-2 mt-2">
              <Row label="Amount" value={money(g.amount, g.items[0].product.currency)} bold />
            </div>
          </div>
        ))}
        <Btn full variant="lime" onClick={() => onCheckout(items, delivery)}>I've made the EFT{groups.length > 1 ? "s" : ""} — place order</Btn>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Cart</SectionTitle>
      <div className="space-y-2 mb-4">
        {items.map(ci => (
          <div key={ci.productId} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
            <Thumb src={ci.product.images?.[0]} size={44} />
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
      <Btn full variant="lime" onClick={() => setShowEft(true)}>Checkout — Pay by EFT</Btn>
    </div>
  );
}

/* ---------------- ORDERS ---------------- */
function OrdersView({ buyerOrders, sellerOrders, onAdvance, onReview, reviews, profile, onConfirmPayment, onMarkCommissionPaid, platformBank }) {
  const [view, setView] = useState("buying");
  const [reviewFor, setReviewFor] = useState(null);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [showCommissionPay, setShowCommissionPay] = useState(false);

  if (!profile) return <div className="text-center py-10 text-sm opacity-50">Set up your account to see orders.</div>;

  const list = view === "buying" ? buyerOrders : sellerOrders;
  const owedOrders = sellerOrders.filter(o => o.paymentConfirmed && !o.commissionPaid);
  const commissionOwed = owedOrders.reduce((s, o) => s + o.commission, 0);
  const owedCurrency = owedOrders[0]?.currency;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView("buying")} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: view === "buying" ? COLORS.ink : "#fff", color: view === "buying" ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Buying ({buyerOrders.length})</button>
        <button onClick={() => setView("selling")} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: view === "selling" ? COLORS.ink : "#fff", color: view === "selling" ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Selling ({sellerOrders.length})</button>
      </div>

      {view === "selling" && owedOrders.length > 0 && (
        <div className="p-3 rounded-xl mb-4" style={{ background: `${COLORS.rust}14`, border: `1px solid ${COLORS.rust}` }}>
          <div className="text-xs font-bold mb-1">You owe THE MARKET {money(commissionOwed, owedCurrency)} in commission</div>
          <div className="text-[11px] opacity-70 mb-2">Across {owedOrders.length} confirmed sale{owedOrders.length !== 1 ? "s" : ""}. Pay this to the platform's account, separate from what buyers paid you directly.</div>
          {!showCommissionPay ? (
            <Btn small variant="rust" onClick={() => setShowCommissionPay(true)}>Pay commission</Btn>
          ) : (
            <div className="p-2 rounded-lg mb-2 text-xs" style={{ background: "#fff" }}>
              <Row label="Bank" value={platformBank.bankName} />
              <Row label="Account name" value={platformBank.accountName} />
              <Row label="Account number" value={platformBank.accountNumber} />
              <Row label="Branch code" value={platformBank.branchCode} />
              <div className="mt-2"><Btn small variant="lime" onClick={() => { onMarkCommissionPaid(owedOrders.map(o => o.id)); setShowCommissionPay(false); }}>I've paid — mark as settled</Btn></div>
            </div>
          )}
        </div>
      )}

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

              {o.paymentMethod === "eft" && (
                <div className="mb-2">
                  {o.paymentConfirmed ? <Tag tone="lime">Payment confirmed</Tag> : <Tag tone="rust">Awaiting payment confirmation</Tag>}
                  {o.paymentReference && <span className="text-[10px] opacity-45 ml-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Ref: {o.paymentReference}</span>}
                </div>
              )}
              {view === "buying" && o.paymentMethod === "eft" && !o.paymentConfirmed && o.sellerBankDetails?.accountNumber && (
                <div className="p-2 rounded-lg text-[11px] mb-2" style={{ background: COLORS.paper2 }}>
                  EFT to {o.sellerBankDetails.bankName} · {o.sellerBankDetails.accountName} · {o.sellerBankDetails.accountNumber}
                </div>
              )}
              {view === "selling" && o.paymentMethod === "eft" && !o.paymentConfirmed && (
                <div className="mb-2"><Btn small variant="lime" onClick={() => onConfirmPayment(o.id)}>Confirm payment received</Btn></div>
              )}

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
function AccountView({ profile, nameInput, setNameInput, onSave, messages, products, respondOffer, onShowAdmin, email, onLogOut, support, onSendSupport, myListings, onMarkSold, onDeleteListing, onRelist, onShowSafety, onSetTheme, onActivatePremium }) {
  const myOfferMsgs = messages.filter(m => m.type === "offer" && m.to === profile?.name);
  const [supportText, setSupportText] = useState("");
  const [bank, setBank] = useState(profile?.bankDetails || { bankName: "", accountName: "", accountNumber: "", accountType: "", branchCode: "" });
  const [seller, setSeller] = useState(profile?.sellerDetails || { phone: "", address: "", idNumber: "", businessName: "", businessRegNumber: "", businessAddress: "", taxNumber: "" });
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

          {myListings.length > 0 && (
            <>
              <SectionTitle>My listings</SectionTitle>
              <div className="space-y-2 mb-4">
                {myListings.map(p => (
                  <div key={p.id} className="p-2.5 rounded-lg" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Thumb src={p.images?.[0]} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold line-clamp-1">{p.title}</div>
                        <div className="text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{money(p.price, p.currency)}</div>
                      </div>
                      {p.status === "sold" ? <Tag tone="rust">Sold</Tag> : <Tag tone="lime">Active</Tag>}
                    </div>
                    <div className="flex gap-2">
                      {p.status === "sold"
                        ? <Btn small variant="ghost" onClick={() => onRelist(p.id)}>Relist</Btn>
                        : <Btn small variant="ghost" onClick={() => onMarkSold(p.id)}>Mark as sold</Btn>}
                      <Btn small variant="outline" onClick={() => onDeleteListing(p.id)}>Delete</Btn>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <SectionTitle>Premium Seller</SectionTitle>
          <div className="p-3 rounded-xl mb-4" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
            {profile.premiumUntil && profile.premiumUntil > Date.now() ? (
              <div className="text-xs mb-2">
                <Tag tone="rust">Premium active</Tag>
                <span className="ml-2 opacity-60">until {new Date(profile.premiumUntil).toLocaleDateString()}</span>
              </div>
            ) : (
              <div className="text-xs opacity-60 mb-2">Not active. Premium Seller is a paid badge showing buyers you're an established, paying member — it isn't identity verification (that's the separate ID-based badge above).</div>
            )}
            <div className="text-xs opacity-50 mb-2">$15/month — pay via EFT to THE MARKET, same as commission, then activate below.</div>
            <Btn small variant="rust" onClick={onActivatePremium}>{profile.premiumUntil && profile.premiumUntil > Date.now() ? "Extend 30 days" : "I've paid — activate 30 days"}</Btn>
          </div>

          <SectionTitle>Payout bank details</SectionTitle>
          <div className="p-3 rounded-xl mb-4" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
            <div className="text-[11px] opacity-50 mb-2">Shown to buyers at checkout so they pay you directly — THE MARKET never touches this money.</div>
            <div className="space-y-2">
              <input className={inputCls} style={inputStyle} value={bank.bankName} onChange={e => setBank({ ...bank, bankName: e.target.value })} placeholder="Bank name" />
              <input className={inputCls} style={inputStyle} value={bank.accountName} onChange={e => setBank({ ...bank, accountName: e.target.value })} placeholder="Account name" />
              <input className={inputCls} style={inputStyle} value={bank.accountNumber} onChange={e => setBank({ ...bank, accountNumber: e.target.value })} placeholder="Account number" />
              <input className={inputCls} style={inputStyle} value={bank.accountType} onChange={e => setBank({ ...bank, accountType: e.target.value })} placeholder="Account type (optional)" />
              <input className={inputCls} style={inputStyle} value={bank.branchCode} onChange={e => setBank({ ...bank, branchCode: e.target.value })} placeholder="Branch code" />
              <Btn small variant="lime" onClick={() => onSave({ ...profile, bankDetails: bank })}>Save payout details</Btn>
            </div>
            {!profile.bankDetails?.accountNumber && <div className="text-xs mt-2" style={{ color: COLORS.rust }}>Add these before publishing a listing, or buyers won't have a way to pay you.</div>}
          </div>

          <SectionTitle>Seller type</SectionTitle>
          <div className="flex gap-2 mb-4">
            {["individual", "business"].map(r => (
              <button key={r} onClick={() => onSave({ ...profile, role: r })} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold capitalize"
                style={{ background: profile.role === r ? COLORS.ink : "#fff", color: profile.role === r ? COLORS.lime : COLORS.ink, border: `1px solid ${COLORS.line}` }}>{r}</button>
            ))}
          </div>

          <SectionTitle>{profile.role === "business" ? "Business details" : "Seller details"}</SectionTitle>
          <div className="p-3 rounded-xl mb-4" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
            <div className="text-[11px] opacity-50 mb-2">Required before you can publish a listing — helps buyers trust who they're dealing with.</div>
            <div className="space-y-2">
              <input className={inputCls} style={inputStyle} value={seller.phone} onChange={e => setSeller({ ...seller, phone: e.target.value })} placeholder="Phone number" />
              {profile.role === "business" ? (
                <>
                  <input className={inputCls} style={inputStyle} value={seller.businessName} onChange={e => setSeller({ ...seller, businessName: e.target.value })} placeholder="Business name" />
                  <input className={inputCls} style={inputStyle} value={seller.businessRegNumber} onChange={e => setSeller({ ...seller, businessRegNumber: e.target.value })} placeholder="Business registration number (if registered)" />
                  <input className={inputCls} style={inputStyle} value={seller.taxNumber} onChange={e => setSeller({ ...seller, taxNumber: e.target.value })} placeholder="Tax/VAT number (optional)" />
                  <input className={inputCls} style={inputStyle} value={seller.businessAddress} onChange={e => setSeller({ ...seller, businessAddress: e.target.value })} placeholder="Business address" />
                </>
              ) : (
                <>
                  <input className={inputCls} style={inputStyle} value={seller.idNumber} onChange={e => setSeller({ ...seller, idNumber: e.target.value })} placeholder="ID number (optional, for verification)" />
                  <input className={inputCls} style={inputStyle} value={seller.address} onChange={e => setSeller({ ...seller, address: e.target.value })} placeholder="Residential address" />
                </>
              )}
              <Btn small variant="lime" onClick={() => onSave({ ...profile, sellerDetails: seller })}>Save details</Btn>
            </div>
            {(!seller.phone || (profile.role === "business" ? (!seller.businessName || !seller.businessAddress) : !seller.address)) && (
              <div className="text-xs mt-2" style={{ color: COLORS.rust }}>Complete these before publishing a listing.</div>
            )}
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

          <SectionTitle>App theme</SectionTitle>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {Object.entries(THEME_PRESETS).map(([key, t]) => (
              <button key={key} onClick={() => onSetTheme({ preset: key })} className="rounded-xl overflow-hidden p-1"
                style={{ border: profile.theme?.preset === key || (!profile.theme && key === "sunset") ? `2px solid ${COLORS.ink}` : `1px solid ${COLORS.line}` }}>
                <div className="h-8 rounded-lg mb-1" style={{ background: `linear-gradient(135deg, ${t.teal}, ${t.lime})` }} />
                <div className="text-[9px] font-semibold text-center">{t.name}</div>
              </button>
            ))}
          </div>
          <div className="p-3 rounded-xl mb-4" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
            <div className="text-[11px] opacity-50 mb-2">Or pick your own two colours</div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <input type="color" value={COLORS.teal} onChange={e => onSetTheme({ custom: { teal: e.target.value, tealDark: e.target.value } })} style={{ width: 40, height: 40, border: "none", background: "none" }} />
                <span className="text-[10px] opacity-60">Accent</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <input type="color" value={COLORS.lime} onChange={e => onSetTheme({ custom: { lime: e.target.value } })} style={{ width: 40, height: 40, border: "none", background: "none" }} />
                <span className="text-[10px] opacity-60">Highlight</span>
              </div>
              <Btn small variant="ghost" onClick={() => onSetTheme({ preset: "sunset" })}>Reset</Btn>
            </div>
          </div>

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
          <div className="mt-2"><Btn variant="ghost" full onClick={onShowSafety}>Safety &amp; Terms</Btn></div>
          <div className="mt-2"><Btn variant="outline" full onClick={onLogOut}>Log out</Btn></div>
        </div>
      )}
    </div>
  );
}

/* ---------------- ADMIN ---------------- */
function SafetyModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "#00000066" }}>
      <div className="w-full rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto" style={{ background: COLORS.paper }}>
        <div className="flex justify-between items-center mb-3">
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 800 }} className="text-base">Safety &amp; Terms</div>
          <button onClick={onClose} className="text-sm opacity-60">✕</button>
        </div>

        <div className="p-3 rounded-xl mb-3" style={{ background: `${COLORS.rust}14`, border: `1px solid ${COLORS.rust}` }}>
          <div className="text-xs font-bold mb-1">⚠️ Fraud warning</div>
          <div className="text-xs opacity-80 leading-relaxed">
            THE MARKET connects buyers and sellers directly — it is not a party to any transaction and does not verify, guarantee, or insure any listing. Only pay using the bank details shown at checkout for that specific seller. Never pay a seller through a link, QR code, or account sent to you outside the app. If a deal feels rushed, urgent, or too good to be true, stop and report it.
          </div>
        </div>

        <SectionTitle>Staying safe</SectionTitle>
        <div className="space-y-1 mb-4 text-xs opacity-80">
          <div className="p-2 rounded-lg" style={{ background: "#fff" }}>Check a seller's verification badge and reviews before paying for anything.</div>
          <div className="p-2 rounded-lg" style={{ background: "#fff" }}>For local pickups, meet in a public, well-lit place — a mall, police station, or busy shop is safer than a private address.</div>
          <div className="p-2 rounded-lg" style={{ background: "#fff" }}>Inspect an item in person before paying where possible, especially for high-value goods like vehicles or electronics.</div>
          <div className="p-2 rounded-lg" style={{ background: "#fff" }}>THE MARKET staff will never message you asking for your password or one-time PIN.</div>
          <div className="p-2 rounded-lg" style={{ background: "#fff" }}>Report a suspicious listing, seller, or buyer through Support in your Account tab.</div>
        </div>

        <SectionTitle>Legal</SectionTitle>
        <div className="text-xs opacity-70 leading-relaxed mb-2">
          By using THE MARKET, you agree that transactions are strictly between the buyer and seller involved. THE MARKET provides the marketplace, messaging, and payment-details display shown at checkout, but is not liable for the quality, legality, delivery, or payment of any listed item, except where required by applicable consumer protection law. THE MARKET is an early-stage platform — commission and payment flows currently rely in part on users acting in good faith.
        </div>
        <div className="text-[11px] opacity-45">This is a plain-language summary, not a substitute for full Terms of Service and Privacy Policy documents, which should be reviewed by a lawyer before wide public launch.</div>
      </div>
    </div>
  );
}

function AdminModal({ onClose, products, orders, settings, onSaveSettings, support, onSendSupport, onMarkSold, onDeleteListing, onRelist }) {
  const [rate, setRate] = useState((settings.commissionRate * 100).toString());
  const [followerThreshold, setFollowerThreshold] = useState((settings.trustedFollowerThreshold ?? 100).toString());
  const [bank, setBank] = useState(settings.bankDetails || DEFAULT_BANK_DETAILS);
  const [replyText, setReplyText] = useState({});
  const totalGMV = orders.reduce((s, o) => s + o.subtotal, 0);
  const totalCommission = orders.reduce((s, o) => s + o.commission, 0);
  const commissionCollected = orders.filter(o => o.commissionPaid).reduce((s, o) => s + o.commission, 0);
  const commissionOutstanding = orders.filter(o => o.paymentConfirmed && !o.commissionPaid).reduce((s, o) => s + o.commission, 0);
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
            <div key={c.id} className="flex justify-between items-center text-xs p-2 rounded-lg" style={{ background: "#fff" }}>
              <span className="flex items-center gap-1.5"><CategoryIcon id={c.id} size={14} /> {c.label}</span><span className="font-semibold">{c.count}</span>
            </div>
          ))}
        </div>

        <SectionTitle>Manage all listings</SectionTitle>
        <div className="space-y-2 mb-4">
          {products.length === 0 && <div className="text-xs opacity-45">No listings yet.</div>}
          {products.map(p => (
            <div key={p.id} className="p-2.5 rounded-lg" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
              <div className="flex items-center gap-2 mb-2">
                <Thumb src={p.images?.[0]} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold line-clamp-1">{p.title}</div>
                  <div className="text-[10px] opacity-50">by {p.seller} · {money(p.price, p.currency)}</div>
                </div>
                {p.status === "sold" ? <Tag tone="rust">Sold</Tag> : <Tag tone="lime">Active</Tag>}
              </div>
              <div className="flex gap-2">
                {p.status === "sold"
                  ? <Btn small variant="ghost" onClick={() => onRelist(p.id)}>Relist</Btn>
                  : <Btn small variant="ghost" onClick={() => onMarkSold(p.id)}>Mark sold</Btn>}
                <Btn small variant="outline" onClick={() => onDeleteListing(p.id)}>Delete</Btn>
              </div>
            </div>
          ))}
        </div>

        <SectionTitle>Commission rate (default)</SectionTitle>
        <div className="flex gap-2 mb-2">
          <input type="number" className={inputCls} style={inputStyle} value={rate} onChange={e => setRate(e.target.value)} />
          <Btn small variant="lime" onClick={() => onSaveSettings({ ...settings, commissionRate: Number(rate) / 100 })}>Save %</Btn>
        </div>
        <div className="text-[11px] opacity-50 mb-4">Configurable per seller type, category, country or negotiated deal in the full build — this demo applies one global default rate.</div>

        <SectionTitle>Trusted Seller threshold</SectionTitle>
        <div className="flex gap-2 mb-2">
          <input type="number" className={inputCls} style={inputStyle} value={followerThreshold} onChange={e => setFollowerThreshold(e.target.value)} />
          <Btn small variant="lime" onClick={() => onSaveSettings({ ...settings, trustedFollowerThreshold: Number(followerThreshold) })}>Save</Btn>
        </div>
        <div className="text-[11px] opacity-50 mb-4">Sellers with at least this many followers automatically show a "Trusted Seller" badge on their listings — no manual approval needed.</div>

        <SectionTitle>Platform bank details (unused)</SectionTitle>
        <div className="space-y-2 mb-2">
          <input className={inputCls} style={inputStyle} value={bank.bankName} onChange={e => setBank({ ...bank, bankName: e.target.value })} placeholder="Bank name" />
          <input className={inputCls} style={inputStyle} value={bank.accountName} onChange={e => setBank({ ...bank, accountName: e.target.value })} placeholder="Account name" />
          <input className={inputCls} style={inputStyle} value={bank.accountNumber} onChange={e => setBank({ ...bank, accountNumber: e.target.value })} placeholder="Account number" />
          <input className={inputCls} style={inputStyle} value={bank.accountType} onChange={e => setBank({ ...bank, accountType: e.target.value })} placeholder="Account type (optional)" />
          <input className={inputCls} style={inputStyle} value={bank.branchCode} onChange={e => setBank({ ...bank, branchCode: e.target.value })} placeholder="Branch code" />
          <Btn small variant="lime" onClick={() => onSaveSettings({ ...settings, bankDetails: bank })}>Save</Btn>
        </div>
        <div className="text-[11px] opacity-50 mb-4">Checkout now uses each seller's own payout details (set in their Account), not this. This field is kept only as a leftover default and isn't shown to buyers anymore.</div>

        <SectionTitle>GMV</SectionTitle>
        <div className="text-sm font-bold mb-4" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{totalGMV.toLocaleString()}</div>

        <SectionTitle>Commission collection</SectionTitle>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Stat label="Collected" value={commissionCollected.toFixed(2)} />
          <Stat label="Outstanding" value={commissionOutstanding.toFixed(2)} />
        </div>
        <div className="text-[11px] opacity-50 mb-4">Sellers self-report paying commission via the "Selling" tab in Orders. There's no automatic verification yet — treat these numbers as what sellers have told the app, not confirmed bank receipts.</div>

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
