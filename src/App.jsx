import { useState, useEffect, useCallback, useRef, useMemo, Component } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE FONTS - Press Start 2P
// ═══════════════════════════════════════════════════════════════════════════════
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const CHAINS_BY_KEY = {
  ethereum: { id:1,     name:"Ethereum",  symbol:"ETH",  color:"#4F8EF7", explorer:"https://etherscan.io",    dexscreener:"ethereum",   native:"ETH",  nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"ethereum"  },
  bsc:      { id:56,    name:"BSC",       symbol:"BNB",  color:"#7AB3F7", explorer:"https://bscscan.com",     dexscreener:"bsc",        native:"BNB",  nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"bsc"       },
  base:     { id:8453,  name:"Base",      symbol:"ETH",  color:"#0052FF", explorer:"https://basescan.org",    dexscreener:"base",       native:"ETH",  nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"base"      },
  arbitrum: { id:42161, name:"Arbitrum",  symbol:"ETH",  color:"#12AAFF", explorer:"https://arbiscan.io",     dexscreener:"arbitrum",   native:"ETH",  nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"arbitrum"  },
  polygon:  { id:137,   name:"Polygon",   symbol:"MATIC",color:"#8247E5", explorer:"https://polygonscan.com", dexscreener:"polygon",    native:"MATIC",nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"polygon"   },
  avalanche:{ id:43114, name:"Avalanche", symbol:"AVAX", color:"#3B82F6", explorer:"https://snowtrace.io",    dexscreener:"avalanche",  native:"AVAX", nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"avalanche" },
  hyperevm: { id:999,   name:"HyperEVM",  symbol:"HYPE", color:"#60A5FA", explorer:"https://hyperevm.explorer.io", dexscreener:"hyperliquid", native:"HYPE",nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"hyperliquid"},
  nesa:     { id:41443, name:"Nesa",      symbol:"NES",  color:"#93C5FD", explorer:"https://explorer.nesa.ai",dexscreener:"nesa",       native:"NES",  nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"nesa"      },
  solana:   { id:null,  name:"Solana",    symbol:"SOL",  color:"#BFDBFE", explorer:"https://solscan.io/token",dexscreener:"solana",     native:"SOL",  nativeAddr:"So11111111111111111111111111111111111111112", decimals:9,  type:"svm", dex:"solana"    },
};

const CHAINS = { ...CHAINS_BY_KEY, 1:CHAINS_BY_KEY.ethereum, 56:CHAINS_BY_KEY.bsc, 8453:CHAINS_BY_KEY.base, 42161:CHAINS_BY_KEY.arbitrum, 137:CHAINS_BY_KEY.polygon, 43114:CHAINS_BY_KEY.avalanche, sol:CHAINS_BY_KEY.solana };

// Approx native USD prices for gas estimation only (fallbacks; refined at runtime if scanned)
const NATIVE_USD = { ethereum:3200, bsc:580, base:3200, arbitrum:3200, polygon:0.55, avalanche:30, hyperevm:25, nesa:1, solana:150 };

// Per-chain rough gas cost (USD) for a swap/transfer tx — used by the arbitrage engine
const GAS_USD = { ethereum:8.5, bsc:0.35, base:0.04, arbitrum:0.12, polygon:0.02, avalanche:0.25, hyperevm:0.05, nesa:0.01, solana:0.002 };

const BRIDGES = [
  { name:"deBridge",  supports:["evm","svm"], desc:"EVM + Solana, any token",           feePct:0.08, etaMin:3,  safety:9, url:(f,t,tok)=>`https://app.debridge.finance/?inputChain=${f}&outputChain=${t}&inputCurrency=${tok}` },
  { name:"Wormhole",  supports:["evm","svm"], desc:"Cross semua chain + Solana",         feePct:0.10, etaMin:15, safety:8, url:()=>`https://portalbridge.com/#/transfer` },
  { name:"Mayan",     supports:["evm","svm"], desc:"Solana ke EVM terbaik",              feePct:0.09, etaMin:4,  safety:8, url:(f,t,tok)=>`https://swap.mayan.finance/?fromChain=${f}&toChain=${t}&from=${tok}` },
  { name:"Across",    supports:["evm"],       desc:"EVM tercepat, fee rendah",           feePct:0.05, etaMin:2,  safety:9, url:(f,t,tok,amt)=>`https://across.to/?from=${f}&to=${t}&asset=${tok}&amount=${amt}` },
  { name:"Stargate",  supports:["evm"],       desc:"Stablecoin bridge terbaik",          feePct:0.06, etaMin:5,  safety:9, url:(f,t,tok)=>`https://stargate.finance/transfer?srcChain=${f}&dstChain=${t}&srcToken=${tok}` },
  { name:"Symbiosis", supports:["evm","svm"], desc:"Multi-chain incl Nesa & HyperEVM",  feePct:0.10, etaMin:6,  safety:7, url:(f,t,tok)=>`https://app.symbiosis.finance/swap?chainIn=${f}&chainOut=${t}&tokenIn=${tok}` },
];

const DEXES = {
  ethereum: [{ name:"Uniswap",     url:ca=>`https://app.uniswap.org/swap?outputCurrency=${ca}&chain=mainnet` }, { name:"1inch",    url:ca=>`https://app.1inch.io/#/1/simple/swap/ETH/${ca}` }, { name:"Paraswap", url:ca=>`https://app.paraswap.io/#/${ca}-ETH/1/SELL/?network=ethereum` }],
  bsc:      [{ name:"PancakeSwap", url:ca=>`https://pancakeswap.finance/swap?outputCurrency=${ca}` },           { name:"1inch",    url:ca=>`https://app.1inch.io/#/56/simple/swap/BNB/${ca}` }],
  base:     [{ name:"Aerodrome",   url:ca=>`https://aerodrome.finance/swap?to=${ca}` },                         { name:"1inch",    url:ca=>`https://app.1inch.io/#/8453/simple/swap/ETH/${ca}` }],
  arbitrum: [{ name:"Camelot",     url:ca=>`https://app.camelot.exchange/?outputCurrency=${ca}` },              { name:"1inch",    url:ca=>`https://app.1inch.io/#/42161/simple/swap/ETH/${ca}` }],
  polygon:  [{ name:"QuickSwap",   url:ca=>`https://quickswap.exchange/#/swap?outputCurrency=${ca}` },          { name:"1inch",    url:ca=>`https://app.1inch.io/#/137/simple/swap/MATIC/${ca}` }],
  avalanche:[{ name:"TraderJoe",   url:ca=>`https://traderjoexyz.com/avalanche/swap?outputCurrency=${ca}` }],
  hyperevm: [{ name:"HyperSwap",   url:ca=>`https://app.hyperliquid.xyz/trade/${ca}` }],
  nesa:     [{ name:"Nesa DEX",    url:ca=>`https://dex.nesa.ai/swap?token=${ca}` }],
  solana:   [{ name:"Jupiter",     url:ca=>`https://jup.ag/swap/SOL-${ca}` }, { name:"Orca", url:ca=>`https://www.orca.so/?outputMint=${ca}` }],
};

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN - BLUE BLACK PIXEL THEME (+ light theme variant)
// ═══════════════════════════════════════════════════════════════════════════════
const THEMES = {
  dark: {
    bg:"#00030F", surface:"#000820", card:"#000D2E", card2:"#001040", border:"#0A1A4A", border2:"#0F2060",
    text:"#C8D8FF", muted:"#2A4080", blue:"#4F8EF7", blueL:"#7AB3FF", blueD:"#1A3A8A", cyan:"#00D4FF",
    white:"#FFFFFF", red:"#FF4455", yellow:"#FFD700", green:"#00FF88",
  },
  light: {
    bg:"#E8EEFF", surface:"#F4F7FF", card:"#FFFFFF", card2:"#EDF2FF", border:"#C7D4F5", border2:"#A8BCEB",
    text:"#0A1A4A", muted:"#5A6FA8", blue:"#2F6BD8", blueL:"#1F4FB0", blueD:"#7AB3FF", cyan:"#0096C7",
    white:"#0A1430", red:"#D62839", yellow:"#B08900", green:"#0B8a4f",
  },
};

// `C` is mutated per active theme so all existing `C.*` references keep working unchanged.
let C = { ...THEMES.dark };
let g = {}; // diisi oleh buildG()
const buildG = () => { g = makeG(); };
const applyTheme = (name) => { Object.assign(C, THEMES[name] || THEMES.dark); buildG(); };

const FONT = "'Press Start 2P', monospace";

const makeG = () => ({
  root: {
    background: C.bg,
    minHeight: "100vh",
    color: C.text,
    fontFamily: FONT,
    fontSize: "10px",
    display: "flex",
    flexDirection: "column",
    imageRendering: "pixelated",
  },
  topbar: {
    background: C.surface,
    borderBottom: `2px solid ${C.border2}`,
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    height: "52px",
    flexShrink: 0,
    position: "sticky",
    top: 0,
    zIndex: 200,
    boxShadow: `0 2px 0 ${C.blueD}`,
  },
  brand: {
    fontFamily: FONT,
    fontWeight: "400",
    fontSize: "16px",
    color: C.white,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginRight: "20px",
    letterSpacing: "0.1em",
    textShadow: `2px 2px 0 ${C.blueD}, 0 0 20px ${C.blue}`,
  },
  layout: { display: "flex", flex: 1, minHeight: 0 },
  sidebar: {
    width: "160px",
    flexShrink: 0,
    background: C.surface,
    borderRight: `2px solid ${C.border2}`,
    padding: "12px 0",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    overflowY: "auto",
  },
  navItem: (a) => ({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    fontSize: "8px",
    fontFamily: FONT,
    color: a ? C.cyan : C.muted,
    background: a ? `${C.cyan}15` : "transparent",
    borderLeft: a ? `3px solid ${C.cyan}` : "3px solid transparent",
    cursor: "pointer",
    border: "none",
    width: "100%",
    textAlign: "left",
    lineHeight: "1.6",
    textShadow: a ? `0 0 10px ${C.cyan}` : "none",
  }),
  main: { flex: 1, overflowY: "auto", padding: "18px 20px" },
  card: {
    background: C.card,
    border: `2px solid ${C.border2}`,
    borderRadius: "0px",
    padding: "16px",
    boxShadow: `inset 0 0 30px ${C.blueD}20`,
  },
  card2: {
    background: C.card2,
    border: `2px solid ${C.border}`,
    borderRadius: "0px",
    padding: "12px",
  },
  label: {
    fontSize: "8px",
    fontFamily: FONT,
    color: C.muted,
    letterSpacing: "0.12em",
    marginBottom: "8px",
    display: "block",
  },
  input: {
    width: "100%",
    background: C.surface,
    border: `2px solid ${C.border2}`,
    color: C.text,
    borderRadius: "0px",
    padding: "10px 12px",
    fontSize: "9px",
    fontFamily: FONT,
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    background: C.surface,
    border: `2px solid ${C.border2}`,
    color: C.text,
    borderRadius: "0px",
    padding: "10px 12px",
    fontSize: "9px",
    fontFamily: FONT,
    outline: "none",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  btn: (v = "primary", dis = false) => ({
    padding: "10px 16px",
    borderRadius: "0px",
    fontSize: "8px",
    fontFamily: FONT,
    cursor: dis ? "not-allowed" : "pointer",
    opacity: dis ? 0.4 : 1,
    flexShrink: 0,
    letterSpacing: "0.08em",
    position: "relative",
    background:
      v === "primary" ? C.blue :
      v === "cyan" ? C.cyan :
      v === "ghost" ? C.card2 :
      v === "danger" ? `${C.red}22` : C.card,
    color:
      v === "primary" ? C.white :
      v === "cyan" ? C.bg :
      v === "danger" ? C.red : C.text,
    border:
      v === "ghost" ? `2px solid ${C.border2}` :
      v === "danger" ? `2px solid ${C.red}` :
      v === "primary" ? `2px solid ${C.blueL}` :
      v === "cyan" ? `2px solid ${C.cyan}` : `2px solid ${C.border2}`,
    boxShadow:
      v === "primary" ? `0 3px 0 ${C.blueD}, 0 0 15px ${C.blue}40` :
      v === "cyan" ? `0 3px 0 #008899, 0 0 15px ${C.cyan}40` : "none",
    textShadow: "none",
  }),
  row: { display: "flex", alignItems: "center", gap: "8px" },
  between: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  tag: (c) => ({
    fontSize: "7px",
    fontFamily: FONT,
    padding: "3px 6px",
    background: `${c}20`,
    color: c,
    border: `1px solid ${c}`,
    whiteSpace: "nowrap",
    letterSpacing: "0.08em",
  }),
  chip: (c) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 8px",
    background: `${c}18`,
    border: `1px solid ${c}`,
    fontSize: "7px",
    fontFamily: FONT,
    color: c,
    letterSpacing: "0.06em",
  }),
  dot: (c) => ({
    width: "8px",
    height: "8px",
    background: c,
    flexShrink: 0,
    boxShadow: `0 0 6px ${c}`,
  }),
  divider: { height: "2px", background: C.border2, margin: "14px 0" },
  sectionTitle: { fontSize: "12px", fontFamily: FONT, color: C.white, marginBottom: "6px", textShadow: `0 0 20px ${C.blue}` },
  sectionSub: { fontSize: "8px", fontFamily: FONT, color: C.muted, marginBottom: "16px", lineHeight: "1.8" },
  successBox: { background: `${C.green}08`, border: `2px solid ${C.green}`, padding: "14px", marginTop: "14px" },
  warnBox: { background: `${C.yellow}08`, border: `2px solid ${C.yellow}`, padding: "12px", marginTop: "12px" },
});

buildG();

// ═══════════════════════════════════════════════════════════════════════════════
// PIXEL ART SVG ICONS (8-bit style)
// ═══════════════════════════════════════════════════════════════════════════════
const PX = ({ d, size = 16, color = C.cyan }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill={color}
    style={{ imageRendering: "pixelated", flexShrink: 0 }}
  >
    <path d={d} />
  </svg>
);
const ICONS = {
  scan:     "M2,2h4v2h-2v2h-2v-4zM10,2h4v4h-2v-2h-2v-2zM6,6h4v4h-4v-4zM2,10h2v2h2v2h-4v-4zM12,10h2v4h-4v-2h2v-2z",
  dex:      "M1,4h3v2h2v2h2v-2h2v-2h3v2h-2v2h-2v2h-2v-2h-2v-2h-2v-2zM5,10h2v2h-2v-2zM9,10h2v2h-2v-2z",
  bridge:   "M0,8h2v4h2v-6h2v-2h4v2h2v6h2v-4h2v6h-16v-6z",
  swap:     "M2,2h10v2h-2v2h-2v-2h-4v-2zM4,10h2v2h-2v2h-2v-2h-2v-2h4zM10,8h4v2h2v2h-2v2h-4v-2h2v-2h-2v-2z",
  transfer: "M4,2h8v2h2v8h-2v2h-8v-2h-2v-8h2v-2zM6,6h4v4h-4v-4z",
  history:  "M7,1h2v6h4v2h-6v-8zM1,7h4v2h-4v-2zM1,11h4v2h-4v-2zM1,3h2v2h-2v-2z",
  guide:    "M4,0h8v2h2v2h-2v2h-4v2h-2v-6zM6,8h4v2h-4v-2zM6,12h4v2h-4v-2z",
  wallet:   "M0,4h14v2h2v6h-2v2h-14v-10zM10,8h4v2h-4v-2z",
  connect:  "M2,6h2v-4h2v-2h4v2h2v4h2v4h-2v2h-2v2h-4v-2h-2v-2h-2v-4z",
  token:    "M4,0h8v2h2v2h2v8h-2v2h-2v2h-8v-2h-2v-2h-2v-8h2v-2h2v-2z",
  chain:    "M6,0h4v2h2v2h2v4h-2v2h-2v2h-4v-2h-2v-2h-2v-4h2v-2h2v-2z",
  arb:      "M7,0h2v4h4v2h-4v4h-2v-4h-4v-2h4v-4zM0,12h16v4h-16v-4z",
  warning:  "M7,0h2v2h-2zM6,2h4v2h-4zM5,4h6v2h-6zM4,6h8v2h-8zM3,8h10v2h-10zM2,10h12v2h-12zM6,12h4v2h-4z",
  check:    "M0,8h2v2h2v2h2v2h2v-2h2v-2h2v-2h2v-2h-2v2h-2v2h-2v-2h-2v-2h-2v2h-2z",
  cross:    "M0,0h2v2h2v2h2v2h2v-2h2v-2h2v-2h2v2h-2v2h-2v2h2v2h2v2h-2v-2h-2v-2h-2v2h-2v2h-2v-2h2v-2h-2v-2h-2v-2h2v-2h-2v-2z",
  copy:     "M4,0h10v2h2v10h-2v2h-10v-2h-2v-10h2v-2zM0,4h2v10h10v2h-12v-12z",
  extern:   "M8,0h8v8h-2v-4h-2v2h-2v2h-2v2h-2v-2h2v-2h2v-2h-2v-4zM0,4h6v2h-4v8h8v-4h2v6h-12v-12z",
  settings: "M6,0h4v2h2v2h2v4h-2v2h-2v2h-4v-2h-2v-2h-2v-4h2v-2h2v-2zM6,6h4v4h-4v-4z",
  star:     "M7,0h2v4h4v2h-3v3h3v2h-4v4h-2v-4h-4v-2h3v-3h-3v-2h4v-4z",
  qr:       "M0,0h6v6h-6v-6zM2,2v2h2v-2h-2zM10,0h6v6h-6v-6zM12,2v2h2v-2h-2zM0,10h6v6h-6v-6zM2,12v2h2v-2h-2zM10,10h2v2h-2v-2zM14,10h2v2h-2v-2zM12,12h2v2h-2v-2zM10,14h2v2h-2v-2zM14,14h2v2h-2v-2z",
  book:     "M2,0h12v16h-12v-16zM4,2v2h8v-2h-8zM4,6v2h8v-2h-8z",
  bell:     "M6,0h4v2h2v6h2v2h-12v-2h2v-6h2v-2zM6,12h4v2h-2v2h-2v-2v-2z",
  refresh:  "M2,2h8v2h2v2h2v4h-2v-2h-2v-2h-6v-2h-2v-2zM14,14h-8v-2h-2v-2h-2v-4h2v2h2v2h6v2h2v2z",
};

const Icon = ({ name, size = 14, color }) => (
  <PX d={ICONS[name] || ICONS.token} size={size} color={color || C.cyan} />
);

// ═══════════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════════
const sh = a => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "";
const fmt = (n, d = 4) => n == null ? "---" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: d });
const toWei = (amt, dec = 18) => BigInt(Math.round(parseFloat(amt || 0) * 10 ** dec)).toString();
const fromWei = (wei, dec = 18) => Number(BigInt(wei || 0)) / 10 ** dec;
const chainName = id => CHAINS[id]?.name || id;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── SECURITY: validation & sanitization ──
const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ENS_RE = /^[a-zA-Z0-9-]+\.eth$/;
const sanitizeCA = (s) => (s || "").trim().replace(/[\s\u200B-\u200D\uFEFF]/g, "").replace(/[<>"'`;]/g, "");
const isValidEvm = (a) => EVM_RE.test((a || "").trim());
const isValidSolana = (a) => SOL_RE.test((a || "").trim()) && !EVM_RE.test((a || "").trim());
const isValidEns = (a) => ENS_RE.test((a || "").trim());
const isValidAddressForChain = (a, type) => type === "svm" ? isValidSolana(a) : isValidEvm(a);
const isValidCAForChain = (a, type) => {
  const v = sanitizeCA(a);
  if (!v) return false;
  return type === "svm" ? isValidSolana(v) : isValidEvm(v);
};

// ── SECURITY: in-memory request cache + rate limiter ──
const _cache = new Map(); // key -> { ts, data }
const CACHE_TTL = 20000;
const cacheGet = (key) => {
  const e = _cache.get(key);
  if (e && Date.now() - e.ts < CACHE_TTL) return e.data;
  return undefined;
};
const cacheSet = (key, data) => _cache.set(key, { ts: Date.now(), data });

let _lastReq = 0;
const MIN_REQ_GAP = 220; // ms — basic client-side rate limiting
const rateGate = async () => {
  const now = Date.now();
  const wait = Math.max(0, _lastReq + MIN_REQ_GAP - now);
  _lastReq = now + wait;
  if (wait) await sleep(wait);
};

// ── SECURITY: fetch with AbortController timeout + retry/backoff ──
async function fetchWithRetry(url, { timeout = 9000, retries = 3, signal } = {}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("OFFLINE - cek koneksi internet");
  }
  let attempt = 0, lastErr;
  while (attempt <= retries) {
    await rateGate();
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    if (signal) signal.addEventListener("abort", onAbort);
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
      if (res.status === 429) throw new Error("RATE LIMITED (429)");
      if (!res.ok && res.status >= 500) throw new Error(`SERVER ${res.status}`);
      return res;
    } catch (e) {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
      lastErr = e;
      if (signal?.aborted) throw new Error("DIBATALKAN");
      if (e.name === "AbortError") lastErr = new Error("TIMEOUT");
      attempt++;
      if (attempt > retries) break;
      await sleep(400 * 2 ** (attempt - 1) + Math.random() * 200); // exponential backoff + jitter
    }
  }
  throw lastErr || new Error("REQUEST GAGAL");
}

const friendlyError = (e) => {
  const m = (e?.message || String(e || "")).toLowerCase();
  if (m.includes("offline")) return "Tidak ada koneksi internet.";
  if (m.includes("timeout")) return "Permintaan timeout. Coba lagi.";
  if (m.includes("rate")) return "Terlalu banyak permintaan. Tunggu sebentar.";
  if (m.includes("dibatalkan") || m.includes("abort")) return "Dibatalkan.";
  if (m.includes("user rejected") || m.includes("ditolak") || m.includes("4001")) return "Transaksi ditolak di wallet.";
  if (m.includes("insufficient")) return "Saldo tidak cukup.";
  if (m.includes("server")) return "Server sumber sedang bermasalah.";
  return e?.message || "Terjadi kesalahan.";
};

// ── localStorage helpers (NON-custodial: only app preferences + non-sensitive data) ──
const lsGet = (k, fallback) => { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ── CSV / Excel export ──
const downloadBlob = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const toCSV = (rows) => rows.map(r => r.map(c => {
  const s = c == null ? "" : String(c);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}).join(",")).join("\n");
const exportCSV = (rows, filename) => downloadBlob("\uFEFF" + toCSV(rows), filename, "text/csv;charset=utf-8");
// Excel-compatible export via SpreadsheetML / HTML table (opens in Excel without extra libs)
const exportExcel = (rows, filename) => {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">${
    rows.map(r => `<tr>${r.map(c => `<td>${(c == null ? "" : String(c)).replace(/&/g,"&amp;").replace(/</g,"&lt;")}</td>`).join("")}</tr>`).join("")
  }</table></body></html>`;
  downloadBlob(html, filename, "application/vnd.ms-excel");
};

// ── NOTIFICATIONS ──
const playBeep = (ok = true) => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    const o = ac.createOscillator(), gain = ac.createGain();
    o.type = "square";
    o.frequency.value = ok ? 880 : 220;
    o.connect(gain); gain.connect(ac.destination);
    gain.gain.setValueAtTime(0.05, ac.currentTime);
    o.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.25);
    o.stop(ac.currentTime + 0.25);
  } catch {}
};
const desktopNotify = (title, body) => {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") new Notification(title, { body });
    else if (Notification.permission !== "denied") Notification.requestPermission().then(p => { if (p === "granted") new Notification(title, { body }); });
  } catch {}
};
const sendTelegram = async (token, chatId, text) => {
  if (!token || !chatId) return;
  try {
    await fetchWithRetry(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage?chat_id=${encodeURIComponent(chatId)}&text=${encodeURIComponent(text)}`, { retries: 1, timeout: 6000 });
  } catch {}
};
const sendDiscord = async (webhook, text) => {
  if (!webhook) return;
  try {
    await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }) });
  } catch {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRICE / TOKEN FETCHERS (now hardened with retry + cache + abort)
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchDexPrice(chainKey, ca, signal) {
  if (!ca || ca.length < 6) return null;
  const cacheKey = `dex:${ca}`;
  const cached = cacheGet(cacheKey);
  try {
    const chain = typeof chainKey === "string" ? CHAINS_BY_KEY[chainKey] || CHAINS[chainKey] : CHAINS[chainKey];
    const dexKey = chain?.dexscreener || chain?.dex || chainKey;
    let data = cached;
    if (!data) {
      const res = await fetchWithRetry(`https://api.dexscreener.com/latest/dex/tokens/${ca}`, { signal });
      data = await res.json();
      cacheSet(cacheKey, data);
    }
    if (!data.pairs?.length) return null;
    const filtered = data.pairs.filter(p => p.chainId === dexKey || p.chainId === String(dexKey));
    const best = (filtered.length ? filtered : data.pairs).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    return {
      price: parseFloat(best.priceUsd),
      liquidity: best.liquidity?.usd,
      volume24h: best.volume?.h24,
      dex: best.dexId,
      priceChange24h: best.priceChange?.h24,
      pair: best.pairAddress,
      name: best.baseToken?.name || "",
      symbol: best.baseToken?.symbol || "",
    };
  } catch (e) { if (signal?.aborted) throw e; return null; }
}

async function fetchTokenInfo(ca, chainId, signal) {
  if (!ca || ca.length < 6) return null;
  const cacheKey = `dex:${ca}`;
  const cached = cacheGet(cacheKey);
  try {
    let data = cached;
    if (!data) {
      const res = await fetchWithRetry(`https://api.dexscreener.com/latest/dex/tokens/${ca}`, { signal });
      data = await res.json();
      cacheSet(cacheKey, data);
    }
    if (!data.pairs?.length) return null;
    const chain = CHAINS[chainId];
    const dexKey = chain?.dexscreener || String(chainId);
    const filtered = data.pairs.filter(p => p.chainId === dexKey);
    const best = (filtered.length ? filtered : data.pairs).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    return {
      name: best.baseToken?.name || "Unknown",
      symbol: best.baseToken?.symbol || "???",
      decimals: 18,
      address: ca,
    };
  } catch (e) { if (signal?.aborted) throw e; return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE ENGINE — gas, fees, scores, net profit, confidence, risk, best route
// ═══════════════════════════════════════════════════════════════════════════════
function analyzeOpportunity(opp, { tradeUsd = 1000, slippagePct = 1, bridge = null } = {}) {
  const buyC = opp.buyChain, sellC = opp.sellChain;
  const grossPct = opp.spread; // % gross spread
  const gas = (GAS_USD[buyC] || 1) + (GAS_USD[sellC] || 1);
  const swapFeePct = 0.3 * 2; // two DEX swaps ~0.3% each
  const bridgeFeePct = bridge ? bridge.feePct : 0.08;
  const buyLiq = opp.buyLiq || 0, sellLiq = opp.sellLiq || 0;
  const minLiq = Math.min(buyLiq || Infinity, sellLiq || 0) || 0;

  // Price impact estimate from trade size vs liquidity (very rough constant-product proxy)
  const priceImpactPct = minLiq > 0 ? Math.min(50, (tradeUsd / minLiq) * 100 * 0.5) : 25;
  const slipCostPct = slippagePct + priceImpactPct;

  const feePctTotal = swapFeePct + bridgeFeePct + slipCostPct;
  const gasPct = tradeUsd > 0 ? (gas / tradeUsd) * 100 : 0;
  const netPct = grossPct - feePctTotal - gasPct;
  const netUsd = (netPct / 100) * tradeUsd;

  // Scores (0-100)
  const liquidityScore = Math.max(0, Math.min(100, Math.log10((minLiq || 1)) * 18));
  const volScore = Math.max(0, Math.min(100, Math.log10(((opp.buyVol || 0) + (opp.sellVol || 0)) / 2 + 1) * 16));
  const confidence = Math.max(0, Math.min(100, Math.round(0.5 * liquidityScore + 0.3 * volScore + 0.2 * Math.max(0, 100 - priceImpactPct * 4))));
  const risk = Math.max(0, Math.min(100, Math.round(100 - confidence + priceImpactPct + (netPct < 0 ? 30 : 0))));

  return {
    grossPct, gasUsd: gas, gasPct, swapFeePct, bridgeFeePct,
    priceImpactPct: +priceImpactPct.toFixed(3),
    slippagePct, slipCostPct: +slipCostPct.toFixed(3),
    feePctTotal: +feePctTotal.toFixed(3),
    netPct: +netPct.toFixed(3), netUsd: +netUsd.toFixed(2),
    liquidityScore: Math.round(liquidityScore), volScore: Math.round(volScore),
    confidence, risk,
    profitable: netPct > 0,
  };
}

const bridgeRanking = (compatible) => {
  if (!compatible.length) return {};
  const cheapest = [...compatible].sort((a, b) => a.feePct - b.feePct)[0];
  const fastest = [...compatible].sort((a, b) => a.etaMin - b.etaMin)[0];
  const safest = [...compatible].sort((a, b) => b.safety - a.safety)[0];
  return { cheapest: cheapest.name, fastest: fastest.name, safest: safest.name };
};

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════════════════════
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style= ...g.root, alignItems: "center", justifyContent: "center", padding: "40px" >
          <div style= ...g.card, maxWidth: "480px", borderColor: C.red >
            <div style= ...g.row, marginBottom: "12px" >
              <Icon name="warning" size={16} color={C.red} />
              <span style= fontFamily: FONT, fontSize: "12px", color: C.red >TERJADI ERROR</span>
            </div>
            <div style= fontFamily: FONT, fontSize: "8px", color: C.muted, lineHeight: "2", marginBottom: "14px" >
              Aplikasi mengalami kesalahan tak terduga. Data wallet kamu AMAN — aplikasi ini non-custodial dan tidak menyimpan kunci apa pun.
            </div>
            <div style= fontFamily: FONT, fontSize: "7px", color: C.red, lineHeight: "1.8", marginBottom: "14px", wordBreak: "break-word" >
              {String(this.state.error?.message || this.state.error)}
            </div>
            <button style={g.btn("primary")} onClick={() => { this.setState({ error: null }); location.reload(); }}>RELOAD APP</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
function Toast({ items }) {
  return (
    <div style= position: "fixed", bottom: "16px", right: "16px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "6px" >
      {items.map(t => (
        <div key={t.id} style={{
          background: C.card2,
          border: `2px solid ${t.type === "success" ? C.green : t.type === "error" ? C.red : t.type === "warn" ? C.yellow : C.border2}`,
          padding: "10px 14px",
          fontSize: "8px",
          fontFamily: FONT,
          color: t.type === "success" ? C.green : t.type === "error" ? C.red : t.type === "warn" ? C.yellow : C.text,
          maxWidth: "280px",
          lineHeight: "1.8",
          boxShadow: "4px 4px 0 #00000088",
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function Steps({ step, labels }) {
  return (
    <div style= display: "flex", alignItems: "center", marginBottom: "18px" >
      {labels.map((l, i) => (
        <div key={i} style= display: "flex", alignItems: "center", flex: i < labels.length - 1 ? 1 : 0 >
          <div style= display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" >
            <div style={{
              width: "24px", height: "24px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "8px", fontFamily: FONT,
              background: step > i ? C.blue : step === i ? `${C.blue}30` : C.surface,
              border: `2px solid ${step >= i ? C.blue : C.border2}`,
              color: step > i ? C.white : step === i ? C.blue : C.muted,
              boxShadow: step >= i ? `0 0 10px ${C.blue}60` : "none",
            }}>
              {step > i ? "OK" : i + 1}
            </div>
            <span style= fontSize: "7px", fontFamily: FONT, color: step >= i ? C.blue : C.muted, whiteSpace: "nowrap" >{l}</span>
          </div>
          {i < labels.length - 1 && <div style= flex: 1, height: "2px", background: step > i ? C.blue : C.border2, margin: "0 6px", marginBottom: "14px"  />}
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ iconName, title, sub }) {
  return (
    <div style= marginBottom: "18px" >
      <div style= ...g.row, marginBottom: "6px" >
        <Icon name={iconName} size={16} color={C.cyan} />
        <span style={g.sectionTitle}>{title}</span>
      </div>
      {sub && <div style={g.sectionSub}>{sub}</div>}
    </div>
  );
}

function PixelDivider() {
  return <div style={{ height: "2px", background: `repeating-linear-gradient(90deg, ${C.border2} 0px, ${C.border2} 4px, transparent 4px, transparent 8px)`, margin: "14px 0" }} />;
}

function ProgressBar({ value }) {
  return (
    <div style={{ height: "10px", background: C.surface, border: `2px solid ${C.border2}`, position: "relative", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, background: C.cyan, boxShadow: `0 0 10px ${C.cyan}`, transition: "width 0.2s" }} />
    </div>
  );
}

// Transaction confirmation modal shown BEFORE any wallet signing (non-custodial UX)
function ConfirmTxModal({ tx, onConfirm, onCancel }) {
  if (!tx) return null;
  return (
    <div style= position: "fixed", inset: 0, background: "#00000099", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center"  onClick={onCancel}>
      <div style={{ background: C.card, border: `2px solid ${C.cyan}`, padding: "20px", maxWidth: "420px", width: "92%", boxShadow: `0 0 40px ${C.cyan}40` }} onClick={e => e.stopPropagation()}>
        <div style= ...g.between, marginBottom: "14px" >
          <div style={g.row}>
            <Icon name="warning" size={14} color={C.cyan} />
            <span style= fontFamily: FONT, fontSize: "10px", color: C.white >KONFIRMASI TRANSAKSI</span>
          </div>
          <button style= background: "none", border: "none", color: C.muted, cursor: "pointer", fontFamily: FONT, fontSize: "12px"  onClick={onCancel}>X</button>
        </div>
        <div style={{ background: C.surface, border: `2px solid ${C.border}`, padding: "12px", fontFamily: FONT, fontSize: "8px", color: C.muted, lineHeight: "2" }}>
          <div>TIPE: <b style= color: C.white >{tx.type}</b></div>
          {tx.lines.map((l, i) => <div key={i}>{l.k}: <b style= color: l.color || C.white >{l.v}</b></div>)}
        </div>
        <div style= ...g.warnBox, marginTop: "12px" >
          <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.9" >
            Aplikasi ini NON-CUSTODIAL. Kamu akan menandatangani transaksi ini langsung di wallet kamu. Kami tidak pernah menyimpan kunci, seed phrase, atau dana.
          </div>
        </div>
        <div style= ...g.row, marginTop: "14px" >
          <button style={g.btn("primary")} onClick={onConfirm}>LANJUT & TANDATANGAN</button>
          <button style={g.btn("ghost")} onClick={onCancel}>BATAL</button>
        </div>
      </div>
    </div>
  );
}

function BridgeModal({ opp, onClose, scannedTokens, toast }) {
  if (!opp) return null;
  const fromChain = CHAINS_BY_KEY[opp.buyChain] || CHAINS[opp.buyChain];
  const toChain = CHAINS_BY_KEY[opp.sellChain] || CHAINS[opp.sellChain];
  const fromType = fromChain?.type;
  const toType = toChain?.type;
  const compatible = BRIDGES.filter(b => b.supports.includes(fromType) && b.supports.includes(toType));
  const tokenCA = scannedTokens[opp.buyChain]?.ca || "";
  const tokenSymbol = scannedTokens[opp.buyChain]?.symbol || "TOKEN";
  const rank = bridgeRanking(compatible);

  const openAll = () => {
    compatible.forEach(b => window.open(b.url(fromChain?.id || opp.buyChain, toChain?.id || opp.sellChain, tokenCA, ""), "_blank"));
  };

  return (
    <div style= position: "fixed", inset: 0, background: "#00000099", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center"  onClick={onClose}>
      <div style={{ background: C.card, border: `2px solid ${C.border2}`, padding: "20px", maxWidth: "460px", width: "92%", maxHeight: "85vh", overflowY: "auto", boxShadow: `0 0 40px ${C.blue}40` }} onClick={e => e.stopPropagation()}>
        <div style= ...g.between, marginBottom: "14px" >
          <div style= ...g.row >
            <Icon name="bridge" size={14} color={C.cyan} />
            <span style= fontFamily: FONT, fontSize: "10px", color: C.white >BRIDGE TOKEN</span>
          </div>
          <button style= background: "none", border: "none", color: C.muted, cursor: "pointer", fontFamily: FONT, fontSize: "12px"  onClick={onClose}>X</button>
        </div>
        <div style={{ background: C.surface, border: `2px solid ${C.border}`, padding: "10px", marginBottom: "14px" }}>
          <div style= fontSize: "7px", fontFamily: FONT, color: C.muted, marginBottom: "8px" >RUTE ARBI</div>
          <div style= display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" >
            <span style={g.chip(fromChain?.color || C.blue)}>{fromChain?.name || opp.buyChain}</span>
            <span style= color: C.muted, fontFamily: FONT, fontSize: "8px" >{">>"}</span>
            <span style={g.chip(toChain?.color || C.blueL)}>{toChain?.name || opp.sellChain}</span>
            <span style= marginLeft: "auto", ...g.tag(C.green) >+{opp.spread}%</span>
          </div>
          <div style= marginTop: "8px", fontSize: "8px", fontFamily: FONT, color: C.muted, lineHeight: "1.8" >
            TOKEN: <b style= color: C.white >{tokenSymbol}</b>\

            BELI: <span style= color: C.green >${fmt(opp.buyPrice)}</span> | JUAL: <span style= color: C.yellow >${fmt(opp.sellPrice)}</span>
          </div>
        </div>
        {compatible.length === 0 ? (
          <div style={g.warnBox}>
            <div style= ...g.row, marginBottom: "6px" >
              <Icon name="warning" size={12} color={C.yellow} />
              <span style= fontFamily: FONT, fontSize: "8px", color: C.yellow >TIDAK ADA BRIDGE</span>
            </div>
            <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" >
              Tidak ada bridge yang tersedia untuk rute ini. Coba lakukan manual via DEX di masing-masing chain.
            </div>
          </div>
        ) : (
          <>
            <div style= ...g.row, marginBottom: "10px", flexWrap: "wrap" >
              <button style={g.btn("cyan")} onClick={openAll}>BUKA SEMUA BRIDGE</button>
            </div>
            <div style= display: "flex", flexDirection: "column", gap: "8px" >
              {compatible.map(b => {
                const fromKey = fromChain?.id || opp.buyChain;
                const toKey = toChain?.id || opp.sellChain;
                const url = b.url(fromKey, toKey, tokenCA, "");
                const badges = [];
                if (rank.cheapest === b.name) badges.push(["TERMURAH", C.green]);
                if (rank.fastest === b.name) badges.push(["TERCEPAT", C.cyan]);
                if (rank.safest === b.name) badges.push(["TERAMAN", C.blueL]);
                return (
                  <div key={b.name} style={{ background: C.surface, border: `2px solid ${C.border2}`, padding: "10px 12px" }}>
                    <div style={g.between}>
                      <div>
                        <div style= ...g.row, marginBottom: "4px", flexWrap: "wrap" >
                          <span style= fontFamily: FONT, fontSize: "9px", color: C.white >{b.name}</span>
                          {badges.map(([t, c]) => <span key={t} style={g.tag(c)}>{t}</span>)}
                        </div>
                        <div style= fontFamily: FONT, fontSize: "7px", color: C.muted >{b.desc}</div>
                        <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, marginTop: "4px" >
                          FEE ~{b.feePct}% &nbsp;|&nbsp; ETA ~{b.etaMin} MNT &nbsp;|&nbsp; SAFETY {b.safety}/10
                        </div>
                      </div>
                    </div>
                    <div style= ...g.row, marginTop: "8px" >
                      <button style={g.btn("ghost")} onClick={() => window.open(url, "_blank")}>
                        <div style= ...g.row, gap: "4px" ><Icon name="extern" size={8} color={C.blue} />BUKA</div>
                      </button>
                      <button style={g.btn("ghost")} onClick={() => { navigator.clipboard?.writeText(url); toast?.("URL BRIDGE DISALIN", "success"); }}>
                        <div style= ...g.row, gap: "4px" ><Icon name="copy" size={8} color={C.text} />COPY URL</div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
function AppInner() {
  const [page, setPage] = useState("scanner");
  const [wallet, setWallet] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState(() => lsGet("arbx_history", []));
  const [bridgeModal, setBridgeModal] = useState(null);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [balance, setBalance] = useState(null);
  const [confirmTx, setConfirmTx] = useState(null); // { type, lines, run }

  // ── Settings (persisted) ──
  const [settings, setSettings] = useState(() => lsGet("arbx_settings", {
    theme: "dark", language: "id", refreshInterval: 30, notifications: true, sound: true,
    profitThreshold: 1, minNetFilter: 0, tradeSize: 1000, gasPreference: "standard",
    telegramToken: "", telegramChatId: "", discordWebhook: "",
  }));
  const setSetting = (k, v) => setSettings(p => ({ ...p, [k]: v }));
  useEffect(() => { lsSet("arbx_settings", settings); }, [settings]);
  useEffect(() => { applyTheme(settings.theme); }, [settings.theme]);

  // ── Scanner state ──
  const [tokenName, setTokenName] = useState("");
  const [caInputs, setCaInputs] = useState({
    ethereum: "", bsc: "", base: "", arbitrum: "",
    polygon: "", avalanche: "", hyperevm: "", nesa: "", solana: "",
  });
  const [scanResults, setScanResults] = useState({});
  const [scanLoading, setScanLoading] = useState({});
  const [opportunities, setOpps] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [favorites, setFavorites] = useState(() => lsGet("arbx_favorites", []));
  const [scanHistory, setScanHistory] = useState(() => lsGet("arbx_scanhistory", []));
  const autoRef = useRef(null);
  const scanAbortRef = useRef(null);

  // Scanned tokens: { chainKey: { ca, symbol, name, price, ... } }
  const [scannedTokens, setScannedTokens] = useState({});

  // ── Bridge state ──
  const [bFrom, setBFrom] = useState("");
  const [bTo, setBTo] = useState("");
  const [bStep, setBStep] = useState(0);

  // ── Swap state ──
  const [sFrom, setSFrom] = useState("");
  const [sTo, setSTo] = useState("");
  const [sAmt, setSAmt] = useState("");
  const [sStep, setSStep] = useState(0);
  const [sLoading, setSLoading] = useState(false);
  const [sQuote, setSQuote] = useState(null);
  const [sHash, setSHash] = useState(null);
  const [sSlippage, setSSlippage] = useState(1);

  // ── Transfer state ──
  const [tChain, setTChain] = useState("");
  const [tTo, setTTo] = useState("");
  const [tAmt, setTAmt] = useState("");
  const [tCA, setTCA] = useState("");
  const [tTokenInfo, setTTokenInfo] = useState(null);
  const [tFetchingToken, setTFetchingToken] = useState(false);
  const [tStep, setTStep] = useState(0);
  const [tHash, setTHash] = useState(null);
  const [tLoading, setTLoading] = useState(false);
  const [addressBook, setAddressBook] = useState(() => lsGet("arbx_addressbook", []));
  const [recentAddresses, setRecentAddresses] = useState(() => lsGet("arbx_recent_addr", []));

  // ── History view state ──
  const [hSearch, setHSearch] = useState("");
  const [hFilter, setHFilter] = useState("all");

  // ── Toast ──
  const toast = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
    if (type === "success" && settings.sound) playBeep(true);
    if (type === "error" && settings.sound) playBeep(false);
  }, [settings.sound]);

  // ── Persisters ──
  useEffect(() => { lsSet("arbx_history", history); }, [history]);
  useEffect(() => { lsSet("arbx_favorites", favorites); }, [favorites]);
  useEffect(() => { lsSet("arbx_scanhistory", scanHistory); }, [scanHistory]);
  useEffect(() => { lsSet("arbx_addressbook", addressBook); }, [addressBook]);
  useEffect(() => { lsSet("arbx_recent_addr", recentAddresses); }, [recentAddresses]);

  const addHistory = (entry) => setHistory(p => [{ ...entry, ts: new Date().toLocaleTimeString("id-ID", { hour12: false }), date: Date.now() }, ...p.slice(0, 199)]);

  // ── Offline detection ──
  useEffect(() => {
    const goOnline = () => { setOnline(true); toast("KEMBALI ONLINE", "success"); };
    const goOffline = () => { setOnline(false); toast("OFFLINE - cek koneksi", "error"); };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, [toast]);

  // ── MetaMask ──
  const fetchBalance = useCallback(async (acct) => {
    try {
      if (!window.ethereum || !acct) return;
      const wei = await window.ethereum.request({ method: "eth_getBalance", params: [acct, "latest"] });
      setBalance(fromWei(BigInt(wei).toString(), 18));
    } catch { setBalance(null); }
  }, []);

  const connect = async () => {
    if (!window.ethereum) { toast("INSTALL METAMASK DULU", "error"); return; }
    try {
      const [acct] = await window.ethereum.request({ method: "eth_requestAccounts" });
      const cid = await window.ethereum.request({ method: "eth_chainId" });
      setWallet(acct); setChainId(parseInt(cid, 16));
      fetchBalance(acct);
      toast(`CONNECTED: ${sh(acct)}`, "success");
    } catch (e) { toast(friendlyError(e) || "KONEKSI DITOLAK", "error"); }
  };

  // Disconnect Session — clears LOCAL app state only (cannot revoke wallet itself; non-custodial)
  const disconnectSession = () => {
    setWallet(null); setChainId(null); setBalance(null);
    setSStep(0); setSQuote(null); setSHash(null);
    setTStep(0); setTHash(null);
    toast("SESI DIPUTUS (LOKAL)", "success");
  };

  useEffect(() => {
    if (!window.ethereum) return;
    const onA = a => { if (a[0]) { setWallet(a[0]); fetchBalance(a[0]); } else { setWallet(null); setBalance(null); } };
    const onC = c => { setChainId(parseInt(c, 16)); if (wallet) fetchBalance(wallet); };
    window.ethereum.on("accountsChanged", onA);
    window.ethereum.on("chainChanged", onC);
    return () => { window.ethereum.removeListener("accountsChanged", onA); window.ethereum.removeListener("chainChanged", onC); };
  }, [fetchBalance, wallet]);

  const switchChain = async (targetId) => {
    const t = CHAINS[targetId] || Object.values(CHAINS_BY_KEY).find(c => c.id === Number(targetId));
    if (!t || t.type !== "evm") { toast(`SWITCH MANUAL UNTUK ${t?.name || targetId}`, "warn"); return; }
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${Number(targetId).toString(16)}` }] });
      setChainId(Number(targetId));
      toast(`PINDAH KE ${t.name}`, "success");
    } catch (e) { toast(`GAGAL SWITCH: ${friendlyError(e)}`, "error"); }
  };

  // ── Scanner helpers ──
  const clearAll = () => {
    setCaInputs({ ethereum:"", bsc:"", base:"", arbitrum:"", polygon:"", avalanche:"", hyperevm:"", nesa:"", solana:"" });
    setScanResults({}); setOpps([]); setScannedTokens({}); setScanProgress(0);
    toast("SEMUA CA DIBERSIHKAN", "success");
  };

  const pasteClipboard = async (key) => {
    try {
      const text = await navigator.clipboard.readText();
      const val = sanitizeCA(text);
      setCaInputs(p => ({ ...p, [key]: val }));
      toast("DITEMPEL DARI CLIPBOARD", "success");
    } catch { toast("GAGAL BACA CLIPBOARD", "error"); }
  };

  // Parse pasted/imported text: lines like "chainKey,address" or just addresses (auto-detect EVM/SVM)
  const ingestBulk = (text) => {
    const lines = (text || "").split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    const next = { ...caInputs };
    let added = 0;
    lines.forEach(line => {
      const parts = line.split(/[,;\t]/).map(s => s.trim());
      if (parts.length >= 2 && CHAINS_BY_KEY[parts[0].toLowerCase()]) {
        const key = parts[0].toLowerCase();
        const ca = sanitizeCA(parts[1]);
        if (isValidCAForChain(ca, CHAINS_BY_KEY[key].type)) { next[key] = ca; added++; }
      } else {
        const ca = sanitizeCA(parts[parts.length - 1]);
        if (isValidEvm(ca)) {
          const empty = Object.keys(CHAINS_BY_KEY).find(k => CHAINS_BY_KEY[k].type === "evm" && !next[k]);
          if (empty) { next[empty] = ca; added++; }
        } else if (isValidSolana(ca)) { next.solana = ca; added++; }
      }
    });
    setCaInputs(next);
    toast(added ? `IMPORT ${added} CA` : "TIDAK ADA CA VALID", added ? "success" : "warn");
  };

  const importFile = (accept) => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = accept;
    inp.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => ingestBulk(String(reader.result));
      reader.readAsText(file);
    };
    inp.click();
  };

  const exportScanCSV = () => {
    const rows = [["Chain", "Symbol", "CA", "Price USD", "Liquidity", "Volume24h", "DEX", "Change24h%"]];
    Object.entries(scanResults).forEach(([k, r]) => {
      if (r && !r.error) rows.push([CHAINS_BY_KEY[k]?.name || k, r.symbol || "", r.ca || caInputs[k], r.price ?? "", r.liquidity ?? "", r.volume24h ?? "", r.dex || "", r.priceChange24h ?? ""]);
    });
    exportCSV(rows, `arbx-scan-${Date.now()}.csv`);
    toast("EXPORT CSV", "success");
  };
  const exportScanExcel = () => {
    const rows = [["Chain", "Symbol", "CA", "Price USD", "Liquidity", "Volume24h", "DEX", "Change24h%"]];
    Object.entries(scanResults).forEach(([k, r]) => {
      if (r && !r.error) rows.push([CHAINS_BY_KEY[k]?.name || k, r.symbol || "", r.ca || caInputs[k], r.price ?? "", r.liquidity ?? "", r.volume24h ?? "", r.dex || "", r.priceChange24h ?? ""]);
    });
    exportExcel(rows, `arbx-scan-${Date.now()}.xls`);
    toast("EXPORT EXCEL", "success");
  };

  const toggleFavorite = (key) => {
    const ca = sanitizeCA(caInputs[key]);
    if (!ca) return;
    const exists = favorites.find(f => f.ca === ca && f.chain === key);
    if (exists) setFavorites(favorites.filter(f => !(f.ca === ca && f.chain === key)));
    else setFavorites([...favorites, { chain: key, ca, name: tokenName || scanResults[key]?.symbol || "Token" }]);
  };

  // Build opportunity list (also enriched with engine analysis) — memoized derivation kept in runScan
  const runScan = useCallback(async () => {
    // Validation + duplicate detection + sanitization
    const active = Object.entries(caInputs)
      .map(([k, v]) => [k, sanitizeCA(v)])
      .filter(([, v]) => v);
    if (!active.length) { toast("ISI MINIMAL 1 CA DULU", "warn"); return; }

    const invalid = active.filter(([k, v]) => !isValidCAForChain(v, CHAINS_BY_KEY[k].type));
    if (invalid.length) { toast(`CA TIDAK VALID: ${invalid.map(([k]) => CHAINS_BY_KEY[k]?.name).join(", ")}`, "error"); return; }

    const seen = {};
    for (const [k, v] of active) { if (seen[v]) { toast(`CA DUPLIKAT terdeteksi: ${sh(v)}`, "warn"); } seen[v] = true; }

    if (!online) { toast("OFFLINE - tidak bisa scan", "error"); return; }

    const ctrl = new AbortController();
    scanAbortRef.current = ctrl;
    setScanning(true); setScanResults({}); setOpps([]); setScannedTokens({}); setScanProgress(0);
    const loading = {}; active.forEach(([k]) => loading[k] = true); setScanLoading(loading);
    const fetched = {};
    let done = 0;
    await Promise.all(active.map(async ([chain, ca]) => {
      try {
        const d = await fetchDexPrice(chain, ca, ctrl.signal);
        fetched[chain] = d ? { ...d, ca } : { error: true, ca };
      } catch { fetched[chain] = { error: true, ca, aborted: ctrl.signal.aborted }; }
      done++; setScanProgress(Math.round((done / active.length) * 100));
      setScanLoading(p => ({ ...p, [chain]: false }));
      setScanResults(p => ({ ...p, [chain]: fetched[chain] }));
    }));

    if (ctrl.signal.aborted) { setScanning(false); toast("SCAN DIBATALKAN", "warn"); return; }

    // Build scannedTokens map
    const tokMap = {};
    Object.entries(fetched).forEach(([chain, d]) => {
      if (d?.price) tokMap[chain] = { ca: d.ca, symbol: d.symbol || tokenName || "TOKEN", name: d.name || tokenName || "Token", price: d.price };
    });
    setScannedTokens(tokMap);

    const scannedChains = Object.keys(tokMap);
    if (scannedChains.length >= 1) { setBFrom(scannedChains[0]); setSFrom(scannedChains[0]); setTChain(scannedChains[0]); }
    if (scannedChains.length >= 2) { setBTo(scannedChains[1]); setSTo(scannedChains[1]); }

    const prices = Object.entries(fetched).filter(([, v]) => v?.price);
    const opps = [];
    for (let i = 0; i < prices.length; i++) for (let j = i + 1; j < prices.length; j++) {
      const [cA, dA] = prices[i], [cB, dB] = prices[j];
      const spread = Math.abs(dA.price - dB.price) / Math.min(dA.price, dB.price) * 100;
      const [buyC, sellC, buyD, sellD] = dA.price < dB.price ? [cA, cB, dA, dB] : [cB, cA, dB, dA];
      opps.push({
        buyChain: buyC, sellChain: sellC, buyPrice: buyD.price, sellPrice: sellD.price,
        buyDex: buyD.dex, sellDex: sellD.dex, spread: +spread.toFixed(4),
        buyLiq: buyD.liquidity, sellLiq: sellD.liquidity, buyVol: buyD.volume24h, sellVol: sellD.volume24h,
        buyCA: caInputs[buyC], sellCA: caInputs[sellC],
      });
    }
    const sorted = opps.sort((a, b) => b.spread - a.spread);
    setOpps(sorted);
    setScanning(false);
    const ts = new Date().toLocaleTimeString("id-ID", { hour12: false });
    setLastScan(ts);
    setScanProgress(100);

    setScanHistory(p => [{ ts, date: Date.now(), token: tokenName || (Object.values(tokMap)[0]?.symbol) || "TOKEN", chains: prices.length, opps: sorted.length, best: sorted[0]?.spread || 0 }, ...p.slice(0, 49)]);

    // Notifications on threshold breach
    const best = sorted[0];
    if (best && best.spread >= settings.profitThreshold) {
      const msg = `ARBX: ${(tokenName || best.buyChain)} spread +${best.spread}% (${chainName(best.buyChain)} → ${chainName(best.sellChain)})`;
      if (settings.notifications) { desktopNotify("Peluang Arbitrase", msg); }
      sendTelegram(settings.telegramToken, settings.telegramChatId, msg);
      sendDiscord(settings.discordWebhook, msg);
    }

    toast(`SCAN SELESAI: ${prices.length} CHAIN, ${opps.length} PELUANG`, "success");
  }, [caInputs, tokenName, toast, online, settings]);

  const cancelScan = () => { scanAbortRef.current?.abort(); };

  const retryFailed = useCallback(async () => {
    const failed = Object.entries(scanResults).filter(([, v]) => v?.error).map(([k]) => k);
    if (!failed.length) { toast("TIDAK ADA YANG GAGAL", "warn"); return; }
    const ctrl = new AbortController();
    setScanLoading(p => { const n = { ...p }; failed.forEach(k => n[k] = true); return n; });
    await Promise.all(failed.map(async (chain) => {
      const ca = sanitizeCA(caInputs[chain]);
      try {
        const d = await fetchDexPrice(chain, ca, ctrl.signal);
        setScanResults(p => ({ ...p, [chain]: d ? { ...d, ca } : { error: true, ca } }));
        if (d?.price) setScannedTokens(p => ({ ...p, [chain]: { ca, symbol: d.symbol || tokenName || "TOKEN", name: d.name || "Token", price: d.price } }));
      } catch { /* keep error */ }
      setScanLoading(p => ({ ...p, [chain]: false }));
    }));
    toast("RETRY SELESAI", "success");
  }, [scanResults, caInputs, tokenName, toast]);

  useEffect(() => {
    if (autoRefresh) {
      const iv = Math.max(10, settings.refreshInterval) * 1000;
      autoRef.current = setInterval(runScan, iv);
      toast(`AUTO-REFRESH ${settings.refreshInterval}S AKTIF`);
    } else clearInterval(autoRef.current);
    return () => clearInterval(autoRef.current);
  }, [autoRefresh, runScan, settings.refreshInterval]);

  // Engine analysis for opportunities, memoized
  const analyzedOpps = useMemo(() => opportunities.map(o => ({
    ...o,
    analysis: analyzeOpportunity(o, { tradeUsd: settings.tradeSize, slippagePct: sSlippage }),
  })).filter(o => o.analysis.netPct >= (settings.minNetFilter ?? -Infinity)),
  [opportunities, settings.tradeSize, settings.minNetFilter, sSlippage]);

  const bestRoute = useMemo(() => {
    if (!analyzedOpps.length) return null;
    return [...analyzedOpps].sort((a, b) => b.analysis.netUsd - a.analysis.netUsd)[0];
  }, [analyzedOpps]);

  // ── Swap (deBridge) ──
  const getSwapQuote = async () => {
    if (!sAmt || !wallet) { toast(wallet ? "ISI JUMLAH" : "CONNECT WALLET DULU", "warn"); return; }
    if (!sFrom || !sTo) { toast("PILIH CHAIN DULU", "warn"); return; }
    if (isNaN(parseFloat(sAmt)) || parseFloat(sAmt) <= 0) { toast("JUMLAH TIDAK VALID", "warn"); return; }
    const fromToken = scannedTokens[sFrom];
    const toToken = scannedTokens[sTo];
    if (!fromToken || !toToken) { toast("TOKEN TIDAK DITEMUKAN DI CHAIN INI", "warn"); return; }
    setSLoading(true); setSQuote(null);
    try {
      const dec = 18;
      const inAmt = toWei(sAmt, dec);
      const url = `https://api.dln.trade/v1.0/dln/order/quote?srcChainId=${CHAINS_BY_KEY[sFrom]?.id}&srcChainTokenIn=${fromToken.ca}&srcChainTokenInAmount=${inAmt}&dstChainId=${CHAINS_BY_KEY[sTo]?.id}&dstChainTokenOut=${toToken.ca}&prependOperatingExpenses=true&affiliateFeePercent=0`;
      const res = await fetchWithRetry(url, { retries: 2 });
      if (!res.ok) { const e = await res.json(); throw new Error(e.errorMessage || res.status); }
      const data = await res.json();
      const outAmt = fromWei(data.estimation?.dstChainTokenOut?.amount || 0, dec);
      const inUsd = parseFloat(sAmt) * (fromToken.price || 0);
      const outUsd = outAmt * (toToken.price || 0);
      const priceImpact = inUsd > 0 ? ((inUsd - outUsd) / inUsd) * 100 : 0;
      const minReceive = outAmt * (1 - sSlippage / 100);
      setSQuote({ fromToken, toToken, inAmt, dec, outAmt: outAmt.toFixed(6), priceImpact: +priceImpact.toFixed(3), minReceive: minReceive.toFixed(6) });
      setSStep(1); toast("QUOTE DIDAPAT", "success");
    } catch (e) { toast(`QUOTE GAGAL: ${friendlyError(e)}`, "error"); }
    setSLoading(false);
  };

  const doExecSwap = async () => {
    if (!sQuote || !wallet) return;
    setSLoading(true);
    try {
      const fromChainId = CHAINS_BY_KEY[sFrom]?.id;
      const toChainId = CHAINS_BY_KEY[sTo]?.id;
      if (chainId !== fromChainId) { await switchChain(fromChainId); await sleep(1200); }
      const url = `https://api.dln.trade/v1.0/dln/order/create-tx?srcChainId=${fromChainId}&srcChainTokenIn=${sQuote.fromToken.ca}&srcChainTokenInAmount=${sQuote.inAmt}&dstChainId=${toChainId}&dstChainTokenOut=${sQuote.toToken.ca}&dstChainTokenOutRecipient=${wallet}&senderAddress=${wallet}&srcChainOrderAuthorityAddress=${wallet}&dstChainOrderAuthorityAddress=${wallet}&prependOperatingExpenses=true&affiliateFeePercent=0`;
      const res = await fetchWithRetry(url, { retries: 1 });
      if (!res.ok) { const e = await res.json(); throw new Error(e.errorMessage || res.status); }
      const tx = await res.json();
      if (!tx.tx) throw new Error("Tidak ada tx data");
      toast("MENGIRIM SWAP...", "warn");
      const ov = await gasOverrides();
      const hash = await sendTx({ from: wallet, to: tx.tx.to, data: tx.tx.data, value: tx.tx.value || "0x0", gas: "0x493E0", ...ov });
      setSHash(hash); setSStep(2);
      addHistory({ type: "Swap", detail: `${sAmt} ${sQuote.fromToken.symbol} >> ${sQuote.toToken.symbol}: ${chainName(sFrom)} >> ${chainName(sTo)}`, hash, chainId: fromChainId, retry: { kind: "swap" } });
      if (settings.notifications) desktopNotify("Swap Berhasil", `${sAmt} ${sQuote.fromToken.symbol} → ${sQuote.toToken.symbol}`);
      toast("SWAP BERHASIL!", "success");
    } catch (e) { toast(`GAGAL: ${friendlyError(e)}`, "error"); }
    setSLoading(false);
  };

  // Confirmation screen BEFORE signing
  const execSwap = () => {
    if (!sQuote || !wallet) return;
    setConfirmTx({
      type: "CROSS-CHAIN SWAP",
      lines: [
        { k: "DARI", v: `${sAmt} ${sQuote.fromToken.symbol} (${chainName(sFrom)})` },
        { k: "KE", v: `~${sQuote.outAmt} ${sQuote.toToken.symbol} (${chainName(sTo)})`, color: C.green },
        { k: "MIN TERIMA", v: `${sQuote.minReceive} ${sQuote.toToken.symbol}`, color: C.yellow },
        { k: "PRICE IMPACT", v: `${sQuote.priceImpact}%`, color: C.red },
        { k: "SLIPPAGE", v: `${sSlippage}%` },
      ],
      run: doExecSwap,
    });
  };
const swapPctOf = async (frac) => {
  if (!wallet || !sFrom) { toast("CONNECT & PILIH CHAIN DULU", "warn"); return; }
  const tok = scannedTokens[sFrom];
  if (!tok) { toast("TOKEN TIDAK ADA", "warn"); return; }
  if (chainId !== CHAINS_BY_KEY[sFrom]?.id) { toast("SWITCH KE CHAIN ASAL DULU", "warn"); return; }
  const bal = await erc20BalanceOf(tok.ca, wallet, 18);
  if (bal == null) { toast("GAGAL BACA SALDO TOKEN", "error"); return; }
  setSAmt((bal * frac).toFixed(6)); setSStep(0);
};
  
  const reverseSwap = () => { const f = sFrom, t = sTo; setSFrom(t); setSTo(f); setSStep(0); setSQuote(null); };

  // ── Transfer ──
  const fetchTransferToken = async () => {
    const ca = sanitizeCA(tCA);
    if (!isValidEvm(ca)) { toast("CA TOKEN TIDAK VALID (0x...)", "warn"); return; }
    if (!tChain) { toast("PILIH CHAIN DULU", "warn"); return; }
    setTFetchingToken(true); setTTokenInfo(null);
    const chainData = CHAINS_BY_KEY[tChain];
    try {
      const info = await fetchTokenInfo(ca, chainData?.id);
      if (info) { setTTokenInfo(info); toast(`TOKEN DITEMUKAN: ${info.symbol}`, "success"); }
      else toast("TOKEN TIDAK DITEMUKAN", "error");
    } catch (e) { toast(friendlyError(e), "error"); }
    setTFetchingToken(false);
  };

  // ENS resolution (mainnet) via public resolver
  const resolveEns = async (name) => {
    try {
      const res = await fetchWithRetry(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`, { retries: 1, timeout: 6000 });
      const data = await res.json();
      return data.address && isValidEvm(data.address) ? data.address : null;
    } catch { return null; }
  };

  const resolveRecipient = async () => {
    const raw = (tTo || "").trim();
    if (isValidEns(raw)) {
      const addr = await resolveEns(raw);
      if (addr) return addr;
      throw new Error("ENS tidak dapat di-resolve");
    }
    if (!isValidEvm(raw)) throw new Error("Alamat penerima tidak valid");
    return raw;
  };

  const doExecTransfer = async (recipient) => {
    setTLoading(true); setTStep(1);
    try {
      const chainData = CHAINS_BY_KEY[tChain];
      if (chainId !== chainData?.id) { await switchChain(chainData?.id); await sleep(1200); }
      const dec = tTokenInfo.decimals || 18;
      const amt = BigInt(Math.round(parseFloat(tAmt) * 10 ** dec)).toString(16).padStart(64, "0");
      const data = "0xa9059cbb" + recipient.replace("0x", "").padStart(64, "0") + amt;
      const ov = await gasOverrides();
const hash = await sendTx({ from: wallet, to: sanitizeCA(tCA), data, gas: "0xEA60", ...ov });
      setTHash(hash); setTStep(2);
      addHistory({ type: "Transfer", detail: `${tAmt} ${tTokenInfo.symbol} >> ${sh(recipient)}`, hash, chainId: chainData?.id });
      // Recent + de-dup
      setRecentAddresses(p => [recipient, ...p.filter(a => a !== recipient)].slice(0, 8));
      if (settings.notifications) desktopNotify("Transfer Berhasil", `${tAmt} ${tTokenInfo.symbol} → ${sh(recipient)}`);
      toast("TRANSFER BERHASIL!", "success");
    } catch (e) { setTStep(0); toast(`GAGAL: ${friendlyError(e)}`, "error"); }
    setTLoading(false);
  };

  const execTransfer = async () => {
    if (!wallet) { toast("CONNECT WALLET DULU", "error"); return; }
    if (!tTo || !tAmt) { toast("ISI ALAMAT & JUMLAH", "warn"); return; }
    if (!tTokenInfo) { toast("FETCH TOKEN INFO DULU", "warn"); return; }
    if (isNaN(parseFloat(tAmt)) || parseFloat(tAmt) <= 0) { toast("JUMLAH TIDAK VALID", "warn"); return; }
    let recipient;
    try { recipient = await resolveRecipient(); }
    catch (e) { toast(friendlyError(e), "error"); return; }
    const chainData = CHAINS_BY_KEY[tChain];
    setConfirmTx({
      type: "TRANSFER TOKEN",
      lines: [
        { k: "TOKEN", v: tTokenInfo.symbol },
        { k: "JUMLAH", v: tAmt, color: C.green },
        { k: "KE", v: sh(recipient), color: C.yellow },
        { k: "CHAIN", v: chainData?.name || tChain },
      ],
      run: () => doExecTransfer(recipient),
    });
  };

  const pasteTransferAddr = async () => {
    try { const text = await navigator.clipboard.readText(); setTTo(text.trim()); toast("ALAMAT DITEMPEL", "success"); }
    catch { toast("GAGAL BACA CLIPBOARD", "error"); }
  };
   const transferMax = async () => {
  if (!wallet || !tCA || !tTokenInfo) { toast("CEK TOKEN DULU", "warn"); return; }
  if (chainId !== CHAINS_BY_KEY[tChain]?.id) { toast("SWITCH KE CHAIN INI DULU", "warn"); return; }
  const bal = await erc20BalanceOf(sanitizeCA(tCA), wallet, tTokenInfo.decimals || 18);
  if (bal == null) { toast("GAGAL BACA SALDO", "error"); return; }
  setTAmt(String(bal));
};
    const saveToAddressBook = () => {
    const a = (tTo || "").trim();
    if (!isValidEvm(a) && !isValidEns(a)) { toast("ALAMAT TIDAK VALID", "warn"); return; }
    const label = prompt("Label untuk alamat ini:") || sh(a);
    if (!addressBook.find(x => x.address === a)) setAddressBook([...addressBook, { label, address: a }]);
    toast("DISIMPAN KE ADDRESS BOOK", "success");
  };
  // Lightweight QR "scanner": prompt for pasted QR-decoded text (no camera lib dependency)
  const scanQR = () => {
    const v = prompt("Tempel hasil QR (alamat wallet):");
    if (v && (isValidEvm(v.trim()) || isValidEns(v.trim()))) { setTTo(v.trim()); toast("ALAMAT DARI QR", "success"); }
    else if (v) toast("QR BUKAN ALAMAT VALID", "error");
  };
  const erc20BalanceOf = async (ca, owner, dec = 18) => {
  try {
    const data = "0x70a08231" + owner.replace("0x", "").padStart(64, "0");
    const hex = await window.ethereum.request({ method: "eth_call", params: [{ to: ca, data }, "latest"] });
    return Number(BigInt(hex)) / 10 ** dec;
  } catch { return null; }
};

  const sendTx = (tx) => window.ethereum.request({ method: "eth_sendTransaction", params: [tx] });
  const gasOverrides = async () => {
  try {
    const gp = await window.ethereum.request({ method: "eth_gasPrice" });
    const mult = { slow: 0.9, standard: 1, fast: 1.25 }[settings.gasPreference] || 1;
    const scaled = BigInt(Math.round(Number(BigInt(gp)) * mult));
    return { gasPrice: "0x" + scaled.toString(16) };
  } catch { return {}; }
};
  const explorerUrl = (cid, hash) => `${CHAINS[cid]?.explorer || "https://etherscan.io"}/tx/${hash}`;
  const curChain = CHAINS[chainId] || Object.values(CHAINS_BY_KEY).find(c => c.id === chainId);
  const knownNetwork = !!curChain;

  const scannedChainKeys = Object.keys(scannedTokens);
  const hasScanned = scannedChainKeys.length > 0;

  // ── History helpers ──
  const filteredHistory = useMemo(() => history.filter(h => {
    if (hFilter !== "all" && h.type !== hFilter) return false;
    if (hSearch && !(`${h.type} ${h.detail} ${h.hash || ""}`.toLowerCase().includes(hSearch.toLowerCase()))) return false;
    return true;
  }), [history, hFilter, hSearch]);

  const exportHistoryCSV = () => {
    const rows = [["Type", "Detail", "Hash", "ChainId", "Time"], ...history.map(h => [h.type, h.detail, h.hash || "", h.chainId || "", h.ts])];
    exportCSV(rows, `arbx-history-${Date.now()}.csv`);
  };
  const exportHistoryExcel = () => {
    const rows = [["Type", "Detail", "Hash", "ChainId", "Time"], ...history.map(h => [h.type, h.detail, h.hash || "", h.chainId || "", h.ts])];
    exportExcel(rows, `arbx-history-${Date.now()}.xls`);
  };
  const clearHistory = () => { if (confirm("Hapus semua riwayat sesi (lokal)?")) { setHistory([]); toast("RIWAYAT DIHAPUS", "success"); } };

  const NAV = [
    { key: "scanner",  iconName: "scan",     label: "SCANNER"  },
    { key: "dex",      iconName: "dex",      label: "DEX"      },
    { key: "bridge",   iconName: "bridge",   label: "BRIDGE"   },
    { key: "swap",     iconName: "swap",     label: "SWAP"     },
    { key: "transfer", iconName: "transfer", label: "TRANSFER" },
    { key: "history",  iconName: "history",  label: "RIWAYAT"  },
    { key: "settings", iconName: "settings", label: "SETTINGS" },
    { key: "guide",    iconName: "guide",    label: "PANDUAN"  },
  ];

  // ── RENDER ──
  return (
    <div style={g.root}>
      <Toast items={toasts} />
      {bridgeModal && <BridgeModal opp={bridgeModal} onClose={() => setBridgeModal(null)} scannedTokens={scannedTokens} toast={toast} />}
      <ConfirmTxModal tx={confirmTx} onCancel={() => setConfirmTx(null)} onConfirm={() => { const fn = confirmTx?.run; setConfirmTx(null); fn?.(); }} />

      {/* Topbar */}
      <div style={g.topbar}>
        <div style={g.brand}>
          <Icon name="arb" size={20} color={C.cyan} />
          ARB<span style= color: C.cyan >X</span>
        </div>
        <div style= marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" >
          {!online && <span style={g.tag(C.red)}>OFFLINE</span>}
          {wallet && curChain && <span style={g.tag(curChain.color || C.blue)}>{curChain.name}</span>}
          {wallet && !knownNetwork && <span style={g.tag(C.yellow)}>NETWORK ASING</span>}
          {wallet && balance != null && curChain && <span style= fontFamily: FONT, fontSize: "8px", color: C.green >{fmt(balance, 4)} {curChain.symbol}</span>}
          {wallet && (
            <span style= ...g.row, gap: "4px", cursor: "pointer"  onClick={() => { navigator.clipboard?.writeText(wallet); toast("ALAMAT DISALIN", "success"); }}>
              <span style= fontFamily: FONT, fontSize: "8px", color: C.muted >{sh(wallet)}</span>
              <Icon name="copy" size={8} color={C.muted} />
            </span>
          )}
          <button style={g.btn(wallet ? "ghost" : "primary")} onClick={connect}>
            <div style= ...g.row, gap: "6px" >
              <Icon name={wallet ? "check" : "connect"} size={10} color={wallet ? C.green : C.white} />
              {wallet ? "CONNECTED" : "CONNECT"}
            </div>
          </button>
          {wallet && <button style={g.btn("danger")} onClick={disconnectSession}>DISCONNECT</button>}
        </div>
      </div>

      <div style={g.layout}>
        {/* Sidebar */}
        <div style={g.sidebar}>
          {NAV.map(n => (
            <button key={n.key} style={g.navItem(page === n.key)} onClick={() => setPage(n.key)}>
              <Icon name={n.iconName} size={12} color={page === n.key ? C.cyan : C.muted} />
              {n.label}
            </button>
          ))}
          <div style={{ marginTop: "auto", padding: "12px", borderTop: `2px solid ${C.border2}` }}>
            {lastScan && <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" >LAST SCAN\
{lastScan}</div>}
            <div style= fontFamily: FONT, fontSize: "7px", color: online ? C.green : C.red, marginTop: "8px" >{online ? "● ONLINE" : "● OFFLINE"}</div>
          </div>
        </div>

        {/* Main */}
        <div style={g.main}>

          {/* ── CA SCANNER ── */}
          {page === "scanner" && (
            <div style= display: "flex", flexDirection: "column", gap: "16px" >
              <SectionHeader iconName="scan" title="CA SCANNER" sub="MASUKKAN CONTRACT ADDRESS TOKEN DI TIAP CHAIN, LALU SCAN UNTUK TEMUKAN PELUANG ARBITRASI" />

              <div style={g.card}>
                <div style= ...g.between, marginBottom: "14px", flexWrap: "wrap", gap: "8px" >
                  <div style= fontFamily: FONT, fontSize: "10px", color: C.white >CONTRACT ADDRESSES</div>
                  <div style= ...g.row >
                    <label style= ...g.label, margin: 0 >NAMA TOKEN:</label>
                    <input value={tokenName} onChange={e => setTokenName(e.target.value)} placeholder="cth: PEPE" style= ...g.input, width: "120px", textAlign: "center"  />
                  </div>
                </div>

                {/* Scanner toolbar */}
                <div style= ...g.row, flexWrap: "wrap", marginBottom: "12px", gap: "6px" >
                  <button style={g.btn("ghost")} onClick={clearAll}>CLEAR ALL</button>
                  <button style={g.btn("ghost")} onClick={() => importFile(".txt")}>IMPORT TXT</button>
                  <button style={g.btn("ghost")} onClick={() => importFile(".csv")}>IMPORT CSV</button>
                  <button style={g.btn("ghost")} onClick={exportScanCSV} disabled={!hasScanned}>EXPORT CSV</button>
                  <button style={g.btn("ghost")} onClick={exportScanExcel} disabled={!hasScanned}>EXPORT XLS</button>
                </div>

                <div style= display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "10px" >
                  {Object.entries(CHAINS_BY_KEY).map(([key, chain]) => {
                    const val = caInputs[key] || "";
                    const valid = !val || isValidCAForChain(val, chain.type);
                    const isFav = favorites.find(f => f.ca === sanitizeCA(val) && f.chain === key);
                    return (
                      <div key={key} style={{ background: C.surface, border: `2px solid ${valid ? C.border : C.red}`, padding: "10px" }}>
                        <div style= ...g.between, marginBottom: "8px" >
                          <div style={g.row}>
                            <div style={g.dot(chain.color)} />
                            <span style= fontFamily: FONT, fontSize: "8px", color: C.white >{chain.name}</span>
                            <span style= fontFamily: FONT, fontSize: "7px", color: C.muted >{chain.symbol}</span>
                          </div>
                          <div style={g.row}>
                            <span style= cursor: "pointer"  onClick={() => toggleFavorite(key)} title="Favorite">
                              <Icon name="star" size={10} color={isFav ? C.yellow : C.muted} />
                            </span>
                            <span style= cursor: "pointer"  onClick={() => pasteClipboard(key)} title="Paste">
                              <Icon name="copy" size={10} color={C.blue} />
                            </span>
                            {scanLoading[key] && <span style= fontFamily: FONT, fontSize: "8px", color: C.yellow >...</span>}
                            {scanResults[key] && !scanResults[key].error && <span style={g.tag(C.green)}>OK</span>}
                            {scanResults[key]?.error && <span style={g.tag(C.red)}>ERR</span>}
                          </div>
                        </div>
                        <input
                          value={val}
                          onChange={e => setCaInputs(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={chain.type === "svm" ? "SOLANA ADDRESS..." : "0x..."}
                          style= ...g.input, fontSize: "8px", padding: "8px 10px", borderColor: valid ? C.border2 : C.red​NOTION_TWS[ ]NOTION_TWS​
                        />
                        {!valid && <div style= fontFamily: FONT, fontSize: "7px", color: C.red, marginTop: "4px" >ADDRESS TIDAK VALID</div>}
                        {scanResults[key] && !scanResults[key].error && (
                          <div style= marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" >
                            <span style= fontFamily: FONT, fontSize: "10px", color: C.green >${fmt(scanResults[key].price)}</span>
                            {scanResults[key].symbol && <span style={g.tag(chain.color)}>{scanResults[key].symbol}</span>}
                            {scanResults[key].dex && <span style= fontFamily: FONT, fontSize: "7px", color: C.muted >{scanResults[key].dex}</span>}
                            {scanResults[key].liquidity && <span style= fontFamily: FONT, fontSize: "7px", color: C.muted >LIQ: ${(scanResults[key].liquidity / 1000).toFixed(1)}K</span>}
                            {scanResults[key].priceChange24h != null && (
                              <span style= fontFamily: FONT, fontSize: "7px", color: scanResults[key].priceChange24h >= 0 ? C.green : C.red >
                                {scanResults[key].priceChange24h >= 0 ? "+" : ""}{Math.abs(scanResults[key].priceChange24h).toFixed(2)}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {scanning && <div style= marginTop: "14px" ><ProgressBar value={scanProgress} /><div style= fontFamily: FONT, fontSize: "7px", color: C.muted, marginTop: "6px" >SCANNING {scanProgress}%</div></div>}

                <div style= ...g.row, marginTop: "14px", flexWrap: "wrap" >
                  <button style={g.btn("primary", scanning)} onClick={runScan} disabled={scanning}>
                    <div style= ...g.row, gap: "6px" >
                      <Icon name="scan" size={10} color={C.white} />
                      {scanning ? "SCANNING..." : "SCAN SEMUA CHAIN"}
                    </div>
                  </button>
                  {scanning && <button style={g.btn("danger")} onClick={cancelScan}>CANCEL SCAN</button>}
                  <button style={g.btn("ghost")} onClick={retryFailed}>RETRY FAILED</button>
                  <button style={g.btn("ghost")} onClick={() => setAutoRefresh(p => !p)}>
                    {autoRefresh ? "STOP AUTO" : `AUTO ${settings.refreshInterval}S`}
                  </button>
                  {autoRefresh && <span style={g.tag(C.green)}>LIVE</span>}
                </div>
              </div>

              {/* Favorites */}
              {favorites.length > 0 && (
                <div style={g.card}>
                  <div style= fontFamily: FONT, fontSize: "10px", color: C.white, marginBottom: "10px" >FAVORITE TOKENS ({favorites.length})</div>
                  <div style= display: "flex", flexWrap: "wrap", gap: "8px" >
                    {favorites.map((f, i) => (
                      <div key={i} style= ...g.row, ...g.card2, gap: "6px" >
                        <Icon name="star" size={10} color={C.yellow} />
                        <span style= fontFamily: FONT, fontSize: "7px", color: C.white >{f.name}</span>
                        <span style= fontFamily: FONT, fontSize: "7px", color: C.muted >{CHAINS_BY_KEY[f.chain]?.name}</span>
                        <button style= ...g.btn("ghost"), padding: "4px 6px"  onClick={() => setCaInputs(p => ({ ...p, [f.chain]: f.ca }))}>LOAD</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Best route recommendation */}
              {bestRoute && (
                <div style= ...g.card, borderColor: C.cyan >
                  <div style= ...g.row, marginBottom: "8px" ><Icon name="arb" size={12} color={C.cyan} /><span style= fontFamily: FONT, fontSize: "9px", color: C.cyan >REKOMENDASI RUTE TERBAIK</span></div>
                  <div style= fontFamily: FONT, fontSize: "8px", color: C.muted, lineHeight: "2" >
                    {chainName(bestRoute.buyChain)} → {chainName(bestRoute.sellChain)} &nbsp;|&nbsp; GROSS +{bestRoute.spread}% &nbsp;|&nbsp;
                    NET <b style= color: bestRoute.analysis.netPct > 0 ? C.green : C.red >{bestRoute.analysis.netPct > 0 ? "+" : ""}{bestRoute.analysis.netPct}%</b>
                    {" "}(<b style= color: bestRoute.analysis.netUsd > 0 ? C.green : C.red >${bestRoute.analysis.netUsd}</b> @ ${settings.tradeSize}) &nbsp;|&nbsp;
                    CONF {bestRoute.analysis.confidence} / RISK {bestRoute.analysis.risk}
                  </div>
                </div>
              )}

                              {analyzedOpps.length > 0 && (
                <div style={g.card}>
                  <div style= ...g.between, marginBottom: "12px" >
                    <div style= fontFamily: FONT, fontSize: "10px", color: C.white >PELUANG ARBITRASI ({analyzedOpps.length})</div>
                    <div style= fontFamily: FONT, fontSize: "7px", color: C.muted >FILTER NET ≥ {settings.minNetFilter}% | SIZE ${settings.tradeSize}</div>
                  </div>
                  {analyzedOpps.map((opp, i) => {
                    const bc = CHAINS_BY_KEY[opp.buyChain] || CHAINS[opp.buyChain];
                    const sc = CHAINS_BY_KEY[opp.sellChain] || CHAINS[opp.sellChain];
                    const a = opp.analysis;
                    return (
                      <div key={i} style={{ ...g.card2, marginBottom: "10px", borderLeft: `4px solid ${a.netPct > 5 ? C.green : a.netPct > 0 ? C.yellow : C.red}` }}>
                        <div style={g.between}>
                          <div style={g.row}>
                            <span style={g.chip(bc?.color || C.blue)}>BUY {bc?.name || opp.buyChain}</span>
                            <span style= color: C.muted, fontFamily: FONT, fontSize: "8px" >{">>"}</span>
                            <span style={g.chip(sc?.color || C.blueL)}>SELL {sc?.name || opp.sellChain}</span>
                          </div>
                          <span style= ...g.tag(a.netPct > 0 ? C.green : C.red), fontSize: "9px" >NET {a.netPct > 0 ? "+" : ""}{a.netPct}%</span>
                        </div>

                        <div style= ...g.row, marginTop: "8px", fontFamily: FONT, fontSize: "8px", color: C.muted, flexWrap: "wrap", gap: "6px", lineHeight: "1.8" >
                          <span>BELI: <b style= color: C.green >${fmt(opp.buyPrice)}</b></span>
                          <span>|</span>
                          <span>JUAL: <b style= color: C.yellow >${fmt(opp.sellPrice)}</b></span>
                          <span>|</span>
                          <span>GROSS: <b style= color: C.text >+{opp.spread}%</b></span>
                          {opp.buyLiq && <span>| LIQ: ${(opp.buyLiq / 1000).toFixed(0)}K</span>}
                        </div>

                        {/* Engine metrics */}
                        <div style= display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: "6px", marginTop: "10px" >
                          <span style={g.tag(C.muted)}>GAS ${a.gasUsd.toFixed(2)}</span>
                          <span style={g.tag(C.muted)}>BRIDGE {a.bridgeFeePct}%</span>
                          <span style={g.tag(C.muted)}>SWAP {a.swapFeePct}%</span>
                          <span style={g.tag(C.muted)}>SLIP {a.slippagePct}%</span>
                          <span style={g.tag(a.priceImpactPct > 5 ? C.red : C.muted)}>IMPACT {a.priceImpactPct}%</span>
                          <span style={g.tag(C.blueL)}>LIQ SCORE {a.liquidityScore}</span>
                          <span style={g.tag(C.blueL)}>VOL SCORE {a.volScore}</span>
                          <span style={g.tag(a.confidence > 60 ? C.green : C.yellow)}>CONF {a.confidence}</span>
                          <span style={g.tag(a.risk > 60 ? C.red : C.yellow)}>RISK {a.risk}</span>
                          <span style={g.tag(a.netUsd > 0 ? C.green : C.red)}>NET ${a.netUsd}</span>
                        </div>

                        <div style= ...g.row, marginTop: "10px", flexWrap: "wrap" >
                          {DEXES[opp.buyChain]?.slice(0, 1).map(d => (
                            <button key={d.name} style={g.btn("ghost")} onClick={() => window.open(d.url(opp.buyCA || ""), "_blank")}>
                              <div style= ...g.row, gap: "4px" ><Icon name="dex" size={8} color={C.text} />BELI {d.name}</div>
                            </button>
                          ))}
                          {DEXES[opp.sellChain]?.slice(0, 1).map(d => (
                            <button key={d.name} style={g.btn("ghost")} onClick={() => window.open(d.url(opp.sellCA || ""), "_blank")}>
                              <div style= ...g.row, gap: "4px" ><Icon name="dex" size={8} color={C.text} />JUAL {d.name}</div>
                            </button>
                          ))}
                          <button style={g.btn("cyan")} onClick={() => setBridgeModal(opp)}>
                            <div style= ...g.row, gap: "4px" ><Icon name="bridge" size={8} color={C.bg} />BRIDGE</div>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Scan history */}
              {scanHistory.length > 0 && (
                <div style={g.card}>
                  <div style= fontFamily: FONT, fontSize: "10px", color: C.white, marginBottom: "10px" >SCAN HISTORY</div>
                  {scanHistory.map((s, i) => (
                    <div key={i} style={{ ...g.between, padding: "8px 0", borderBottom: `2px solid ${C.border}` }}>
                      <div style={g.row}>
                        <span style={g.tag(C.blueL)}>{s.token}</span>
                        <span style= fontFamily: FONT, fontSize: "7px", color: C.muted >{s.chains} CHAIN · {s.opps} PELUANG · BEST +{s.best}%</span>
                      </div>
                      <span style= fontFamily: FONT, fontSize: "7px", color: C.muted >{s.ts}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DEX ── */}
          {page === "dex" && (
            <div style= display: "flex", flexDirection: "column", gap: "16px" >
              <SectionHeader iconName="dex" title="DEX LINKS" sub="BUKA DEX DENGAN CA TOKEN YANG SUDAH DI-SCAN" />
              {!hasScanned ? (
                <div style={g.warnBox}>
                  <div style= ...g.row, marginBottom: "8px" >
                    <Icon name="warning" size={12} color={C.yellow} />
                    <span style= fontFamily: FONT, fontSize: "8px", color: C.yellow >SCAN DULU</span>
                  </div>
                  <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" >
                    Masukkan CA token di menu SCANNER dan klik SCAN SEMUA CHAIN terlebih dahulu.
                  </div>
                </div>
              ) : (
                <div style= display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: "12px" >
                  {Object.entries(DEXES).map(([chainKey, dexList]) => {
                    const c = CHAINS_BY_KEY[chainKey];
                    const ca = caInputs[chainKey];
                    const result = scanResults[chainKey];
                    if (!ca) return null;
                    return (
                      <div key={chainKey} style={{ ...g.card, borderTop: `4px solid ${c?.color || C.blue}` }}>
                        <div style={g.row}>
                          <div style={g.dot(c?.color || C.blue)} />
                          <span style= fontFamily: FONT, fontSize: "9px", color: C.white >{c?.name || chainKey}</span>
                        </div>
                        {result?.symbol && <div style= fontFamily: FONT, fontSize: "8px", color: C.cyan, marginTop: "6px" >{result.symbol}</div>}
                        {result?.price && (
                          <div style= fontFamily: FONT, fontSize: "10px", color: C.green, marginTop: "4px" >${fmt(result.price)}</div>
                        )}
                        <div style= display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" >
                          {dexList.map(d => (
                            <button key={d.name} style= ...g.btn("ghost"), textAlign: "left"  onClick={() => window.open(d.url(ca), "_blank")}>
                              <div style= ...g.row, gap: "6px" ><Icon name="extern" size={8} color={C.blue} />{d.name}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── BRIDGE ── */}
          {page === "bridge" && (
            <div style= display: "flex", flexDirection: "column", gap: "16px", maxWidth: "560px" >
              <SectionHeader iconName="bridge" title="BRIDGE" sub="PINDAHKAN TOKEN ANTAR CHAIN VIA BRIDGE RESMI" />
              {!hasScanned ? (
                <div style={g.warnBox}>
                  <div style= ...g.row, marginBottom: "8px" >
                    <Icon name="warning" size={12} color={C.yellow} />
                    <span style= fontFamily: FONT, fontSize: "8px", color: C.yellow >SCAN DULU</span>
                  </div>
                  <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" >
                    Masukkan CA token di menu SCANNER dan klik SCAN terlebih dahulu. Bridge hanya tersedia untuk token yang sudah di-scan.
                  </div>
                </div>
              ) : (
                <div style={g.card}>
                  <div style={g.grid2}>
                    <div>
                      <label style={g.label}>DARI CHAIN</label>
                      <select style={g.select} value={bFrom} onChange={e => setBFrom(e.target.value)}>
                        <option value="">-- PILIH --</option>
                        {scannedChainKeys.map(k => (
                          <option key={k} value={k}>{CHAINS_BY_KEY[k]?.name} ({scannedTokens[k]?.symbol})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={g.label}>KE CHAIN</label>
                      <select style={g.select} value={bTo} onChange={e => setBTo(e.target.value)}>
                        <option value="">-- PILIH --</option>
                        {scannedChainKeys.filter(k => k !== bFrom).map(k => (
                          <option key={k} value={k}>{CHAINS_BY_KEY[k]?.name} ({scannedTokens[k]?.symbol})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {bFrom && bTo && (() => {
                    const fromChain = CHAINS_BY_KEY[bFrom];
                    const toChain = CHAINS_BY_KEY[bTo];
                    const fromToken = scannedTokens[bFrom];
                    const toToken = scannedTokens[bTo];
                    const compatible = BRIDGES.filter(b => b.supports.includes(fromChain?.type) && b.supports.includes(toChain?.type));
                    const rank = bridgeRanking(compatible);
                    const openAll = () => compatible.forEach(b => window.open(b.url(fromChain?.id, toChain?.id, fromToken?.ca, ""), "_blank"));
                    return (
                      <div style= marginTop: "14px" >
                        <div style={{ background: C.surface, border: `2px solid ${C.border}`, padding: "10px", marginBottom: "12px" }}>
                          <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, marginBottom: "6px" >TOKEN YANG AKAN DI-BRIDGE</div>
                          <div style= fontFamily: FONT, fontSize: "9px", color: C.white >{fromToken?.symbol || "TOKEN"}</div>
                          <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, marginTop: "4px" >
                            {fromChain?.name}: <span style= color: C.green >${fmt(fromToken?.price)}</span> &nbsp;|&nbsp; {toChain?.name}: <span style= color: C.yellow >${fmt(toToken?.price)}</span>
                          </div>
                        </div>
                        {compatible.length === 0 ? (
                          <div style={g.warnBox}>
                            <div style= ...g.row, marginBottom: "6px" >
                              <Icon name="warning" size={12} color={C.yellow} />
                              <span style= fontFamily: FONT, fontSize: "8px", color: C.yellow >TIDAK ADA BRIDGE</span>
                            </div>
                            <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" >
                              Tidak ada bridge yang mendukung rute {fromChain?.name} ke {toChain?.name} untuk token ini. Coba rute lain atau gunakan DEX di masing-masing chain.
                            </div>
                          </div>
                        ) : (
                          <div style= display: "flex", flexDirection: "column", gap: "8px" >
                            <div style= ...g.between, marginBottom: "4px" >
                              <div style= fontFamily: FONT, fontSize: "8px", color: C.muted >PILIH BRIDGE:</div>
                              <button style={g.btn("cyan")} onClick={openAll}>BUKA SEMUA</button>
                            </div>
                            {compatible.map(b => {
                              const url = b.url(fromChain?.id, toChain?.id, fromToken?.ca, "");
                              const badges = [];
                              if (rank.cheapest === b.name) badges.push(["TERMURAH", C.green]);
                              if (rank.fastest === b.name) badges.push(["TERCEPAT", C.cyan]);
                              if (rank.safest === b.name) badges.push(["TERAMAN", C.blueL]);
                              return (
                                <div key={b.name} style={{ background: C.surface, border: `2px solid ${C.border2}`, padding: "10px 12px" }}>
                                  <div style={g.between}>
                                    <div>
                                      <div style= ...g.row, gap: "6px", marginBottom: "4px" >
                                        <span style= fontFamily: FONT, fontSize: "9px", color: C.white >{b.name}</span>
                                        {badges.map(([t, c]) => <span key={t} style={g.tag(c)}>{t}</span>)}
                                      </div>
                                      <div style= fontFamily: FONT, fontSize: "7px", color: C.muted >{b.desc}</div>
                                      <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, marginTop: "4px" >FEE ~{b.feePct}% | ETA ~{b.etaMin} MNT | SAFETY {b.safety}/10</div>
                                    </div>
                                  </div>
                                  <div style= ...g.row, marginTop: "8px" >
                                    <button style={g.btn("ghost")} onClick={() => window.open(url, "_blank")}>
                                      <div style= ...g.row, gap: "4px" ><Icon name="extern" size={8} color={C.blue} />BUKA</div>
                                    </button>
                                    <button style={g.btn("ghost")} onClick={() => { navigator.clipboard?.writeText(url); toast("URL BRIDGE DISALIN", "success"); }}>
                                      <div style= ...g.row, gap: "4px" ><Icon name="copy" size={8} color={C.text} />COPY URL</div>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ── SWAP ── */}
          {page === "swap" && (
            <div style= display: "flex", flexDirection: "column", gap: "16px", maxWidth: "560px" >
              <SectionHeader iconName="swap" title="CROSS-CHAIN SWAP" sub="SWAP TOKEN LINTAS CHAIN VIA DEBRIDGE DLN" />
              {!hasScanned ? (
                <div style={g.warnBox}>
                  <div style= ...g.row, marginBottom: "8px" >
                    <Icon name="warning" size={12} color={C.yellow} />
                    <span style= fontFamily: FONT, fontSize: "8px", color: C.yellow >SCAN DULU</span>
                  </div>
                  <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" >
                    Scan token di menu SCANNER terlebih dahulu. Token yang muncul di sini hanya yang sudah di-scan.
                  </div>
                </div>
              ) : (
                <div style={g.card}>
                  <Steps step={sStep} labels={["PILIH", "KONFIRM", "SELESAI"]} />
                  <div style={g.grid2}>
                    <div>
                      <label style={g.label}>CHAIN ASAL</label>
                      <select style={g.select} value={sFrom} onChange={e => { setSFrom(e.target.value); setSStep(0); setSQuote(null); }}>
                        <option value="">-- PILIH --</option>
                        {scannedChainKeys.filter(k => CHAINS_BY_KEY[k]?.type === "evm").map(k => (
                          <option key={k} value={k}>{CHAINS_BY_KEY[k]?.name} ({scannedTokens[k]?.symbol})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={g.label}>CHAIN TUJUAN</label>
                      <select style={g.select} value={sTo} onChange={e => { setSTo(e.target.value); setSStep(0); setSQuote(null); }}>
                        <option value="">-- PILIH --</option>
                        {scannedChainKeys.filter(k => k !== sFrom && CHAINS_BY_KEY[k]?.type === "evm").map(k => (
                          <option key={k} value={k}>{CHAINS_BY_KEY[k]?.name} ({scannedTokens[k]?.symbol})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style= ...g.row, marginTop: "10px" >
                    <button style={g.btn("ghost")} onClick={reverseSwap}>↺ REVERSE</button>
                  </div>

                  <div style= marginTop: "12px" >
                    <div style={g.between}>
                      <label style={g.label}>JUMLAH {sFrom ? `(${scannedTokens[sFrom]?.symbol})` : ""}</label>
                      <div style= ...g.row, gap: "4px" >
                        <button style={g.btn("ghost")} onClick={() => swapPctOf(0.25)}>25%</button>
                        <button style={g.btn("ghost")} onClick={() => swapPctOf(0.5)}>HALF</button>
                        <button style={g.btn("ghost")} onClick={() => swapPctOf(1)}>MAX</button>
                      </div>
                    </div>
                    <input style={g.input} placeholder="0.00" value={sAmt} onChange={e => { setSAmt(e.target.value); setSStep(0); }} />
                  </div>

                  <div style= marginTop: "12px" >
                    <label style={g.label}>SLIPPAGE TOLERANSI (%)</label>
                    <div style= ...g.row, gap: "6px" >
                      {[0.5, 1, 2, 3].map(s => (
                        <button key={s} style={g.btn(sSlippage === s ? "primary" : "ghost")} onClick={() => setSSlippage(s)}>{s}%</button>
                      ))}
                      <input style= ...g.input, width: "70px"  type="number" value={sSlippage} onChange={e => setSSlippage(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>

                  {sQuote && (
                    <div style={{ background: C.surface, border: `2px solid ${C.border2}`, padding: "12px", marginTop: "12px" }}>
                      <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, marginBottom: "8px" >QUOTE DEBRIDGE — ROUTE PREVIEW</div>
                      <div style= ...g.row, flexWrap: "wrap", marginBottom: "8px" >
                        <span style={g.chip(CHAINS_BY_KEY[sFrom]?.color || C.blue)}>{sQuote.fromToken?.symbol} @ {chainName(sFrom)}</span>
                        <span style= color: C.muted >{">>"}</span>
                        <span style={g.chip(C.cyan)}>deBridge DLN</span>
                        <span style= color: C.muted >{">>"}</span>
                        <span style={g.chip(CHAINS_BY_KEY[sTo]?.color || C.blueL)}>{sQuote.toToken?.symbol} @ {chainName(sTo)}</span>
                      </div>
                      <div style={g.between}><span style= fontFamily: FONT, fontSize: "8px", color: C.muted >ESTIMASI DITERIMA</span><b style= fontFamily: FONT, fontSize: "9px", color: C.green >{sQuote.outAmt} {sQuote.toToken?.symbol}</b></div>
                      <div style= ...g.between, marginTop: "6px" ><span style= fontFamily: FONT, fontSize: "8px", color: C.muted >MIN RECEIVE ({sSlippage}%)</span><b style= fontFamily: FONT, fontSize: "9px", color: C.yellow >{sQuote.minReceive} {sQuote.toToken?.symbol}</b></div>
                      <div style= ...g.between, marginTop: "6px" ><span style= fontFamily: FONT, fontSize: "8px", color: C.muted >PRICE IMPACT</span><b style= fontFamily: FONT, fontSize: "9px", color: sQuote.priceImpact > 5 ? C.red : C.text >{sQuote.priceImpact}%</b></div>
                      <div style= marginTop: "10px" >
                        <button style={g.btn("ghost")} onClick={getSwapQuote}>
                          <div style= ...g.row, gap: "4px" ><Icon name="refresh" size={8} color={C.text} />REFRESH QUOTE</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {sHash && sStep === 2 && (
                    <div style={g.successBox}>
                      <div style= ...g.row, marginBottom: "6px" >
                        <Icon name="check" size={12} color={C.green} />
                        <span style= fontFamily: FONT, fontSize: "8px", color: C.green >SWAP BERHASIL!</span>
                      </div>
                      <a href={explorerUrl(CHAINS_BY_KEY[sFrom]?.id, sHash)} target="_blank" rel="noreferrer" style= fontFamily: FONT, fontSize: "7px", color: C.blue >LIHAT DI EXPLORER</a>
                    </div>
                  )}

                  <div style= ...g.row, marginTop: "14px" >
                    {sStep < 1 && <button style={g.btn("primary", sLoading || !sAmt || !sFrom || !sTo)} onClick={getSwapQuote} disabled={sLoading || !sAmt || !sFrom || !sTo}>{sLoading ? "LOADING..." : "CEK QUOTE"}</button>}
                    {sStep === 1 && <button style={g.btn("primary", sLoading)} onClick={execSwap} disabled={sLoading}>{sLoading ? "PROSES..." : "EKSEKUSI SWAP"}</button>}
                    {sStep > 0 && <button style={g.btn("ghost")} onClick={() => { setSStep(0); setSQuote(null); setSHash(null); }}>RESET</button>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TRANSFER ── */}
          {page === "transfer" && (
            <div style= display: "flex", flexDirection: "column", gap: "16px", maxWidth: "520px" >
              <SectionHeader iconName="transfer" title="TRANSFER TOKEN" sub="KIRIM TOKEN ERC-20 KE ALAMAT LAIN. MASUKKAN CA TOKEN DULU UNTUK VERIFIKASI." />
              <div style={g.card}>
                <Steps step={tStep} labels={["INPUT CA", "PROSES", "SELESAI"]} />
                <div>
                  <label style={g.label}>CHAIN</label>
                  <select style={g.select} value={tChain} onChange={e => { setTChain(e.target.value); setTStep(0); setTTokenInfo(null); }}>
                    <option value="">-- PILIH CHAIN --</option>
                    {Object.entries(CHAINS_BY_KEY).filter(([, c]) => c.type === "evm").map(([k, c]) => (
                      <option key={k} value={k}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style= marginTop: "12px" >
                  <label style={g.label}>CONTRACT ADDRESS TOKEN</label>
                  <div style={g.row}>
                    <input style= ...g.input, flex: 1  placeholder="0x..." value={tCA} onChange={e => { setTCA(e.target.value); setTTokenInfo(null); setTStep(0); }} />
                    <button style={g.btn("cyan", tFetchingToken || !tCA || !tChain)} onClick={fetchTransferToken} disabled={tFetchingToken || !tCA || !tChain}>
                      {tFetchingToken ? "..." : "CEK"}
                    </button>
                  </div>
                </div>
                {tTokenInfo && (
                  <div style={{ background: C.surface, border: `2px solid ${C.green}`, padding: "10px", marginTop: "10px" }}>
                    <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, marginBottom: "6px" >TOKEN DITEMUKAN</div>
                    <div style= fontFamily: FONT, fontSize: "10px", color: C.green >{tTokenInfo.symbol}</div>
                    <div style= fontFamily: FONT, fontSize: "8px", color: C.muted, marginTop: "2px" >{tTokenInfo.name}</div>
                  </div>
                )}
                {tTokenInfo && (
                  <>
                    <div style= marginTop: "12px" >
                      <div style={g.between}>
                        <label style={g.label}>ALAMAT PENERIMA (0x... / ENS .eth)</label>
                        <div style= ...g.row, gap: "4px" >
                          <button style={g.btn("ghost")} onClick={pasteTransferAddr}>PASTE</button>
                          <button style={g.btn("ghost")} onClick={scanQR}><div style= ...g.row, gap: "4px" ><Icon name="qr" size={8} color={C.text} />QR</div></button>
                          <button style={g.btn("ghost")} onClick={saveToAddressBook}><div style= ...g.row, gap: "4px" ><Icon name="book" size={8} color={C.text} />SIMPAN</div></button>
                        </div>
                      </div>
                      <input style= ...g.input, borderColor: tTo && !isValidEvm(tTo.trim()) && !isValidEns(tTo.trim()) ? C.red : C.border2  placeholder="0x... atau nama.eth" value={tTo} onChange={e => setTTo(e.target.value)} />
                      {tTo && !isValidEvm(tTo.trim()) && !isValidEns(tTo.trim()) && <div style= fontFamily: FONT, fontSize: "7px", color: C.red, marginTop: "4px" >ALAMAT TIDAK VALID</div>}
                    </div>

                    {recentAddresses.length > 0 && (
                      <div style= marginTop: "10px" >
                        <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, marginBottom: "6px" >ALAMAT TERAKHIR</div>
                        <div style= display: "flex", flexWrap: "wrap", gap: "6px" >
                          {recentAddresses.map((a, i) => (
                            <button key={i} style={g.btn("ghost")} onClick={() => setTTo(a)}>{sh(a)}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {addressBook.length > 0 && (
                      <div style= marginTop: "10px" >
                        <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, marginBottom: "6px" >ADDRESS BOOK</div>
                        <div style= display: "flex", flexWrap: "wrap", gap: "6px" >
                          {addressBook.map((a, i) => (
                            <span key={i} style={g.chip(C.blueL)} onClick={() => setTTo(a.address)} title={a.address}>
                              <Icon name="book" size={8} color={C.blueL} />{a.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style= marginTop: "12px" >
                      <div style={g.between}>
                        <label style={g.label}>JUMLAH ({tTokenInfo.symbol})</label>
                        <button style={g.btn("ghost")} onClick={transferMax}>MAX</button>
                      </div>
                      <input style={g.input} placeholder="0.00" value={tAmt} onChange={e => setTAmt(e.target.value)} />
                    </div>
                  </>
                )}
                {tHash && tStep === 2 && (
                  <div style={g.successBox}>
                    <div style= ...g.row, marginBottom: "6px" >
                      <Icon name="check" size={12} color={C.green} />
                      <span style= fontFamily: FONT, fontSize: "8px", color: C.green >TRANSFER BERHASIL!</span>
                    </div>
                    <a href={explorerUrl(CHAINS_BY_KEY[tChain]?.id, tHash)} target="_blank" rel="noreferrer" style= fontFamily: FONT, fontSize: "7px", color: C.blue >LIHAT DI EXPLORER</a>
                  </div>
                )}
                {tTokenInfo && (
                  <div style= marginTop: "14px" >
                    <button style={g.btn("primary", tLoading || !tTo || !tAmt)} onClick={execTransfer} disabled={tLoading || !tTo || !tAmt}>
                      <div style= ...g.row, gap: "6px" ><Icon name="transfer" size={10} color={C.white} />{tLoading ? "PROSES..." : "KIRIM TOKEN"}</div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── HISTORY ── */}
          {page === "history" && (
            <div style= display: "flex", flexDirection: "column", gap: "16px" >
              <SectionHeader iconName="history" title="RIWAYAT" sub="SEMUA TRANSAKSI DI SESI INI (TERSIMPAN LOKAL)" />
              <div style={g.card}>
                <div style= ...g.row, flexWrap: "wrap", marginBottom: "12px" >
                  <input style= ...g.input, flex: 1, minWidth: "160px"  placeholder="CARI..." value={hSearch} onChange={e => setHSearch(e.target.value)} />
                  <select style= ...g.select, width: "140px"  value={hFilter} onChange={e => setHFilter(e.target.value)}>
                    <option value="all">SEMUA</option>
                    <option value="Swap">SWAP</option>
                    <option value="Transfer">TRANSFER</option>
                    <option value="Bridge">BRIDGE</option>
                  </select>
                  <button style={g.btn("ghost")} onClick={exportHistoryCSV}>CSV</button>
                  <button style={g.btn("ghost")} onClick={exportHistoryExcel}>XLS</button>
                  <button style={g.btn("danger")} onClick={clearHistory}>CLEAR</button>
                </div>
                {filteredHistory.length === 0 && (
                  <div style= textAlign: "center", fontFamily: FONT, fontSize: "8px", color: C.muted, padding: "32px", lineHeight: "2" >
                    BELUM ADA AKTIVITASNLBRDI SESI INI
                  </div>
                )}
                {filteredHistory.map((h, i) => (
                  <div key={i} style={{ ...g.between, padding: "10px 0", borderBottom: `2px solid ${C.border}` }}>
                    <div style={g.row}>
                      <span style={g.tag(h.type === "Bridge" ? C.blueL : h.type === "Swap" ? C.blue : C.cyan)}>{h.type}</span>
                      <span style= fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" >{h.detail}</span>
                    </div>
                    <div style= ...g.row, gap: "8px" >
                      <span style= fontFamily: FONT, fontSize: "7px", color: C.muted >{h.ts}</span>
                      {h.hash && h.hash !== "---" && (
                        <>
                          <span style= cursor: "pointer"  onClick={() => { navigator.clipboard?.writeText(h.hash); toast("HASH DISALIN", "success"); }}><Icon name="copy" size={8} color={C.muted} /></span>
                          <a href={explorerUrl(h.chainId, h.hash)} target="_blank" rel="noreferrer" style= fontFamily: FONT, fontSize: "7px", color: C.blue >VIEW</a>
                        </>
                      )}
                      {h.type === "Transfer" && <button style={g.btn("ghost")} onClick={() => setPage("transfer")}>RETRY</button>}
                      {h.type === "Swap" && <button style={g.btn("ghost")} onClick={() => setPage("swap")}>RETRY</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {page === "settings" && (
            <div style= display: "flex", flexDirection: "column", gap: "16px", maxWidth: "640px" >
              <SectionHeader iconName="settings" title="SETTINGS" sub="PREFERENSI APLIKASI (TERSIMPAN LOKAL, NON-CUSTODIAL)" />

              <div style={g.card}>
                <div style= fontFamily: FONT, fontSize: "9px", color: C.white, marginBottom: "12px" >TAMPILAN & BAHASA</div>
                <div style={g.grid2}>
                  <div>
                    <label style={g.label}>THEME</label>
                    <select style={g.select} value={settings.theme} onChange={e => setSetting("theme", e.target.value)}>
                      <option value="dark">DARK (PIXEL BLUE)</option>
                      <option value="light">LIGHT</option>
                    </select>
                  </div>
                  <div>
                    <label style={g.label}>LANGUAGE</label>
                    <select style={g.select} value={settings.language} onChange={e => setSetting("language", e.target.value)}>
                      <option value="id">BAHASA INDONESIA</option>
                      <option value="en">ENGLISH</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={g.card}>
                <div style= fontFamily: FONT, fontSize: "9px", color: C.white, marginBottom: "12px" >SCANNER & ENGINE</div>
                <div style={g.grid2}>
                  <div>
                    <label style={g.label}>REFRESH INTERVAL (DETIK)</label>
                    <input style={g.input} type="number" min={10} value={settings.refreshInterval} onChange={e => setSetting("refreshInterval", parseInt(e.target.value) || 30)} />
                  </div>
                  <div>
                    <label style={g.label}>PROFIT THRESHOLD ALERT (%)</label>
                    <input style={g.input} type="number" value={settings.profitThreshold} onChange={e => setSetting("profitThreshold", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label style={g.label}>MINIMUM NET PROFIT FILTER (%)</label>
                    <input style={g.input} type="number" value={settings.minNetFilter} onChange={e => setSetting("minNetFilter", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label style={g.label}>TRADE SIZE SIMULASI ($)</label>
                    <input style={g.input} type="number" value={settings.tradeSize} onChange={e => setSetting("tradeSize", parseFloat(e.target.value) || 1000)} />
                  </div>
                  <div>
                    <label style={g.label}>GAS PREFERENCE</label>
                    <select style={g.select} value={settings.gasPreference} onChange={e => setSetting("gasPreference", e.target.value)}>
                      <option value="slow">SLOW (MURAH)</option>
                      <option value="standard">STANDARD</option>
                      <option value="fast">FAST (MAHAL)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={g.card}>
                <div style= fontFamily: FONT, fontSize: "9px", color: C.white, marginBottom: "12px" >NOTIFIKASI</div>
                <div style= ...g.row, flexWrap: "wrap", gap: "10px", marginBottom: "12px" >
                  <button style={g.btn(settings.notifications ? "primary" : "ghost")} onClick={() => { setSetting("notifications", !settings.notifications); if (!settings.notifications && "Notification" in window) Notification.requestPermission(); }}>
                    <div style= ...g.row, gap: "6px" ><Icon name="bell" size={10} color={settings.notifications ? C.white : C.muted} />DESKTOP {settings.notifications ? "ON" : "OFF"}</div>
                  </button>
                  <button style={g.btn(settings.sound ? "primary" : "ghost")} onClick={() => setSetting("sound", !settings.sound)}>SOUND {settings.sound ? "ON" : "OFF"}</button>
                  <button style={g.btn("ghost")} onClick={() => { desktopNotify("ARBX Test", "Notifikasi berfungsi!"); if (settings.sound) playBeep(true); }}>TEST</button>
                </div>
                <label style={g.label}>TELEGRAM BOT TOKEN</label>
                <input style={g.input} placeholder="123456:ABC..." value={settings.telegramToken} onChange={e => setSetting("telegramToken", e.target.value)} />
                <label style= ...g.label, marginTop: "10px" >TELEGRAM CHAT ID</label>
                <input style={g.input} placeholder="cth: 123456789" value={settings.telegramChatId} onChange={e => setSetting("telegramChatId", e.target.value)} />
                <label style= ...g.label, marginTop: "10px" >DISCORD WEBHOOK URL</label>
                <input style={g.input} placeholder="https://discord.com/api/webhooks/..." value={settings.discordWebhook} onChange={e => setSetting("discordWebhook", e.target.value)} />
                <div style= ...g.row, marginTop: "12px" >
                  <button style={g.btn("cyan")} onClick={() => { sendTelegram(settings.telegramToken, settings.telegramChatId, "ARBX test alert ✅"); sendDiscord(settings.discordWebhook, "ARBX test alert ✅"); toast("TEST ALERT TERKIRIM", "success"); }}>TEST TELEGRAM/DISCORD</button>
                </div>
              </div>

              <div style={g.card}>
                <div style= fontFamily: FONT, fontSize: "9px", color: C.white, marginBottom: "12px" >API SETTINGS</div>
                <div style= fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" >
                  Harga: DexScreener (gratis, tanpa API key) · Swap: deBridge DLN (tanpa API key) · Cache {CACHE_TTL / 1000}s · Rate limit {MIN_REQ_GAP}ms · Retry + exponential backoff aktif.
                </div>
              </div>
            </div>
          )}

          {/* ── PANDUAN ── */}
          {page === "guide" && (
            <div style= maxWidth: "680px", display: "flex", flexDirection: "column", gap: "12px" >
              <SectionHeader iconName="guide" title="PANDUAN" sub="CARA PAKAI ARBX TOOL" />
              {[
                { name: "CARA PAKAI SCANNER", color: C.blue, steps: ["Masukkan contract address (CA) token di tiap chain yang ingin di-scan", "Isi nama token di pojok kanan atas (opsional)", "Pakai PASTE/IMPORT untuk input cepat, atau FAVORITE untuk simpan token", "Klik SCAN SEMUA CHAIN — bisa di-CANCEL atau RETRY FAILED", "Lihat harga + peluang arbitrasi dengan NET profit, confidence & risk score"] },
                { name: "ARBITRAGE ENGINE", color: C.cyan, steps: ["NET profit sudah dikurangi gas, bridge fee, swap fee, slippage & price impact", "Liquidity & Volume Score membantu menilai kualitas peluang", "Confidence Score makin tinggi makin layak; Risk Score makin rendah makin aman", "Atur Trade Size & Minimum Net Filter di SETTINGS", "Rekomendasi rute terbaik muncul otomatis di atas daftar"] },
                { name: "CARA PAKAI BRIDGE", color: C.blueL, steps: ["Scan token dulu di menu SCANNER", "Pilih chain asal & tujuan, lihat label TERMURAH/TERCEPAT/TERAMAN", "Klik BUKA atau COPY URL, atau BUKA SEMUA bridge sekaligus", "Lakukan transaksi di website bridge resmi dengan konfirmasi wallet"] },
                { name: "CARA PAKAI SWAP", color: C.blue, steps: ["Pilih chain asal & tujuan (bisa REVERSE)", "Masukkan jumlah (25%/HALF/MAX) & atur slippage", "CEK QUOTE — lihat min receive, price impact & route preview", "Konfirmasi di layar konfirmasi, lalu tandatangani di wallet"] },
                { name: "CARA PAKAI TRANSFER", color: C.cyan, steps: ["Pilih chain & masukkan CA token, klik CEK", "Isi alamat penerima (support ENS .eth), PASTE/QR/Address Book", "Isi jumlah (MAX), klik KIRIM TOKEN", "Periksa layar konfirmasi sebelum tandatangan di wallet"] },
                { name: "KEAMANAN WALLET (NON-CUSTODIAL)", color: C.green, steps: ["Website ini TIDAK pernah meminta seed phrase atau private key", "Semua transaksi minta konfirmasi di layar lalu di wallet kamu", "Tidak ada deposit, saldo internal, atau penyimpanan dana", "DISCONNECT hanya membersihkan state lokal aplikasi", "Selalu test dengan jumlah kecil terlebih dahulu"] },
                { name: "DATA & PERFORMA", color: C.blueL, steps: ["Harga real-time dari DexScreener (cache + rate limit + retry)", "Bridge via Across, deBridge, Wormhole, Mayan, Stargate, Symbiosis", "Swap via deBridge DLN", "Validasi alamat EVM/Solana, deteksi duplikat & offline", "Render dioptimasi dengan memoization"] },
              ].map(item => (
                <div key={item.name} style={{ ...g.card, borderLeft: `4px solid ${item.color}` }}>
                  <div style= fontFamily: FONT, fontSize: "9px", color: item.color, marginBottom: "12px" >{item.name}</div>
                  <div style= display: "flex", flexDirection: "column", gap: "6px" >
                    {item.steps.map((s, i) => (
                      <div key={i} style= display: "flex", gap: "10px", fontFamily: FONT, fontSize: "7px", lineHeight: "1.8" >
                        <span style= color: item.color, flexShrink: 0 >{i + 1}.</span>
                        <span style= color: C.muted >{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// Wrap with Error Boundary; preserve default export named App
export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
                  }
