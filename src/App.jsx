import { useState, useEffect, useCallback, useRef } from "react";

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

const BRIDGES = [
  { name:"deBridge",  supports:["evm","svm"], desc:"EVM + Solana, any token",           url:(f,t,tok)=>`https://app.debridge.finance/?inputChain=${f}&outputChain=${t}&inputCurrency=${tok}` },
  { name:"Wormhole",  supports:["evm","svm"], desc:"Cross semua chain + Solana",         url:()=>`https://portalbridge.com/#/transfer` },
  { name:"Mayan",     supports:["evm","svm"], desc:"Solana ke EVM terbaik",              url:(f,t,tok)=>`https://swap.mayan.finance/?fromChain=${f}&toChain=${t}&from=${tok}` },
  { name:"Across",    supports:["evm"],       desc:"EVM tercepat, fee rendah",           url:(f,t,tok,amt)=>`https://across.to/?from=${f}&to=${t}&asset=${tok}&amount=${amt}` },
  { name:"Stargate",  supports:["evm"],       desc:"Stablecoin bridge terbaik",          url:(f,t,tok)=>`https://stargate.finance/transfer?srcChain=${f}&dstChain=${t}&srcToken=${tok}` },
  { name:"Symbiosis", supports:["evm","svm"], desc:"Multi-chain incl Nesa & HyperEVM",  url:(f,t,tok)=>`https://app.symbiosis.finance/swap?chainIn=${f}&chainOut=${t}&tokenIn=${tok}` },
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
// DESIGN - BLUE BLACK PIXEL THEME
// ═══════════════════════════════════════════════════════════════════════════════
const C = {
  bg:      "#00030F",
  surface: "#000820",
  card:    "#000D2E",
  card2:   "#001040",
  border:  "#0A1A4A",
  border2: "#0F2060",
  text:    "#C8D8FF",
  muted:   "#2A4080",
  blue:    "#4F8EF7",
  blueL:   "#7AB3FF",
  blueD:   "#1A3A8A",
  cyan:    "#00D4FF",
  white:   "#FFFFFF",
  red:     "#FF4455",
  yellow:  "#FFD700",
  green:   "#00FF88",
};

const FONT = "'Press Start 2P', monospace";

const g = {
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
    borderLeft: a ? `3px solid ${C.cyan}` : "3px solid transparent",
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
    border: "none",
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
    textShadow: v === "primary" || v === "cyan" ? "none" : "none",
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
};

// ═══════════════════════════════════════════════════════════════════════════════
// PIXEL ART SVG ICONS (8-bit style)
// ═══════════════════════════════════════════════════════════════════════════════
const PX = ({ d, size = 16, color = C.cyan }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated", flexShrink: 0 }} fill={color}>
    <path d={d} />
  </svg>
);

// Pixel art icons as SVG paths (8x8 pixel grid scaled to 16x16)
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

async function fetchDexPrice(chainKey, ca) {
  if (!ca || ca.length < 6) return null;
  try {
    const chain = typeof chainKey === "string" ? CHAINS_BY_KEY[chainKey] || CHAINS[chainKey] : CHAINS[chainKey];
    const dexKey = chain?.dexscreener || chain?.dex || chainKey;
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
    const data = await res.json();
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
  } catch { return null; }
}

async function fetchTokenInfo(ca, chainId) {
  if (!ca || ca.length < 6) return null;
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
    const data = await res.json();
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
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
function Toast({ items }) {
  return (
    <div style={{ position: "fixed", bottom: "16px", right: "16px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "6px" }}>
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
    <div style={{ display: "flex", alignItems: "center", marginBottom: "18px" }}>
      {labels.map((l, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < labels.length - 1 ? 1 : 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
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
            <span style={{ fontSize: "7px", fontFamily: FONT, color: step >= i ? C.blue : C.muted, whiteSpace: "nowrap" }}>{l}</span>
          </div>
          {i < labels.length - 1 && <div style={{ flex: 1, height: "2px", background: step > i ? C.blue : C.border2, margin: "0 6px", marginBottom: "14px" }} />}
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ iconName, title, sub }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ ...g.row, marginBottom: "6px" }}>
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

function BridgeModal({ opp, onClose, scannedTokens }) {
  if (!opp) return null;
  const fromChain = CHAINS_BY_KEY[opp.buyChain] || CHAINS[opp.buyChain];
  const toChain = CHAINS_BY_KEY[opp.sellChain] || CHAINS[opp.sellChain];
  const fromType = fromChain?.type;
  const toType = toChain?.type;
  const compatible = BRIDGES.filter(b => b.supports.includes(fromType) && b.supports.includes(toType));
  const tokenCA = scannedTokens[opp.buyChain]?.ca || "";
  const tokenSymbol = scannedTokens[opp.buyChain]?.symbol || "TOKEN";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: C.card, border: `2px solid ${C.border2}`, padding: "20px", maxWidth: "460px", width: "92%", maxHeight: "85vh", overflowY: "auto", boxShadow: `0 0 40px ${C.blue}40` }} onClick={e => e.stopPropagation()}>
        <div style={{ ...g.between, marginBottom: "14px" }}>
          <div style={{ ...g.row }}>
            <Icon name="bridge" size={14} color={C.cyan} />
            <span style={{ fontFamily: FONT, fontSize: "10px", color: C.white }}>BRIDGE TOKEN</span>
          </div>
          <button style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontFamily: FONT, fontSize: "12px" }} onClick={onClose}>X</button>
        </div>
        <div style={{ background: C.surface, border: `2px solid ${C.border}`, padding: "10px", marginBottom: "14px" }}>
          <div style={{ fontSize: "7px", fontFamily: FONT, color: C.muted, marginBottom: "8px" }}>RUTE ARBI</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={g.chip(fromChain?.color || C.blue)}>{fromChain?.name || opp.buyChain}</span>
            <span style={{ color: C.muted, fontFamily: FONT, fontSize: "8px" }}>{">>"}</span>
            <span style={g.chip(toChain?.color || C.blueL)}>{toChain?.name || opp.sellChain}</span>
            <span style={{ marginLeft: "auto", ...g.tag(C.green) }}>+{opp.spread}%</span>
          </div>
          <div style={{ marginTop: "8px", fontSize: "8px", fontFamily: FONT, color: C.muted, lineHeight: "1.8" }}>
            TOKEN: <b style={{ color: C.white }}>{tokenSymbol}</b><br />
            BELI: <span style={{ color: C.green }}>${fmt(opp.buyPrice)}</span> | JUAL: <span style={{ color: C.yellow }}>${fmt(opp.sellPrice)}</span>
          </div>
        </div>
        {compatible.length === 0 ? (
          <div style={g.warnBox}>
            <div style={{ ...g.row, marginBottom: "6px" }}>
              <Icon name="warning" size={12} color={C.yellow} />
              <span style={{ fontFamily: FONT, fontSize: "8px", color: C.yellow }}>TIDAK ADA BRIDGE</span>
            </div>
            <div style={{ fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" }}>
              Tidak ada bridge yang tersedia untuk rute ini. Coba lakukan manual via DEX di masing-masing chain.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {compatible.map(b => {
              const fromKey = fromChain?.id || opp.buyChain;
              const toKey = toChain?.id || opp.sellChain;
              const url = b.url(fromKey, toKey, tokenCA, "");
              return (
                <div key={b.name} style={{ background: C.surface, border: `2px solid ${C.border2}`, padding: "10px 12px", cursor: "pointer" }} onClick={() => window.open(url, "_blank")}>
                  <div style={g.between}>
                    <div>
                      <div style={{ fontFamily: FONT, fontSize: "9px", color: C.white, marginBottom: "4px" }}>{b.name}</div>
                      <div style={{ fontFamily: FONT, fontSize: "7px", color: C.muted }}>{b.desc}</div>
                    </div>
                    <div style={{ ...g.row }}>
                      <Icon name="extern" size={10} color={C.blue} />
                      <span style={{ ...g.tag(C.blue) }}>BUKA</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("scanner");
  const [wallet, setWallet] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState([]);
  const [bridgeModal, setBridgeModal] = useState(null);

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
  const autoRef = useRef(null);

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

  // ── Toast ──
  const toast = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);

  const addHistory = (entry) => setHistory(p => [{ ...entry, ts: new Date().toLocaleTimeString("id-ID", { hour12: false }) }, ...p.slice(0, 49)]);

  // ── MetaMask ──
  const connect = async () => {
    if (!window.ethereum) { toast("INSTALL METAMASK DULU", "error"); return; }
    try {
      const [acct] = await window.ethereum.request({ method: "eth_requestAccounts" });
      const cid = await window.ethereum.request({ method: "eth_chainId" });
      setWallet(acct); setChainId(parseInt(cid, 16));
      toast(`CONNECTED: ${sh(acct)}`, "success");
    } catch { toast("KONEKSI DITOLAK", "error"); }
  };

  useEffect(() => {
    if (!window.ethereum) return;
    const onA = a => { if (a[0]) setWallet(a[0]); else setWallet(null); };
    const onC = c => setChainId(parseInt(c, 16));
    window.ethereum.on("accountsChanged", onA);
    window.ethereum.on("chainChanged", onC);
    return () => { window.ethereum.removeListener("accountsChanged", onA); window.ethereum.removeListener("chainChanged", onC); };
  }, []);

  const switchChain = async (targetId) => {
    const t = CHAINS[targetId] || Object.values(CHAINS_BY_KEY).find(c => c.id === Number(targetId));
    if (!t || t.type !== "evm") { toast(`SWITCH MANUAL UNTUK ${t?.name || targetId}`, "warn"); return; }
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${Number(targetId).toString(16)}` }] });
      setChainId(Number(targetId));
      toast(`PINDAH KE ${t.name}`, "success");
    } catch (e) { toast(`GAGAL SWITCH: ${e.message}`, "error"); }
  };

  // ── Scanner ──
  const runScan = useCallback(async () => {
    const active = Object.entries(caInputs).filter(([, v]) => v && v.trim());
    if (!active.length) { toast("ISI MINIMAL 1 CA DULU", "warn"); return; }
    setScanning(true); setScanResults({}); setOpps([]); setScannedTokens({});
    const loading = {}; active.forEach(([k]) => loading[k] = true); setScanLoading(loading);
    const fetched = {};
    await Promise.all(active.map(async ([chain, ca]) => {
      const d = await fetchDexPrice(chain, ca.trim());
      fetched[chain] = d ? { ...d, ca: ca.trim() } : { error: true, ca: ca.trim() };
      setScanLoading(p => ({ ...p, [chain]: false }));
      setScanResults(p => ({ ...p, [chain]: fetched[chain] }));
    }));

    // Build scannedTokens map
    const tokMap = {};
    Object.entries(fetched).forEach(([chain, d]) => {
      if (d?.price) tokMap[chain] = { ca: d.ca, symbol: d.symbol || tokenName || "TOKEN", name: d.name || tokenName || "Token", price: d.price };
    });
    setScannedTokens(tokMap);

    // Set default bridge/swap chains from scanned
    const scannedChains = Object.keys(tokMap);
    if (scannedChains.length >= 1) { setBFrom(scannedChains[0]); setSFrom(scannedChains[0]); setTChain(scannedChains[0]); }
    if (scannedChains.length >= 2) { setBTo(scannedChains[1]); setSTo(scannedChains[1]); }

    const prices = Object.entries(fetched).filter(([, v]) => v?.price);
    const opps = [];
    for (let i = 0; i < prices.length; i++) for (let j = i + 1; j < prices.length; j++) {
      const [cA, dA] = prices[i], [cB, dB] = prices[j];
      const spread = Math.abs(dA.price - dB.price) / Math.min(dA.price, dB.price) * 100;
      const [buyC, sellC, buyD, sellD] = dA.price < dB.price ? [cA, cB, dA, dB] : [cB, cA, dB, dA];
      opps.push({ buyChain: buyC, sellChain: sellC, buyPrice: buyD.price, sellPrice: sellD.price, buyDex: buyD.dex, sellDex: sellD.dex, spread: +spread.toFixed(4), buyLiq: buyD.liquidity, sellLiq: sellD.liquidity, buyCA: caInputs[buyC], sellCA: caInputs[sellC] });
    }
    setOpps(opps.sort((a, b) => b.spread - a.spread));
    setScanning(false);
    setLastScan(new Date().toLocaleTimeString("id-ID", { hour12: false }));
    toast(`SCAN SELESAI: ${prices.length} CHAIN, ${opps.length} PELUANG`, "success");
  }, [caInputs, tokenName, toast]);

  useEffect(() => {
    if (autoRefresh) { autoRef.current = setInterval(runScan, 30000); toast("AUTO-REFRESH 30S AKTIF"); }
    else clearInterval(autoRef.current);
    return () => clearInterval(autoRef.current);
  }, [autoRefresh, runScan]);

  // ── Swap (deBridge) ──
  const getSwapQuote = async () => {
    if (!sAmt || !wallet) { toast(wallet ? "ISI JUMLAH" : "CONNECT WALLET DULU", "warn"); return; }
    if (!sFrom || !sTo) { toast("PILIH CHAIN DULU", "warn"); return; }
    const fromToken = scannedTokens[sFrom];
    const toToken = scannedTokens[sTo];
    if (!fromToken || !toToken) { toast("TOKEN TIDAK DITEMUKAN DI CHAIN INI", "warn"); return; }
    setSLoading(true); setSQuote(null);
    try {
      const dec = 18;
      const inAmt = toWei(sAmt, dec);
      const url = `https://api.dln.trade/v1.0/dln/order/quote?srcChainId=${CHAINS_BY_KEY[sFrom]?.id}&srcChainTokenIn=${fromToken.ca}&srcChainTokenInAmount=${inAmt}&dstChainId=${CHAINS_BY_KEY[sTo]?.id}&dstChainTokenOut=${toToken.ca}&prependOperatingExpenses=true&affiliateFeePercent=0`;
      const res = await fetch(url);
      if (!res.ok) { const e = await res.json(); throw new Error(e.errorMessage || res.status); }
      const data = await res.json();
      setSQuote({ fromToken, toToken, inAmt, dec, outAmt: fromWei(data.estimation?.dstChainTokenOut?.amount || 0, dec).toFixed(6) });
      setSStep(1); toast("QUOTE DIDAPAT", "success");
    } catch (e) { toast(`QUOTE GAGAL: ${e.message}`, "error"); }
    setSLoading(false);
  };

  const execSwap = async () => {
    if (!sQuote || !wallet) return;
    setSLoading(true);
    try {
      const fromChainId = CHAINS_BY_KEY[sFrom]?.id;
      const toChainId = CHAINS_BY_KEY[sTo]?.id;
      if (chainId !== fromChainId) { await switchChain(fromChainId); await new Promise(r => setTimeout(r, 1200)); }
      const url = `https://api.dln.trade/v1.0/dln/order/create-tx?srcChainId=${fromChainId}&srcChainTokenIn=${sQuote.fromToken.ca}&srcChainTokenInAmount=${sQuote.inAmt}&dstChainId=${toChainId}&dstChainTokenOut=${sQuote.toToken.ca}&dstChainTokenOutRecipient=${wallet}&senderAddress=${wallet}&srcChainOrderAuthorityAddress=${wallet}&dstChainOrderAuthorityAddress=${wallet}&prependOperatingExpenses=true&affiliateFeePercent=0`;
      const res = await fetch(url);
      if (!res.ok) { const e = await res.json(); throw new Error(e.errorMessage || res.status); }
      const tx = await res.json();
      if (!tx.tx) throw new Error("Tidak ada tx data");
      toast("MENGIRIM SWAP...", "warn");
      const hash = await sendTx({ from: wallet, to: tx.tx.to, data: tx.tx.data, value: tx.tx.value || "0x0", gas: "0x493E0" });
      setSHash(hash); setSStep(2);
      addHistory({ type: "Swap", detail: `${sAmt} ${sQuote.fromToken.symbol} >> ${sQuote.toToken.symbol}: ${chainName(sFrom)} >> ${chainName(sTo)}`, hash, chainId: fromChainId });
      toast("SWAP BERHASIL!", "success");
    } catch (e) { toast(`GAGAL: ${e.message}`, "error"); }
    setSLoading(false);
  };

  // ── Transfer ──
  const fetchTransferToken = async () => {
    if (!tCA || tCA.length < 6) { toast("MASUKKAN CA TOKEN DULU", "warn"); return; }
    if (!tChain) { toast("PILIH CHAIN DULU", "warn"); return; }
    setTFetchingToken(true); setTTokenInfo(null);
    const chainData = CHAINS_BY_KEY[tChain];
    const info = await fetchTokenInfo(tCA, chainData?.id);
    if (info) { setTTokenInfo(info); toast(`TOKEN DITEMUKAN: ${info.symbol}`, "success"); }
    else toast("TOKEN TIDAK DITEMUKAN", "error");
    setTFetchingToken(false);
  };

  const execTransfer = async () => {
    if (!wallet) { toast("CONNECT WALLET DULU", "error"); return; }
    if (!tTo || !tAmt) { toast("ISI ALAMAT & JUMLAH", "warn"); return; }
    if (!tTokenInfo) { toast("FETCH TOKEN INFO DULU", "warn"); return; }
    setTLoading(true); setTStep(1);
    try {
      const chainData = CHAINS_BY_KEY[tChain];
      if (chainId !== chainData?.id) { await switchChain(chainData?.id); await new Promise(r => setTimeout(r, 1200)); }
      const dec = tTokenInfo.decimals || 18;
      const amt = BigInt(Math.round(parseFloat(tAmt) * 10 ** dec)).toString(16).padStart(64, "0");
      const data = "0xa9059cbb" + tTo.replace("0x", "").padStart(64, "0") + amt;
      const hash = await sendTx({ from: wallet, to: tCA, data, gas: "0xEA60" });
      setTHash(hash); setTStep(2);
      addHistory({ type: "Transfer", detail: `${tAmt} ${tTokenInfo.symbol} >> ${sh(tTo)}`, hash, chainId: chainData?.id });
      toast("TRANSFER BERHASIL!", "success");
    } catch (e) { setTStep(0); toast(`GAGAL: ${e.message}`, "error"); }
    setTLoading(false);
  };

  const sendTx = (tx) => window.ethereum.request({ method: "eth_sendTransaction", params: [tx] });
  const explorerUrl = (cid, hash) => `${CHAINS[cid]?.explorer || "https://etherscan.io"}/tx/${hash}`;
  const curChain = CHAINS[chainId] || Object.values(CHAINS_BY_KEY).find(c => c.id === chainId);

  const scannedChainKeys = Object.keys(scannedTokens);
  const hasScanned = scannedChainKeys.length > 0;

  const NAV = [
    { key: "scanner",  iconName: "scan",     label: "SCANNER"  },
    { key: "dex",      iconName: "dex",      label: "DEX"      },
    { key: "bridge",   iconName: "bridge",   label: "BRIDGE"   },
    { key: "swap",     iconName: "swap",     label: "SWAP"      },
    { key: "transfer", iconName: "transfer", label: "TRANSFER" },
    { key: "history",  iconName: "history",  label: "RIWAYAT"  },
    { key: "guide",    iconName: "guide",    label: "PANDUAN"  },
  ];

  // ── RENDER ──
  return (
    <div style={g.root}>
      <Toast items={toasts} />
      {bridgeModal && <BridgeModal opp={bridgeModal} onClose={() => setBridgeModal(null)} scannedTokens={scannedTokens} />}

      {/* Topbar */}
      <div style={g.topbar}>
        <div style={g.brand}>
          <Icon name="arb" size={20} color={C.cyan} />
          ARB<span style={{ color: C.cyan }}>X</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
          {wallet && curChain && <span style={g.tag(curChain.color || C.blue)}>{curChain.name}</span>}
          {wallet && <span style={{ fontFamily: FONT, fontSize: "8px", color: C.muted }}>{sh(wallet)}</span>}
          <button style={g.btn(wallet ? "ghost" : "primary")} onClick={connect}>
            <div style={{ ...g.row, gap: "6px" }}>
              <Icon name={wallet ? "check" : "connect"} size={10} color={wallet ? C.green : C.white} />
              {wallet ? "CONNECTED" : "CONNECT"}
            </div>
          </button>
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
            {lastScan && <div style={{ fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" }}>LAST SCAN<br />{lastScan}</div>}
          </div>
        </div>

        {/* Main */}
        <div style={g.main}>

          {/* ── CA SCANNER ── */}
          {page === "scanner" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <SectionHeader iconName="scan" title="CA SCANNER" sub="MASUKKAN CONTRACT ADDRESS TOKEN DI TIAP CHAIN, LALU SCAN UNTUK TEMUKAN PELUANG ARBITRASI" />

              <div style={g.card}>
                <div style={{ ...g.between, marginBottom: "14px" }}>
                  <div style={{ fontFamily: FONT, fontSize: "10px", color: C.white }}>CONTRACT ADDRESSES</div>
                  <div style={{ ...g.row }}>
                    <label style={{ ...g.label, margin: 0 }}>NAMA TOKEN:</label>
                    <input value={tokenName} onChange={e => setTokenName(e.target.value)} placeholder="cth: PEPE" style={{ ...g.input, width: "120px", textAlign: "center" }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "10px" }}>
                  {Object.entries(CHAINS_BY_KEY).map(([key, chain]) => (
                    <div key={key} style={{ background: C.surface, border: `2px solid ${C.border}`, padding: "10px" }}>
                      <div style={{ ...g.between, marginBottom: "8px" }}>
                        <div style={g.row}>
                          <div style={g.dot(chain.color)} />
                          <span style={{ fontFamily: FONT, fontSize: "8px", color: C.white }}>{chain.name}</span>
                          <span style={{ fontFamily: FONT, fontSize: "7px", color: C.muted }}>{chain.symbol}</span>
                        </div>
                        <div style={g.row}>
                          {scanLoading[key] && <span style={{ fontFamily: FONT, fontSize: "8px", color: C.yellow }}>...</span>}
                          {scanResults[key] && !scanResults[key].error && <span style={g.tag(C.green)}>OK</span>}
                          {scanResults[key]?.error && <span style={g.tag(C.red)}>ERR</span>}
                        </div>
                      </div>
                      <input
                        value={caInputs[key] || ""}
                        onChange={e => setCaInputs(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={chain.type === "svm" ? "SOLANA ADDRESS..." : "0x..."}
                        style={{ ...g.input, fontSize: "8px", padding: "8px 10px" }}
                      />
                      {scanResults[key] && !scanResults[key].error && (
                        <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontFamily: FONT, fontSize: "10px", color: C.green }}>${fmt(scanResults[key].price)}</span>
                          {scanResults[key].symbol && <span style={g.tag(chain.color)}>{scanResults[key].symbol}</span>}
                          {scanResults[key].dex && <span style={{ fontFamily: FONT, fontSize: "7px", color: C.muted }}>{scanResults[key].dex}</span>}
                          {scanResults[key].liquidity && <span style={{ fontFamily: FONT, fontSize: "7px", color: C.muted }}>LIQ: ${(scanResults[key].liquidity / 1000).toFixed(1)}K</span>}
                          {scanResults[key].priceChange24h != null && (
                            <span style={{ fontFamily: FONT, fontSize: "7px", color: scanResults[key].priceChange24h >= 0 ? C.green : C.red }}>
                              {scanResults[key].priceChange24h >= 0 ? "+" : ""}{Math.abs(scanResults[key].priceChange24h).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ ...g.row, marginTop: "14px" }}>
                  <button style={g.btn("primary", scanning)} onClick={runScan} disabled={scanning}>
                    <div style={{ ...g.row, gap: "6px" }}>
                      <Icon name="scan" size={10} color={C.white} />
                      {scanning ? "SCANNING..." : "SCAN SEMUA CHAIN"}
                    </div>
                  </button>
                  <button style={g.btn("ghost")} onClick={() => setAutoRefresh(p => !p)}>
                    {autoRefresh ? "STOP AUTO" : "AUTO 30S"}
                  </button>
                  {autoRefresh && <span style={g.tag(C.green)}>LIVE</span>}
                </div>
              </div>

              {opportunities.length > 0 && (
                <div style={g.card}>
                  <div style={{ fontFamily: FONT, fontSize: "10px", color: C.white, marginBottom: "12px" }}>
                    PELUANG ARBITRASI ({opportunities.length})
                  </div>
                  {opportunities.map((opp, i) => {
                    const bc = CHAINS_BY_KEY[opp.buyChain] || CHAINS[opp.buyChain];
                    const sc = CHAINS_BY_KEY[opp.sellChain] || CHAINS[opp.sellChain];
                    const profit = ((opp.sellPrice / opp.buyPrice - 1) * 100).toFixed(3);
                    return (
                      <div key={i} style={{ ...g.card2, marginBottom: "10px", borderLeft: `4px solid ${opp.spread > 5 ? C.green : opp.spread > 2 ? C.yellow : C.muted}` }}>
                        <div style={g.between}>
                          <div style={g.row}>
                            <span style={g.chip(bc?.color || C.blue)}>BUY {bc?.name || opp.buyChain}</span>
                            <span style={{ color: C.muted, fontFamily: FONT, fontSize: "8px" }}>{">>"}</span>
                            <span style={g.chip(sc?.color || C.blueL)}>SELL {sc?.name || opp.sellChain}</span>
                          </div>
                          <span style={{ ...g.tag(opp.spread > 5 ? C.green : opp.spread > 2 ? C.yellow : C.muted), fontSize: "9px" }}>+{opp.spread}%</span>
                        </div>
                        <div style={{ ...g.row, marginTop: "8px", fontFamily: FONT, fontSize: "8px", color: C.muted, flexWrap: "wrap", gap: "6px", lineHeight: "1.8" }}>
                          <span>BELI: <b style={{ color: C.green }}>${fmt(opp.buyPrice)}</b></span>
                          <span>|</span>
                          <span>JUAL: <b style={{ color: C.yellow }}>${fmt(opp.sellPrice)}</b></span>
                          <span>|</span>
                          <span>PROFIT: <b style={{ color: C.green }}>+{profit}%</b></span>
                          {opp.buyLiq && <span>| LIQ: ${(opp.buyLiq / 1000).toFixed(0)}K</span>}
                        </div>
                        <div style={{ ...g.row, marginTop: "10px", flexWrap: "wrap" }}>
                          {DEXES[opp.buyChain]?.slice(0, 1).map(d => (
                            <button key={d.name} style={g.btn("ghost")} onClick={() => window.open(d.url(opp.buyCA || ""), "_blank")}>
                              <div style={{ ...g.row, gap: "4px" }}>
                                <Icon name="dex" size={8} color={C.text} />
                                BELI {d.name}
                              </div>
                            </button>
                          ))}
                          {DEXES[opp.sellChain]?.slice(0, 1).map(d => (
                            <button key={d.name} style={g.btn("ghost")} onClick={() => window.open(d.url(opp.sellCA || ""), "_blank")}>
                              <div style={{ ...g.row, gap: "4px" }}>
                                <Icon name="dex" size={8} color={C.text} />
                                JUAL {d.name}
                              </div>
                            </button>
                          ))}
                          <button style={g.btn("cyan")} onClick={() => setBridgeModal(opp)}>
                            <div style={{ ...g.row, gap: "4px" }}>
                              <Icon name="bridge" size={8} color={C.bg} />
                              BRIDGE
                            </div>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── DEX ── */}
          {page === "dex" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <SectionHeader iconName="dex" title="DEX LINKS" sub="BUKA DEX DENGAN CA TOKEN YANG SUDAH DI-SCAN" />
              {!hasScanned ? (
                <div style={g.warnBox}>
                  <div style={{ ...g.row, marginBottom: "8px" }}>
                    <Icon name="warning" size={12} color={C.yellow} />
                    <span style={{ fontFamily: FONT, fontSize: "8px", color: C.yellow }}>SCAN DULU</span>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" }}>
                    Masukkan CA token di menu SCANNER dan klik SCAN SEMUA CHAIN terlebih dahulu.
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: "12px" }}>
                  {Object.entries(DEXES).map(([chainKey, dexList]) => {
                    const c = CHAINS_BY_KEY[chainKey];
                    const ca = caInputs[chainKey];
                    const result = scanResults[chainKey];
                    if (!ca) return null;
                    return (
                      <div key={chainKey} style={{ ...g.card, borderTop: `4px solid ${c?.color || C.blue}` }}>
                        <div style={g.row}>
                          <div style={g.dot(c?.color || C.blue)} />
                          <span style={{ fontFamily: FONT, fontSize: "9px", color: C.white }}>{c?.name || chainKey}</span>
                        </div>
                        {result?.symbol && <div style={{ fontFamily: FONT, fontSize: "8px", color: C.cyan, marginTop: "6px" }}>{result.symbol}</div>}
                        {result?.price && (
                          <div style={{ fontFamily: FONT, fontSize: "10px", color: C.green, marginTop: "4px" }}>${fmt(result.price)}</div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                          {dexList.map(d => (
                            <button key={d.name} style={{ ...g.btn("ghost"), textAlign: "left" }} onClick={() => window.open(d.url(ca), "_blank")}>
                              <div style={{ ...g.row, gap: "6px" }}>
                                <Icon name="extern" size={8} color={C.blue} />
                                {d.name}
                              </div>
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
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "560px" }}>
              <SectionHeader iconName="bridge" title="BRIDGE" sub="PINDAHKAN TOKEN ANTAR CHAIN VIA BRIDGE RESMI" />
              {!hasScanned ? (
                <div style={g.warnBox}>
                  <div style={{ ...g.row, marginBottom: "8px" }}>
                    <Icon name="warning" size={12} color={C.yellow} />
                    <span style={{ fontFamily: FONT, fontSize: "8px", color: C.yellow }}>SCAN DULU</span>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" }}>
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
                    return (
                      <div style={{ marginTop: "14px" }}>
                        <div style={{ background: C.surface, border: `2px solid ${C.border}`, padding: "10px", marginBottom: "12px" }}>
                          <div style={{ fontFamily: FONT, fontSize: "7px", color: C.muted, marginBottom: "6px" }}>TOKEN YANG AKAN DI-BRIDGE</div>
                          <div style={{ fontFamily: FONT, fontSize: "9px", color: C.white }}>{fromToken?.symbol || "TOKEN"}</div>
                          <div style={{ fontFamily: FONT, fontSize: "7px", color: C.muted, marginTop: "4px" }}>
                            {fromChain?.name}: <span style={{ color: C.green }}>${fmt(fromToken?.price)}</span> &nbsp;|&nbsp; {toChain?.name}: <span style={{ color: C.yellow }}>${fmt(toToken?.price)}</span>
                          </div>
                        </div>
                        {compatible.length === 0 ? (
                          <div style={g.warnBox}>
                            <div style={{ ...g.row, marginBottom: "6px" }}>
                              <Icon name="warning" size={12} color={C.yellow} />
                              <span style={{ fontFamily: FONT, fontSize: "8px", color: C.yellow }}>TIDAK ADA BRIDGE</span>
                            </div>
                            <div style={{ fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" }}>
                              Tidak ada bridge yang mendukung rute {fromChain?.name} ke {toChain?.name} untuk token ini. Coba rute lain atau gunakan DEX di masing-masing chain.
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ fontFamily: FONT, fontSize: "8px", color: C.muted, marginBottom: "4px" }}>PILIH BRIDGE:</div>
                            {compatible.map(b => {
                              const url = b.url(fromChain?.id, toChain?.id, fromToken?.ca, "");
                              return (
                                <div key={b.name} style={{ background: C.surface, border: `2px solid ${C.border2}`, padding: "10px 12px", cursor: "pointer" }} onClick={() => window.open(url, "_blank")}>
                                  <div style={g.between}>
                                    <div>
                                      <div style={{ fontFamily: FONT, fontSize: "9px", color: C.white, marginBottom: "4px" }}>{b.name}</div>
                                      <div style={{ fontFamily: FONT, fontSize: "7px", color: C.muted }}>{b.desc}</div>
                                    </div>
                                    <div style={{ ...g.row }}>
                                      <Icon name="extern" size={10} color={C.blue} />
                                      <span style={g.tag(C.blue)}>BUKA</span>
                                    </div>
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
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "560px" }}>
              <SectionHeader iconName="swap" title="CROSS-CHAIN SWAP" sub="SWAP TOKEN LINTAS CHAIN VIA DEBRIDGE DLN" />
              {!hasScanned ? (
                <div style={g.warnBox}>
                  <div style={{ ...g.row, marginBottom: "8px" }}>
                    <Icon name="warning" size={12} color={C.yellow} />
                    <span style={{ fontFamily: FONT, fontSize: "8px", color: C.yellow }}>SCAN DULU</span>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" }}>
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
                        {scannedChainKeys.map(k => (
                          <option key={k} value={k}>{CHAINS_BY_KEY[k]?.name} ({scannedTokens[k]?.symbol})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={g.label}>CHAIN TUJUAN</label>
                      <select style={g.select} value={sTo} onChange={e => { setSTo(e.target.value); setSStep(0); setSQuote(null); }}>
                        <option value="">-- PILIH --</option>
                        {scannedChainKeys.filter(k => k !== sFrom).map(k => (
                          <option key={k} value={k}>{CHAINS_BY_KEY[k]?.name} ({scannedTokens[k]?.symbol})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <label style={g.label}>JUMLAH {sFrom ? `(${scannedTokens[sFrom]?.symbol})` : ""}</label>
                    <input style={g.input} placeholder="0.00" value={sAmt} onChange={e => { setSAmt(e.target.value); setSStep(0); }} />
                  </div>
                  {sQuote && (
                    <div style={{ background: C.surface, border: `2px solid ${C.border2}`, padding: "12px", marginTop: "12px" }}>
                      <div style={{ fontFamily: FONT, fontSize: "7px", color: C.muted, marginBottom: "8px" }}>QUOTE DEBRIDGE</div>
                      <div style={g.between}>
                        <span style={{ fontFamily: FONT, fontSize: "8px", color: C.muted }}>ESTIMASI DITERIMA</span>
                        <b style={{ fontFamily: FONT, fontSize: "9px", color: C.green }}>{sQuote.outAmt} {sQuote.toToken?.symbol}</b>
                      </div>
                    </div>
                  )}
                  {sHash && sStep === 2 && (
                    <div style={g.successBox}>
                      <div style={{ ...g.row, marginBottom: "6px" }}>
                        <Icon name="check" size={12} color={C.green} />
                        <span style={{ fontFamily: FONT, fontSize: "8px", color: C.green }}>SWAP BERHASIL!</span>
                      </div>
                      <a href={explorerUrl(CHAINS_BY_KEY[sFrom]?.id, sHash)} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontSize: "7px", color: C.blue }}>LIHAT DI EXPLORER</a>
                    </div>
                  )}
                  <div style={{ ...g.row, marginTop: "14px" }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "520px" }}>
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
                <div style={{ marginTop: "12px" }}>
                  <label style={g.label}>CONTRACT ADDRESS TOKEN</label>
                  <div style={g.row}>
                    <input style={{ ...g.input, flex: 1 }} placeholder="0x..." value={tCA} onChange={e => { setTCA(e.target.value); setTTokenInfo(null); setTStep(0); }} />
                    <button style={g.btn("cyan", tFetchingToken || !tCA || !tChain)} onClick={fetchTransferToken} disabled={tFetchingToken || !tCA || !tChain}>
                      {tFetchingToken ? "..." : "CEK"}
                    </button>
                  </div>
                </div>
                {tTokenInfo && (
                  <div style={{ background: C.surface, border: `2px solid ${C.green}`, padding: "10px", marginTop: "10px" }}>
                    <div style={{ fontFamily: FONT, fontSize: "7px", color: C.muted, marginBottom: "6px" }}>TOKEN DITEMUKAN</div>
                    <div style={{ fontFamily: FONT, fontSize: "10px", color: C.green }}>{tTokenInfo.symbol}</div>
                    <div style={{ fontFamily: FONT, fontSize: "8px", color: C.muted, marginTop: "2px" }}>{tTokenInfo.name}</div>
                  </div>
                )}
                {tTokenInfo && (
                  <>
                    <div style={{ marginTop: "12px" }}>
                      <label style={g.label}>ALAMAT PENERIMA</label>
                      <input style={g.input} placeholder="0x..." value={tTo} onChange={e => setTTo(e.target.value)} />
                    </div>
                    <div style={{ marginTop: "12px" }}>
                      <label style={g.label}>JUMLAH ({tTokenInfo.symbol})</label>
                      <input style={g.input} placeholder="0.00" value={tAmt} onChange={e => setTAmt(e.target.value)} />
                    </div>
                  </>
                )}
                {tHash && tStep === 2 && (
                  <div style={g.successBox}>
                    <div style={{ ...g.row, marginBottom: "6px" }}>
                      <Icon name="check" size={12} color={C.green} />
                      <span style={{ fontFamily: FONT, fontSize: "8px", color: C.green }}>TRANSFER BERHASIL!</span>
                    </div>
                    <a href={explorerUrl(CHAINS_BY_KEY[tChain]?.id, tHash)} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontSize: "7px", color: C.blue }}>LIHAT DI EXPLORER</a>
                  </div>
                )}
                {tTokenInfo && (
                  <div style={{ marginTop: "14px" }}>
                    <button style={g.btn("primary", tLoading || !tTo || !tAmt)} onClick={execTransfer} disabled={tLoading || !tTo || !tAmt}>
                      <div style={{ ...g.row, gap: "6px" }}>
                        <Icon name="transfer" size={10} color={C.white} />
                        {tLoading ? "PROSES..." : "KIRIM TOKEN"}
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── HISTORY ── */}
          {page === "history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <SectionHeader iconName="history" title="RIWAYAT" sub="SEMUA TRANSAKSI DI SESI INI" />
              <div style={g.card}>
                {history.length === 0 && (
                  <div style={{ textAlign: "center", fontFamily: FONT, fontSize: "8px", color: C.muted, padding: "32px", lineHeight: "2" }}>
                    BELUM ADA AKTIVITAS<br />DI SESI INI
                  </div>
                )}
                {history.map((h, i) => (
                  <div key={i} style={{ ...g.between, padding: "10px 0", borderBottom: `2px solid ${C.border}` }}>
                    <div style={g.row}>
                      <span style={g.tag(h.type === "Bridge" ? C.blueL : h.type === "Swap" ? C.blue : C.cyan)}>{h.type}</span>
                      <span style={{ fontFamily: FONT, fontSize: "7px", color: C.muted, lineHeight: "1.8" }}>{h.detail}</span>
                    </div>
                    <div style={g.row}>
                      <span style={{ fontFamily: FONT, fontSize: "7px", color: C.muted }}>{h.ts}</span>
                      {h.hash && h.hash !== "---" && <a href={explorerUrl(h.chainId, h.hash)} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontSize: "7px", color: C.blue }}>VIEW</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PANDUAN ── */}
          {page === "guide" && (
            <div style={{ maxWidth: "680px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <SectionHeader iconName="guide" title="PANDUAN" sub="CARA PAKAI ARBX TOOL" />
              {[
                { name: "CARA PAKAI SCANNER", color: C.blue, steps: ["Masukkan contract address (CA) token di tiap chain yang ingin di-scan", "Isi nama token di pojok kanan atas (opsional)", "Klik SCAN SEMUA CHAIN", "Lihat harga di tiap chain dan peluang arbitrasi yang muncul"] },
                { name: "CARA PAKAI BRIDGE", color: C.cyan, steps: ["Scan token dulu di menu SCANNER", "Buka menu BRIDGE, pilih chain asal dan tujuan", "Pilih bridge yang tersedia, klik BUKA", "Kamu akan diarahkan ke website bridge resmi", "Lakukan transaksi di sana dengan konfirmasi MetaMask"] },
                { name: "CARA PAKAI SWAP", color: C.blueL, steps: ["Scan token dulu di menu SCANNER", "Buka menu SWAP, pilih chain asal dan tujuan", "Masukkan jumlah, klik CEK QUOTE", "Jika quote oke, klik EKSEKUSI SWAP", "Konfirmasi di MetaMask"] },
                { name: "CARA PAKAI TRANSFER", color: C.blue, steps: ["Pilih chain tujuan", "Masukkan CA token yang ingin ditransfer", "Klik CEK untuk verifikasi token", "Masukkan alamat penerima dan jumlah", "Klik KIRIM TOKEN dan konfirmasi di MetaMask"] },
                { name: "KEAMANAN WALLET", color: C.green, steps: ["Website ini TIDAK pernah meminta seed phrase", "Semua transaksi selalu minta konfirmasi di MetaMask", "Kamu selalu punya kontrol penuh atas dana", "Hanya connect wallet jika yakin dengan transaksi", "Test dengan jumlah kecil terlebih dahulu"] },
                { name: "DATA & API", color: C.cyan, steps: ["Harga real-time dari DexScreener (gratis, tidak perlu API key)", "Bridge via Across, deBridge, Wormhole, Mayan, Stargate, Symbiosis", "Swap via deBridge DLN (tidak perlu API key)", "Semua data diambil langsung dari sumber resmi"] },
              ].map(item => (
                <div key={item.name} style={{ ...g.card, borderLeft: `4px solid ${item.color}` }}>
                  <div style={{ fontFamily: FONT, fontSize: "9px", color: item.color, marginBottom: "12px" }}>{item.name}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {item.steps.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: "10px", fontFamily: FONT, fontSize: "7px", lineHeight: "1.8" }}>
                        <span style={{ color: item.color, flexShrink: 0 }}>{i + 1}.</span>
                        <span style={{ color: C.muted }}>{s}</span>
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
