import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG — Gabungan kedua app (semua chain dari ca-arb-tool + evm chains dari arbx)
// ═══════════════════════════════════════════════════════════════════════════════
const CHAINS_BY_KEY = {
  ethereum: { id:1,     name:"Ethereum",  symbol:"ETH",  color:"#627EEA", explorer:"https://etherscan.io",    dexscreener:"ethereum",   native:"ETH",  nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"ethereum"  },
  bsc:      { id:56,    name:"BSC",       symbol:"BNB",  color:"#F3BA2F", explorer:"https://bscscan.com",     dexscreener:"bsc",        native:"BNB",  nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"bsc"       },
  base:     { id:8453,  name:"Base",      symbol:"ETH",  color:"#0052FF", explorer:"https://basescan.org",    dexscreener:"base",       native:"ETH",  nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"base"      },
  arbitrum: { id:42161, name:"Arbitrum",  symbol:"ETH",  color:"#12AAFF", explorer:"https://arbiscan.io",     dexscreener:"arbitrum",   native:"ETH",  nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"arbitrum"  },
  polygon:  { id:137,   name:"Polygon",   symbol:"MATIC",color:"#8247E5", explorer:"https://polygonscan.com", dexscreener:"polygon",    native:"MATIC",nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"polygon"   },
  avalanche:{ id:43114, name:"Avalanche", symbol:"AVAX", color:"#E84142", explorer:"https://snowtrace.io",    dexscreener:"avalanche",  native:"AVAX", nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"avalanche" },
  hyperevm: { id:999,   name:"HyperEVM",  symbol:"HYPE", color:"#00E5BE", explorer:"https://hyperevm.explorer.io", dexscreener:"hyperliquid", native:"HYPE",nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"hyperliquid"},
  nesa:     { id:41443, name:"Nesa",      symbol:"NES",  color:"#FF6B35", explorer:"https://explorer.nesa.ai",dexscreener:"nesa",       native:"NES",  nativeAddr:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, type:"evm", dex:"nesa"      },
  solana:   { id:null,  name:"Solana",    symbol:"SOL",  color:"#9945FF", explorer:"https://solscan.io/token",dexscreener:"solana",     native:"SOL",  nativeAddr:"So11111111111111111111111111111111111111112", decimals:9,  type:"svm", dex:"solana"    },
};

// Lookup by numeric ID juga (untuk compatibility arbx)
const CHAINS = { ...CHAINS_BY_KEY, 1:CHAINS_BY_KEY.ethereum, 56:CHAINS_BY_KEY.bsc, 8453:CHAINS_BY_KEY.base, 42161:CHAINS_BY_KEY.arbitrum, 137:CHAINS_BY_KEY.polygon, 43114:CHAINS_BY_KEY.avalanche, sol:CHAINS_BY_KEY.solana };

const TOKEN_ADDRS = {
  USDC: { 1:"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 56:"0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", 8453:"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 42161:"0xaf88d065e77c8cC2239327C5EDb3A432268e5831", 137:"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", 43114:"0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E" },
  USDT: { 1:"0xdAC17F958D2ee523a2206206994597C13D831ec7", 56:"0x55d398326f99059fF775485246999027B3197955", 42161:"0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", 137:"0xc2132D05D31c914a87C6611C10748AEb04B58e8F" },
  WETH:  { 1:"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 8453:"0x4200000000000000000000000000000000000006", 42161:"0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 137:"0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" },
};

const BRIDGES = [
  { name:"Across",    icon:"🌉", supports:["evm"],       desc:"EVM tercepat, fee rendah",       url:(f,t,tok,amt)=>`https://across.to/?from=${f}&to=${t}&asset=${tok}&amount=${amt}` },
  { name:"deBridge",  icon:"🔗", supports:["evm","svm"], desc:"EVM + Solana, any token",        url:(f,t,tok)=>`https://app.debridge.finance/?inputChain=${f}&outputChain=${t}&inputCurrency=${tok}` },
  { name:"Wormhole",  icon:"🌀", supports:["evm","svm"], desc:"Cross semua chain + Solana",     url:()=>`https://portalbridge.com/#/transfer` },
  { name:"Mayan",     icon:"🔱", supports:["evm","svm"], desc:"Solana ↔ EVM terbaik",          url:(f,t,tok)=>`https://swap.mayan.finance/?fromChain=${f}&toChain=${t}&from=${tok}` },
  { name:"Stargate",  icon:"⭐", supports:["evm"],       desc:"USDC/USDT stablecoin bridge",    url:(f,t,tok)=>`https://stargate.finance/transfer?srcChain=${f}&dstChain=${t}&srcToken=${tok}` },
  { name:"Symbiosis", icon:"♾️", supports:["evm","svm"], desc:"Multi-chain incl. Nesa & HyperEVM", url:(f,t,tok)=>`https://app.symbiosis.finance/swap?chainIn=${f}&chainOut=${t}&tokenIn=${tok}` },
];

const DEXES = {
  ethereum: [{ name:"Uniswap",     url:ca=>`https://app.uniswap.org/swap?outputCurrency=${ca}&chain=mainnet` }, { name:"1inch ETH",    url:ca=>`https://app.1inch.io/#/1/simple/swap/ETH/${ca}` },   { name:"Paraswap",  url:ca=>`https://app.paraswap.io/#/${ca}-ETH/1/SELL/?network=ethereum` }],
  bsc:      [{ name:"PancakeSwap", url:ca=>`https://pancakeswap.finance/swap?outputCurrency=${ca}` },           { name:"1inch BSC",    url:ca=>`https://app.1inch.io/#/56/simple/swap/BNB/${ca}` }],
  base:     [{ name:"Aerodrome",   url:ca=>`https://aerodrome.finance/swap?to=${ca}` },                         { name:"1inch Base",   url:ca=>`https://app.1inch.io/#/8453/simple/swap/ETH/${ca}` }],
  arbitrum: [{ name:"Camelot",     url:ca=>`https://app.camelot.exchange/?outputCurrency=${ca}` },              { name:"1inch Arb",    url:ca=>`https://app.1inch.io/#/42161/simple/swap/ETH/${ca}` }],
  polygon:  [{ name:"QuickSwap",   url:ca=>`https://quickswap.exchange/#/swap?outputCurrency=${ca}` },          { name:"1inch Poly",   url:ca=>`https://app.1inch.io/#/137/simple/swap/MATIC/${ca}` }],
  avalanche:[{ name:"TraderJoe",   url:ca=>`https://traderjoexyz.com/avalanche/swap?outputCurrency=${ca}` }],
  hyperevm: [{ name:"HyperSwap",   url:ca=>`https://app.hyperliquid.xyz/trade/${ca}` }],
  nesa:     [{ name:"Nesa DEX",    url:ca=>`https://dex.nesa.ai/swap?token=${ca}` }],
  solana:   [{ name:"Jupiter",     url:ca=>`https://jup.ag/swap/SOL-${ca}` },                                   { name:"Orca",         url:ca=>`https://www.orca.so/?outputMint=${ca}` }],
};

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN
// ═══════════════════════════════════════════════════════════════════════════════
const C = { bg:"#06060F", surface:"#0B0B18", card:"#0E0E1C", card2:"#121224", border:"#191930", border2:"#21213D", text:"#DDE3F0", muted:"#434360", dim:"#161628", green:"#00D9B0", blue:"#4F8EF7", yellow:"#F5A623", red:"#F05252", purple:"#9B6DFF", teal:"#00C9C9", orange:"#FF6B35" };

const g = {
  root:    { background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"'SF Mono','Fira Code','Consolas',monospace", fontSize:"12px", display:"flex", flexDirection:"column" },
  topbar:  { background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 16px", display:"flex", alignItems:"center", height:"48px", flexShrink:0, position:"sticky", top:0, zIndex:200 },
  brand:   { fontWeight:"800", fontSize:"14px", color:"#fff", display:"flex", alignItems:"center", gap:"7px", marginRight:"20px", letterSpacing:"0.06em" },
  layout:  { display:"flex", flex:1, minHeight:0 },
  sidebar: { width:"178px", flexShrink:0, background:C.surface, borderRight:`1px solid ${C.border}`, padding:"12px 0", display:"flex", flexDirection:"column", gap:"2px", overflowY:"auto" },
  navItem: (a) => ({ display:"flex", alignItems:"center", gap:"9px", padding:"9px 16px", fontSize:"11px", fontWeight:"700", letterSpacing:"0.06em", color:a?C.green:C.muted, background:a?`${C.green}10`:"transparent", borderLeft:a?`2px solid ${C.green}`:"2px solid transparent", cursor:"pointer", border:"none", width:"100%", textAlign:"left" }),
  main:    { flex:1, overflowY:"auto", padding:"18px 20px" },
  card:    { background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"18px" },
  card2:   { background:C.card2, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"14px" },
  label:   { fontSize:"10px", color:C.muted, fontWeight:"700", letterSpacing:"0.1em", marginBottom:"6px", display:"block" },
  input:   { width:"100%", background:C.surface, border:`1px solid ${C.border2}`, color:C.text, borderRadius:"6px", padding:"9px 12px", fontSize:"12px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  select:  { width:"100%", background:C.surface, border:`1px solid ${C.border2}`, color:C.text, borderRadius:"6px", padding:"9px 12px", fontSize:"12px", outline:"none", boxSizing:"border-box", fontFamily:"inherit", cursor:"pointer" },
  btn:     (v="primary",dis=false) => ({ padding:"9px 18px", borderRadius:"7px", fontSize:"11px", fontWeight:"700", letterSpacing:"0.06em", cursor:dis?"not-allowed":"pointer", border:"none", opacity:dis?0.4:1, flexShrink:0,
    background: v==="primary"?`linear-gradient(135deg,${C.green},${C.teal})`:v==="purple"?`linear-gradient(135deg,${C.purple},${C.blue})`:v==="ghost"?C.card2:v==="danger"?`${C.red}18`:"transparent",
    color: v==="primary"?C.bg:v==="purple"?C.bg:v==="danger"?C.red:C.text,
    border: v==="ghost"?`1px solid ${C.border2}`:v==="danger"?`1px solid ${C.red}35`:"none" }),
  row:     { display:"flex", alignItems:"center", gap:"8px" },
  between: { display:"flex", alignItems:"center", justifyContent:"space-between" },
  grid2:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" },
  tag:     (c) => ({ fontSize:"10px", padding:"2px 7px", borderRadius:"3px", background:`${c}18`, color:c, fontWeight:"700", border:`1px solid ${c}28`, whiteSpace:"nowrap" }),
  chip:    (c) => ({ display:"inline-flex", alignItems:"center", gap:"4px", padding:"3px 8px", borderRadius:"20px", background:`${c}15`, border:`1px solid ${c}30`, fontSize:"10px", color:c, fontWeight:"700" }),
  divider: { height:"1px", background:C.border, margin:"14px 0" },
  dot:     (c) => ({ width:"7px", height:"7px", borderRadius:"50%", background:c, boxShadow:`0 0 5px ${c}`, flexShrink:0 }),
  sectionTitle: { fontSize:"14px", fontWeight:"800", color:"#fff", marginBottom:"4px" },
  sectionSub:   { fontSize:"10px", color:C.muted, marginBottom:"16px" },
  quoteBox: { background:C.surface, border:`1px solid ${C.border2}`, borderRadius:"8px", padding:"14px", marginTop:"14px" },
  successBox: { background:`${C.green}08`, border:`1px solid ${C.green}28`, borderRadius:"8px", padding:"14px", marginTop:"14px" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════════
const sh = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "";
const fmt = (n,d=4) => n==null?"—":Number(n).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:d});
const toWei = (amt,dec=18) => BigInt(Math.round(parseFloat(amt||0)*10**dec)).toString();
const fromWei = (wei,dec=18) => Number(BigInt(wei||0))/10**dec;
const chainName = id => CHAINS[id]?.name || id;

async function fetchDexPrice(chainKey, ca) {
  if (!ca || ca.length < 6) return null;
  try {
    const chain = typeof chainKey === "string" ? CHAINS_BY_KEY[chainKey] || CHAINS[chainKey] : CHAINS[chainKey];
    const dexKey = chain?.dexscreener || chain?.dex || chainKey;
    const res  = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
    const data = await res.json();
    if (!data.pairs?.length) return null;
    const filtered = data.pairs.filter(p => p.chainId === dexKey || p.chainId === String(dexKey));
    const best = (filtered.length ? filtered : data.pairs).sort((a,b)=>(b.liquidity?.usd||0)-(a.liquidity?.usd||0))[0];
    return { price:parseFloat(best.priceUsd), liquidity:best.liquidity?.usd, volume24h:best.volume?.h24, dex:best.dexId, priceChange24h:best.priceChange?.h24, pair:best.pairAddress };
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
function Toast({ items }) {
  return (
    <div style={{ position:"fixed", bottom:"16px", right:"16px", zIndex:9999, display:"flex", flexDirection:"column", gap:"7px" }}>
      {items.map(t => (
        <div key={t.id} style={{ background:C.card2, border:`1px solid ${t.type==="success"?C.green:t.type==="error"?C.red:t.type==="warn"?C.yellow:C.border}`, borderRadius:"8px", padding:"10px 14px", fontSize:"11px", color:t.type==="success"?C.green:t.type==="error"?C.red:t.type==="warn"?C.yellow:C.text, maxWidth:"320px", boxShadow:"0 8px 32px #00000099" }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function Steps({ step, labels }) {
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:"18px" }}>
      {labels.map((l,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", flex: i<labels.length-1?1:0 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
            <div style={{ width:"26px", height:"26px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:"800", background:step>i?C.green:step===i?`${C.green}20`:`${C.border}`, border:`2px solid ${step>=i?C.green:C.border}`, color:step>i?C.bg:step===i?C.green:C.muted }}>
              {step>i?"✓":i+1}
            </div>
            <span style={{ fontSize:"9px", color:step>=i?C.green:C.muted, fontWeight:"700", whiteSpace:"nowrap", letterSpacing:"0.07em" }}>{l}</span>
          </div>
          {i<labels.length-1 && <div style={{ flex:1, height:"2px", background:step>i?C.green:C.border, margin:"0 6px", marginBottom:"14px" }} />}
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ icon, title, sub }) {
  return (
    <div style={{ marginBottom:"18px" }}>
      <div style={{ ...g.row, marginBottom:"4px" }}>
        <span style={{ fontSize:"18px" }}>{icon}</span>
        <span style={g.sectionTitle}>{title}</span>
      </div>
      {sub && <div style={g.sectionSub}>{sub}</div>}
    </div>
  );
}

// Bridge Modal (dari ca-arb-tool, lebih lengkap)
function BridgeModal({ opp, onClose, tokenName }) {
  if (!opp) return null;
  const fromChain = CHAINS_BY_KEY[opp.buyChain] || CHAINS[opp.buyChain];
  const toChain   = CHAINS_BY_KEY[opp.sellChain] || CHAINS[opp.sellChain];
  const fromType  = fromChain?.type;
  const toType    = toChain?.type;
  const compatible = BRIDGES.filter(b => b.supports.includes(fromType) && b.supports.includes(toType));
  return (
    <div style={{ position:"fixed", inset:0, background:"#00000090", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:C.card, border:`1px solid ${C.border2}`, borderRadius:"12px", padding:"24px", maxWidth:"480px", width:"92%", maxHeight:"85vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ ...g.between, marginBottom:"16px" }}>
          <div style={{ fontWeight:"800", fontSize:"15px", color:"#fff" }}>🌉 Pilih Bridge</div>
          <button style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"18px" }} onClick={onClose}>✕</button>
        </div>
        <div style={{ background:C.surface, borderRadius:"8px", padding:"12px 14px", marginBottom:"16px" }}>
          <div style={{ fontSize:"11px", color:C.muted, marginBottom:"8px" }}>RUTE ARBITRASI</div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
            <span style={g.chip(fromChain?.color||C.blue)}>● {fromChain?.name||opp.buyChain}</span>
            <span style={{ color:C.muted }}>→</span>
            <span style={g.chip(toChain?.color||C.purple)}>● {toChain?.name||opp.sellChain}</span>
            <span style={{ marginLeft:"auto", ...g.tag(C.green) }}>+{opp.spread}% spread</span>
          </div>
          <div style={{ marginTop:"8px", fontSize:"11px", color:C.muted }}>
            Token: <b style={{color:"#fff"}}>{tokenName}</b> · Beli @ <span style={{color:C.green}}>${fmt(opp.buyPrice)}</span> · Jual @ <span style={{color:C.yellow}}>${fmt(opp.sellPrice)}</span>
          </div>
        </div>
        {compatible.length === 0 && <div style={{ color:C.yellow, fontSize:"12px", padding:"12px", background:`${C.yellow}10`, borderRadius:"6px" }}>⚠️ Belum ada bridge langsung. Coba deBridge atau Wormhole manual.</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
          {compatible.map(b => {
            const fromKey = fromChain?.id || opp.buyChain;
            const toKey   = toChain?.id   || opp.sellChain;
            const url = b.url(fromKey, toKey, tokenName, "");
            return (
              <div key={b.name} style={{ background:C.surface, border:`1px solid ${C.border2}`, borderRadius:"8px", padding:"12px 14px", cursor:"pointer" }} onClick={() => window.open(url, "_blank")}>
                <div style={g.between}>
                  <div style={g.row}>
                    <span style={{ fontSize:"18px" }}>{b.icon}</span>
                    <div><div style={{ fontWeight:"700", color:"#fff" }}>{b.name}</div><div style={{ fontSize:"10px", color:C.muted, marginTop:"2px" }}>{b.desc}</div></div>
                  </div>
                  <span style={g.tag(C.purple)}>BUKA ↗</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:"12px", background:`${C.blue}10`, border:`1px solid ${C.blue}25`, borderRadius:"7px", padding:"12px" }}>
          <div style={{ fontSize:"10px", fontWeight:"700", color:C.blue, marginBottom:"6px" }}>CARA DAPAT API KEY</div>
          <div style={{ fontSize:"10px", color:C.muted, lineHeight:"1.7" }}>
            • <b style={{color:"#fff"}}>1inch</b>: portal.1inch.dev → gratis 100k req/mo<br/>
            • <b style={{color:"#fff"}}>Across</b>: across.to/developers → free tier<br/>
            • <b style={{color:"#fff"}}>deBridge</b>: docs.debridge.finance → tidak perlu key<br/>
            • <b style={{color:"#fff"}}>Wormhole</b>: docs.wormhole.com → SDK open source
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage]       = useState("scanner");
  const [wallet, setWallet]   = useState(null);
  const [chainId, setChainId] = useState(null);
  const [toasts, setToasts]   = useState([]);
  const [history, setHistory] = useState([]);
  const [bridgeModal, setBridgeModal] = useState(null);

  // ── CA Scanner (dari ca-arb-tool — lebih lengkap, support semua chain) ──
  const [tokenName, setTokenName] = useState("NESA");
  const [caInputs, setCaInputs] = useState({
    nesa:     "",
    bsc:      "0x3131f6B80C26936aB03F7d9D29Eb4Ddf36AC3FB5",
    ethereum: "0x230f1E241C621d5af670Dad83ebCdd18971E2995",
    solana:   "DcozfBUx4qxNwfq3PU622qHvVtnMRtJEUjhmyiFRaG43",
    hyperevm: "0xD1B6443d49156B66E7bd8a37673511BE68BFa459",
    base:     "0x87ea09Fe8d9dC6115086F5E0A30CA6750a997f1C",
    arbitrum: "0xEf9295afCff293956E8B149b33449f246f6F107D",
    polygon:  "",
    avalanche:"",
  });
  const [scanResults, setScanResults] = useState({});
  const [scanLoading, setScanLoading] = useState({});
  const [opportunities, setOpps]      = useState([]);
  const [scanning, setScanning]       = useState(false);
  const [lastScan, setLastScan]       = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRef = useRef(null);

  // ── Bridge state (dari arbx) ──
  const [bFrom, setBFrom]   = useState("1");
  const [bTo, setBTo]       = useState("8453");
  const [bToken, setBToken] = useState("USDC");
  const [bAmt, setBAmt]     = useState("");
  const [bRecip, setBRecip] = useState("");
  const [bQuote, setBQuote] = useState(null);
  const [bStep, setBStep]   = useState(0);
  const [bLoading, setBLoading] = useState(false);
  const [bHash, setBHash]   = useState(null);

  // ── Swap state (dari arbx) ──
  const [sFrom, setSFrom]   = useState("1");
  const [sTo, setSTo]       = useState("56");
  const [sFTok, setSFTok]   = useState("USDC");
  const [sTTok, setSTTok]   = useState("USDT");
  const [sAmt, setSAmt]     = useState("");
  const [sQuote, setSQuote] = useState(null);
  const [sStep, setSStep]   = useState(0);
  const [sLoading, setSLoading] = useState(false);
  const [sHash, setSHash]   = useState(null);

  // ── Transfer state (dari arbx) ──
  const [tChain, setTChain] = useState("1");
  const [tTo, setTTo]       = useState("");
  const [tAmt, setTAmt]     = useState("");
  const [tTok, setTTok]     = useState("ETH");
  const [tStep, setTStep]   = useState(0);
  const [tHash, setTHash]   = useState(null);
  const [tLoading, setTLoading] = useState(false);

  // ── Toast ──
  const toast = useCallback((msg, type="info") => {
    const id = Date.now()+Math.random();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4500);
  },[]);

  const addHistory = (entry) => setHistory(p=>[{...entry,ts:new Date().toLocaleTimeString("id-ID",{hour12:false})},...p.slice(0,49)]);

  // ── MetaMask ──
  const connect = async () => {
    if (!window.ethereum) { toast("Install MetaMask dulu","error"); return; }
    try {
      const [acct] = await window.ethereum.request({method:"eth_requestAccounts"});
      const cid    = await window.ethereum.request({method:"eth_chainId"});
      setWallet(acct); setChainId(parseInt(cid,16));
      setBRecip(acct);
      toast(`✅ ${sh(acct)} terhubung`,"success");
    } catch { toast("Koneksi ditolak","error"); }
  };

  useEffect(()=>{
    if (!window.ethereum) return;
    const onA = a => { if(a[0]) setWallet(a[0]); else setWallet(null); };
    const onC = c => setChainId(parseInt(c,16));
    window.ethereum.on("accountsChanged",onA);
    window.ethereum.on("chainChanged",onC);
    return ()=>{ window.ethereum.removeListener("accountsChanged",onA); window.ethereum.removeListener("chainChanged",onC); };
  },[]);

  const switchChain = async (targetId) => {
    const t = CHAINS[targetId] || Object.values(CHAINS_BY_KEY).find(c=>c.id===Number(targetId));
    if (!t || t.type!=="evm") { toast(`Switch manual untuk ${t?.name||targetId}`,"warn"); return; }
    try {
      await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:`0x${Number(targetId).toString(16)}`}]});
      setChainId(Number(targetId));
      toast(`✅ ${t.name}`,"success");
    } catch(e) { toast(`Gagal switch: ${e.message}`,"error"); }
  };

  // ── CA Scanner (support semua chain dari ca-arb-tool) ──
  const runScan = useCallback(async () => {
    const active = Object.entries(caInputs).filter(([,v])=>v&&v.trim());
    if (!active.length) { toast("Isi minimal 1 CA dulu","warn"); return; }
    setScanning(true); setScanResults({}); setOpps([]);
    const loading = {}; active.forEach(([k])=>loading[k]=true); setScanLoading(loading);
    const fetched = {};
    await Promise.all(active.map(async([chain,ca])=>{
      const d = await fetchDexPrice(chain, ca.trim());
      fetched[chain] = d ? {...d,ca:ca.trim()} : {error:true,ca:ca.trim()};
      setScanLoading(p=>({...p,[chain]:false}));
      setScanResults(p=>({...p,[chain]:fetched[chain]}));
    }));
    const prices = Object.entries(fetched).filter(([,v])=>v?.price);
    const opps = [];
    for (let i=0;i<prices.length;i++) for (let j=i+1;j<prices.length;j++) {
      const [cA,dA]=prices[i],[cB,dB]=prices[j];
      const spread = Math.abs(dA.price-dB.price)/Math.min(dA.price,dB.price)*100;
      const [buyC,sellC,buyD,sellD] = dA.price<dB.price?[cA,cB,dA,dB]:[cB,cA,dB,dA];
      opps.push({buyChain:buyC,sellChain:sellC,buyPrice:buyD.price,sellPrice:sellD.price,buyDex:buyD.dex,sellDex:sellD.dex,spread:+spread.toFixed(4),buyLiq:buyD.liquidity,sellLiq:sellD.liquidity,buyCA:caInputs[buyC],sellCA:caInputs[sellC]});
    }
    setOpps(opps.sort((a,b)=>b.spread-a.spread));
    setScanning(false);
    setLastScan(new Date().toLocaleTimeString("id-ID",{hour12:false}));
    toast(`✅ ${prices.length} chain, ${opps.length} peluang ditemukan`,"success");
  },[caInputs,toast]);

  useEffect(()=>{
    if (autoRefresh) { autoRef.current=setInterval(runScan,30000); toast("Auto-refresh 30s aktif"); }
    else clearInterval(autoRef.current);
    return ()=>clearInterval(autoRef.current);
  },[autoRefresh,runScan]);

  // ── Bridge (Across) ──
  const getAcrossQuote = async () => {
    if (!bAmt||!bFrom||!bTo) { toast("Isi semua field","warn"); return; }
    if (!wallet) { toast("Connect wallet dulu","error"); return; }
    setBLoading(true); setBQuote(null);
    try {
      const tokenAddr = TOKEN_ADDRS[bToken]?.[bFrom];
      if (!tokenAddr) throw new Error(`${bToken} tidak ada di ${CHAINS[bFrom]?.name}`);
      const dec = bToken.startsWith("USD")?6:18;
      const inputAmt = toWei(bAmt,dec);
      const outToken = TOKEN_ADDRS[bToken]?.[bTo]||tokenAddr;
      const url = `https://app.across.to/api/suggested-fees?inputToken=${tokenAddr}&outputToken=${outToken}&originChainId=${bFrom}&destinationChainId=${bTo}&amount=${inputAmt}&recipient=${bRecip||wallet}`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`Across: ${res.status}`);
      const data = await res.json();
      const fee = fromWei(data.relayFeeTotal||data.totalRelayFee?.total||0,dec);
      setBQuote({ tokenAddr, outToken, inputAmt, outAmt:(parseFloat(bAmt)-fee).toFixed(4), fee:fee.toFixed(4), relayFeeTotal:data.relayFeeTotal||data.totalRelayFee?.total, spokePool:data.spokePoolAddress, dec, eta:data.estimatedFillTimeSec?`~${Math.ceil(data.estimatedFillTimeSec/60)} mnt`:"~2-5 mnt" });
      setBStep(1); toast("✅ Quote didapat","success");
    } catch(e) { toast(`Quote gagal: ${e.message}`,"error"); }
    setBLoading(false);
  };

  const execBridge = async () => {
    if (!bQuote||!wallet) return;
    setBLoading(true);
    try {
      if (chainId!==Number(bFrom)) { await switchChain(bFrom); await new Promise(r=>setTimeout(r,1200)); }
      const deadline = Math.floor(Date.now()/1000)+3600;
      const qt = Math.floor(Date.now()/1000);
      const pad  = v => v.replace("0x","").padStart(64,"0");
      const padN = n => BigInt(n||0).toString(16).padStart(64,"0");
      const data = "0x7b939232"+pad(wallet)+pad(bRecip||wallet)+pad(bQuote.tokenAddr)+pad(bQuote.outToken)+padN(bQuote.inputAmt)+padN(BigInt(bQuote.inputAmt)-BigInt(bQuote.relayFeeTotal||0))+padN(bTo)+pad("0x0000000000000000000000000000000000000000")+padN(qt).slice(56)+padN(deadline).slice(56)+padN(0).slice(56)+padN(0)+padN(0);
      if (bToken!=="ETH"&&bToken!=="BNB") { toast("🔑 Approve token (1/2)…","warn"); await approveERC20(bQuote.tokenAddr,bQuote.spokePool,bAmt,bQuote.dec); await new Promise(r=>setTimeout(r,2000)); }
      toast("📤 Bridge (2/2)…");
      const hash = await sendTx({from:wallet,to:bQuote.spokePool,data,gas:"0x3D090"});
      setBHash(hash); setBStep(2);
      addHistory({type:"Bridge",detail:`${bAmt} ${bToken}: ${chainName(bFrom)}→${chainName(bTo)}`,hash,chainId:Number(bFrom)});
      toast(`✅ Bridge dikirim! ${sh(hash)}`,"success");
    } catch(e) { toast(`Gagal: ${e.message}`,"error"); }
    setBLoading(false);
  };

  // ── Swap (deBridge DLN) ──
  const getDeBridgeQuote = async () => {
    if (!sAmt||!wallet) { toast(wallet?"Isi jumlah":"Connect wallet dulu","warn"); return; }
    setSLoading(true); setSQuote(null);
    try {
      const srcTok = TOKEN_ADDRS[sFTok]?.[sFrom]||"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
      const dstTok = TOKEN_ADDRS[sTTok]?.[sTo]  ||"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
      const dec    = sFTok.startsWith("USD")?6:18;
      const inAmt  = toWei(sAmt,dec);
      const url = `https://api.dln.trade/v1.0/dln/order/quote?srcChainId=${sFrom}&srcChainTokenIn=${srcTok}&srcChainTokenInAmount=${inAmt}&dstChainId=${sTo}&dstChainTokenOut=${dstTok}&prependOperatingExpenses=true&affiliateFeePercent=0`;
      const res  = await fetch(url);
      if (!res.ok) { const e=await res.json(); throw new Error(e.errorMessage||res.status); }
      const data = await res.json();
      setSQuote({ srcTok, dstTok, inAmt, dec, outAmt:fromWei(data.estimation?.dstChainTokenOut?.amount||0,sTTok.startsWith("USD")?6:18).toFixed(4) });
      setSStep(1); toast("✅ Quote deBridge","success");
    } catch(e) { toast(`Quote gagal: ${e.message}`,"error"); }
    setSLoading(false);
  };

  const execSwap = async () => {
    if (!sQuote||!wallet) return;
    setSLoading(true);
    try {
      if (chainId!==Number(sFrom)) { await switchChain(sFrom); await new Promise(r=>setTimeout(r,1200)); }
      const url = `https://api.dln.trade/v1.0/dln/order/create-tx?srcChainId=${sFrom}&srcChainTokenIn=${sQuote.srcTok}&srcChainTokenInAmount=${sQuote.inAmt}&dstChainId=${sTo}&dstChainTokenOut=${sQuote.dstTok}&dstChainTokenOutRecipient=${wallet}&senderAddress=${wallet}&srcChainOrderAuthorityAddress=${wallet}&dstChainOrderAuthorityAddress=${wallet}&prependOperatingExpenses=true&affiliateFeePercent=0`;
      const res  = await fetch(url);
      if (!res.ok) { const e=await res.json(); throw new Error(e.errorMessage||res.status); }
      const tx   = await res.json();
      if (!tx.tx) throw new Error("Tidak ada tx data");
      if (!["ETH","BNB","MATIC","AVAX"].includes(sFTok)) { toast("🔑 Approve (1/2)…","warn"); await approveERC20(sQuote.srcTok,tx.tx.to,sAmt,sQuote.dec); await new Promise(r=>setTimeout(r,2000)); }
      toast("📤 Swap (2/2)…");
      const hash = await sendTx({from:wallet,to:tx.tx.to,data:tx.tx.data,value:tx.tx.value||"0x0",gas:"0x493E0"});
      setSHash(hash); setSStep(2);
      addHistory({type:"Swap",detail:`${sAmt} ${sFTok}→${sTTok}: ${chainName(sFrom)}→${chainName(sTo)}`,hash,chainId:Number(sFrom)});
      toast(`✅ Swap dikirim! ${sh(hash)}`,"success");
    } catch(e) { toast(`Gagal: ${e.message}`,"error"); }
    setSLoading(false);
  };

  // ── Transfer ──
  const execTransfer = async () => {
    if (!wallet) { toast("Connect wallet dulu","error"); return; }
    if (!tTo||!tAmt) { toast("Isi alamat & jumlah","warn"); return; }
    setTLoading(true); setTStep(1);
    try {
      if (chainId!==Number(tChain)) { await switchChain(tChain); await new Promise(r=>setTimeout(r,1200)); }
      let hash;
      const isNative = ["ETH","BNB","MATIC","AVAX"].includes(tTok);
      if (isNative) {
        const val = "0x"+BigInt(Math.round(parseFloat(tAmt)*1e18)).toString(16);
        hash = await sendTx({from:wallet,to:tTo,value:val,gas:"0x5208"});
      } else {
        const addr = TOKEN_ADDRS[tTok]?.[tChain];
        if (!addr) throw new Error(`${tTok} tidak tersedia di chain ini`);
        const dec = tTok.startsWith("USD")?6:18;
        const amt = BigInt(Math.round(parseFloat(tAmt)*10**dec)).toString(16).padStart(64,"0");
        const data = "0xa9059cbb"+tTo.replace("0x","").padStart(64,"0")+amt;
        hash = await sendTx({from:wallet,to:addr,data,gas:"0xEA60"});
      }
      setTHash(hash); setTStep(2);
      addHistory({type:"Transfer",detail:`${tAmt} ${tTok} → ${sh(tTo)}`,hash,chainId:Number(tChain)});
      toast(`✅ Transfer berhasil!`,"success");
    } catch(e) { setTStep(0); toast(`Gagal: ${e.message}`,"error"); }
    setTLoading(false);
  };

  const sendTx    = (tx) => window.ethereum.request({method:"eth_sendTransaction",params:[tx]});
  const approveERC20 = async (token,spender,amt,dec) => {
    const amount = "0x"+BigInt(Math.round(parseFloat(amt)*10**dec)).toString(16).padStart(64,"0");
    const data   = "0x095ea7b3"+spender.replace("0x","").padStart(64,"0")+amount;
    return sendTx({from:wallet,to:token,data,gas:"0xEA60"});
  };

  const explorerUrl  = (cid,hash) => `${CHAINS[cid]?.explorer||"https://etherscan.io"}/tx/${hash}`;
  const curChain     = CHAINS[chainId] || Object.values(CHAINS_BY_KEY).find(c=>c.id===chainId);
  const evmChainKeys = Object.entries(CHAINS_BY_KEY).filter(([,c])=>c.type==="evm");
  const tokenOpts    = ["ETH","BNB","MATIC","AVAX","USDC","USDT","WETH"];

  const NAV = [
    { key:"scanner",  icon:"🔍", label:"CA Scanner"  },
    { key:"dex",      icon:"💱", label:"DEX Links"    },
    { key:"bridge",   icon:"🌉", label:"Bridge"       },
    { key:"swap",     icon:"⇄",  label:"Swap"         },
    { key:"transfer", icon:"📤", label:"Transfer"     },
    { key:"history",  icon:"📋", label:"Riwayat"      },
    { key:"guide",    icon:"📖", label:"Panduan API"  },
  ];

  // ── RENDER ──
  return (
    <div style={g.root}>
      <Toast items={toasts} />
      {bridgeModal && <BridgeModal opp={bridgeModal} onClose={()=>setBridgeModal(null)} tokenName={tokenName} />}

      {/* Topbar */}
      <div style={g.topbar}>
        <div style={g.brand}>
          <span style={{ color:C.green, fontSize:"18px" }}>◈</span>
          <span>ARB<span style={{color:C.green}}>X</span></span>
          <span style={{ fontSize:"9px", color:C.muted, fontWeight:"400", letterSpacing:"0.05em" }}>UNIFIED</span>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"10px" }}>
          {wallet && curChain && <span style={g.tag(curChain.color||C.blue)}>● {curChain.name}</span>}
          {wallet && <span style={{ fontSize:"11px", color:C.muted }}>{sh(wallet)}</span>}
          <button style={g.btn(wallet?"ghost":"primary")} onClick={connect}>
            {wallet?"✓ Connected":"Connect MetaMask"}
          </button>
        </div>
      </div>

      <div style={g.layout}>
        {/* Sidebar */}
        <div style={g.sidebar}>
          {NAV.map(n => (
            <button key={n.key} style={g.navItem(page===n.key)} onClick={()=>setPage(n.key)}>
              <span style={{fontSize:"14px"}}>{n.icon}</span>
              {n.label}
            </button>
          ))}
          <div style={{ marginTop:"auto", padding:"12px 16px", borderTop:`1px solid ${C.border}` }}>
            {lastScan && <div style={{ fontSize:"10px", color:C.muted }}>Scan: {lastScan}</div>}
          </div>
        </div>

        {/* Main */}
        <div style={g.main}>

          {/* ── CA SCANNER ── */}
          {page==="scanner" && (
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
              <SectionHeader icon="🔍" title="CA Scanner" sub="Scan harga token lintas chain & temukan peluang arbitrasi" />

              {/* Input CA */}
              <div style={g.card}>
                <div style={{ ...g.between, marginBottom:"14px" }}>
                  <div style={{ fontSize:"13px", fontWeight:"800", color:"#fff" }}>Contract Addresses</div>
                  <input value={tokenName} onChange={e=>setTokenName(e.target.value)} placeholder="Nama Token" style={{ ...g.input, width:"130px", textAlign:"center", fontWeight:"700", fontSize:"13px" }} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"10px" }}>
                  {Object.entries(CHAINS_BY_KEY).map(([key,chain]) => (
                    <div key={key} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"10px 12px" }}>
                      <div style={{ ...g.between, marginBottom:"7px" }}>
                        <div style={g.row}>
                          <div style={g.dot(chain.color)} />
                          <span style={{ fontSize:"11px", fontWeight:"700", color:"#fff" }}>{chain.name}</span>
                          <span style={{ fontSize:"9px", color:C.muted }}>({chain.symbol})</span>
                        </div>
                        <div style={g.row}>
                          {scanLoading[key] && <span style={{ fontSize:"10px", color:C.yellow }}>⟳</span>}
                          {scanResults[key]&&!scanResults[key].error && <span style={g.tag(C.green)}>✓</span>}
                          {scanResults[key]?.error && <span style={g.tag(C.red)}>✗</span>}
                        </div>
                      </div>
                      <input value={caInputs[key]||""} onChange={e=>setCaInputs(p=>({...p,[key]:e.target.value}))}
                        placeholder={chain.type==="svm"?"SolanaAddressBase58...":"0x..."} style={{ ...g.input, fontSize:"11px", padding:"7px 10px" }} />
                      {scanResults[key]&&!scanResults[key].error && (
                        <div style={{ marginTop:"7px", display:"flex", gap:"8px", flexWrap:"wrap" }}>
                          <span style={{ fontSize:"12px", fontWeight:"700", color:C.green }}>${fmt(scanResults[key].price)}</span>
                          {scanResults[key].dex && <span style={g.tag(chain.color)}>{scanResults[key].dex}</span>}
                          {scanResults[key].liquidity && <span style={{ fontSize:"10px", color:C.muted }}>Liq: ${(scanResults[key].liquidity/1000).toFixed(1)}K</span>}
                          {scanResults[key].priceChange24h!=null && (
                            <span style={{ fontSize:"10px", color:scanResults[key].priceChange24h>=0?C.green:C.red }}>
                              {scanResults[key].priceChange24h>=0?"▲":"▼"} {Math.abs(scanResults[key].priceChange24h).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ ...g.row, marginTop:"14px" }}>
                  <button style={g.btn("primary",scanning)} onClick={runScan} disabled={scanning}>
                    {scanning?"⟳ Scanning…":"🔍 Scan Semua Chain"}
                  </button>
                  <button style={{ ...g.btn("ghost"), fontSize:"10px" }} onClick={()=>setAutoRefresh(p=>!p)}>
                    {autoRefresh?"⏹ Stop Auto":"▶ Auto 30s"}
                  </button>
                  {autoRefresh && <span style={g.tag(C.green)}>● LIVE</span>}
                </div>
              </div>

              {/* Opportunities */}
              {opportunities.length > 0 && (
                <div style={g.card}>
                  <div style={{ fontSize:"13px", fontWeight:"800", color:"#fff", marginBottom:"12px" }}>
                    ⚡ Peluang Arbitrasi ({opportunities.length})
                  </div>
                  {opportunities.map((opp,i) => {
                    const bc = CHAINS_BY_KEY[opp.buyChain]||CHAINS[opp.buyChain];
                    const sc = CHAINS_BY_KEY[opp.sellChain]||CHAINS[opp.sellChain];
                    const profit = ((opp.sellPrice/opp.buyPrice-1)*100).toFixed(3);
                    return (
                      <div key={i} style={{ ...g.card2, marginBottom:"10px", borderLeft:`3px solid ${opp.spread>5?C.green:opp.spread>2?C.yellow:C.muted}` }}>
                        <div style={g.between}>
                          <div style={g.row}>
                            <span style={g.chip(bc?.color||C.blue)}>BUY {bc?.name||opp.buyChain}</span>
                            <span style={{ color:C.muted, fontSize:"14px" }}>→</span>
                            <span style={g.chip(sc?.color||C.purple)}>SELL {sc?.name||opp.sellChain}</span>
                          </div>
                          <span style={{ ...g.tag(opp.spread>5?C.green:opp.spread>2?C.yellow:C.muted), fontSize:"12px" }}>+{opp.spread}%</span>
                        </div>
                        <div style={{ ...g.row, marginTop:"8px", fontSize:"11px", color:C.muted }}>
                          <span>Beli: <b style={{color:C.green}}>${fmt(opp.buyPrice)}</b></span>
                          <span>|</span>
                          <span>Jual: <b style={{color:C.yellow}}>${fmt(opp.sellPrice)}</b></span>
                          <span>|</span>
                          <span>Profit: <b style={{color:C.green}}>+{profit}%</b></span>
                          {opp.buyLiq && <span>| Liq beli: ${(opp.buyLiq/1000).toFixed(0)}K</span>}
                        </div>
                        <div style={{ ...g.row, marginTop:"10px" }}>
                          {DEXES[opp.buyChain]?.slice(0,1).map(d=>(
                            <button key={d.name} style={g.btn("ghost")} onClick={()=>window.open(d.url(opp.buyCA||""),"_blank")}>
                              Beli di {d.name} ↗
                            </button>
                          ))}
                          {DEXES[opp.sellChain]?.slice(0,1).map(d=>(
                            <button key={d.name} style={g.btn("ghost")} onClick={()=>window.open(d.url(opp.sellCA||""),"_blank")}>
                              Jual di {d.name} ↗
                            </button>
                          ))}
                          <button style={g.btn("purple")} onClick={()=>setBridgeModal(opp)}>🌉 Bridge</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── DEX LINKS ── */}
          {page==="dex" && (
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
              <SectionHeader icon="💱" title="DEX Links" sub="Buka DEX per chain dengan CA yang sudah diisi di Scanner" />
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"12px" }}>
                {Object.entries(DEXES).map(([chainKey, dexList]) => {
                  const c = CHAINS_BY_KEY[chainKey] || CHAINS[chainKey];
                  const ca = caInputs[chainKey];
                  return (
                    <div key={chainKey} style={{ ...g.card, borderTop:`3px solid ${c?.color||C.blue}` }}>
                      <div style={g.row}>
                        <div style={g.dot(c?.color||C.blue)} />
                        <span style={{ fontWeight:"700", fontSize:"13px" }}>{c?.name||chainKey}</span>
                        {!ca && <span style={g.tag(C.yellow)}>CA belum diisi</span>}
                      </div>
                      {ca && <div style={{ fontSize:"10px", color:C.muted, margin:"6px 0", fontFamily:"monospace" }}>{sh(ca)}</div>}
                      {scanResults[chainKey]?.price && (
                        <div style={{ margin:"6px 0", padding:"6px 8px", background:C.surface, borderRadius:"5px" }}>
                          <span style={{ fontWeight:"800", color:C.green }}>${fmt(scanResults[chainKey].price)}</span>
                          <span style={{ fontSize:"10px", color:C.muted, marginLeft:"6px" }}>last scan</span>
                        </div>
                      )}
                      <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginTop:"10px" }}>
                        {dexList.map(d => (
                          <button key={d.name} style={{ ...g.btn("ghost"), textAlign:"left", opacity:ca?1:0.4 }}
                            onClick={() => ca ? window.open(d.url(ca),"_blank") : toast("Isi CA dulu di Scanner","warn")}>
                            {d.name} ↗
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── BRIDGE ── */}
          {page==="bridge" && (
            <div style={{ display:"flex", flexDirection:"column", gap:"16px", maxWidth:"560px" }}>
              <SectionHeader icon="🌉" title="Bridge" sub="Transfer token antar chain via Across Protocol" />
              <div style={g.card}>
                <Steps step={bStep} labels={["Pilih Route","Konfirmasi","Selesai"]} />
                <div style={g.grid2}>
                  <div>
                    <label style={g.label}>DARI CHAIN</label>
                    <select style={g.select} value={bFrom} onChange={e=>{setBFrom(e.target.value);setBStep(0);setBQuote(null);}}>
                      {Object.entries(CHAINS_BY_KEY).filter(([,c])=>c.type==="evm").map(([k,c])=>(
                        <option key={k} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={g.label}>KE CHAIN</label>
                    <select style={g.select} value={bTo} onChange={e=>{setBTo(e.target.value);setBStep(0);setBQuote(null);}}>
                      {Object.entries(CHAINS_BY_KEY).filter(([,c])=>c.type==="evm").map(([k,c])=>(
                        <option key={k} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ ...g.grid2, marginTop:"12px" }}>
                  <div>
                    <label style={g.label}>TOKEN</label>
                    <select style={g.select} value={bToken} onChange={e=>{setBToken(e.target.value);setBStep(0);}}>
                      {["USDC","USDT","WETH"].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={g.label}>JUMLAH</label>
                    <input style={g.input} placeholder="0.00" value={bAmt} onChange={e=>{setBAmt(e.target.value);setBStep(0);}} />
                  </div>
                </div>
                <div style={{ marginTop:"12px" }}>
                  <label style={g.label}>PENERIMA</label>
                  <input style={g.input} placeholder="0x... (kosong = wallet sendiri)" value={bRecip} onChange={e=>setBRecip(e.target.value)} />
                </div>
                {bQuote && (
                  <div style={g.quoteBox}>
                    <div style={{ fontSize:"10px", color:C.muted, marginBottom:"8px" }}>QUOTE ACROSS</div>
                    <div style={g.between}><span style={{ color:C.muted }}>Estimasi diterima</span><b style={{ color:C.green }}>{bQuote.outAmt} {bToken}</b></div>
                    <div style={g.between}><span style={{ color:C.muted }}>Bridge fee</span><span>{bQuote.fee} {bToken}</span></div>
                    <div style={g.between}><span style={{ color:C.muted }}>Estimasi waktu</span><span>{bQuote.eta}</span></div>
                  </div>
                )}
                {bHash && bStep===2 && (
                  <div style={g.successBox}>
                    <div style={{ color:C.green, fontWeight:"700", marginBottom:"6px" }}>✅ Bridge Berhasil!</div>
                    <a href={explorerUrl(Number(bFrom),bHash)} target="_blank" rel="noreferrer" style={{ color:C.blue, fontSize:"11px" }}>Lihat di Explorer ↗</a>
                  </div>
                )}
                <div style={{ ...g.row, marginTop:"14px" }}>
                  {bStep<1 && <button style={g.btn("primary",bLoading||!bAmt)} onClick={getAcrossQuote} disabled={bLoading||!bAmt}>{bLoading?"⟳ Loading…":"Cek Quote"}</button>}
                  {bStep===1 && <button style={g.btn("primary",bLoading)} onClick={execBridge} disabled={bLoading}>{bLoading?"⟳ Proses…":"Eksekusi Bridge"}</button>}
                  {bStep>0 && <button style={g.btn("ghost")} onClick={()=>{setBStep(0);setBQuote(null);setBHash(null);}}>Reset</button>}
                </div>
                <div style={{ marginTop:"14px" }}>
                  <div style={{ fontSize:"10px", color:C.muted, marginBottom:"8px" }}>PILIHAN BRIDGE MANUAL</div>
                  <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                    {BRIDGES.filter(b=>b.supports.includes("evm")).map(b=>(
                      <button key={b.name} style={g.btn("ghost")} onClick={()=>window.open(b.url(bFrom,bTo,bToken,bAmt),"_blank")}>{b.icon} {b.name}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SWAP ── */}
          {page==="swap" && (
            <div style={{ display:"flex", flexDirection:"column", gap:"16px", maxWidth:"560px" }}>
              <SectionHeader icon="⇄" title="Cross-Chain Swap" sub="Swap token lintas chain via deBridge DLN" />
              <div style={g.card}>
                <Steps step={sStep} labels={["Pilih Pair","Konfirmasi","Selesai"]} />
                <div style={g.grid2}>
                  <div>
                    <label style={g.label}>CHAIN ASAL</label>
                    <select style={g.select} value={sFrom} onChange={e=>{setSFrom(e.target.value);setSStep(0);}}>
                      {Object.entries(CHAINS_BY_KEY).filter(([,c])=>c.type==="evm").map(([k,c])=>(
                        <option key={k} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={g.label}>CHAIN TUJUAN</label>
                    <select style={g.select} value={sTo} onChange={e=>{setSTo(e.target.value);setSStep(0);}}>
                      {Object.entries(CHAINS_BY_KEY).filter(([,c])=>c.type==="evm").map(([k,c])=>(
                        <option key={k} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={g.label}>TOKEN ASAL</label>
                    <select style={g.select} value={sFTok} onChange={e=>{setSFTok(e.target.value);setSStep(0);}}>
                      {tokenOpts.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={g.label}>TOKEN TUJUAN</label>
                    <select style={g.select} value={sTTok} onChange={e=>{setSTTok(e.target.value);setSStep(0);}}>
                      {tokenOpts.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop:"12px" }}>
                  <label style={g.label}>JUMLAH</label>
                  <input style={g.input} placeholder="0.00" value={sAmt} onChange={e=>{setSAmt(e.target.value);setSStep(0);}} />
                </div>
                {sQuote && (
                  <div style={g.quoteBox}>
                    <div style={{ fontSize:"10px", color:C.muted, marginBottom:"8px" }}>QUOTE DEBRIDGE</div>
                    <div style={g.between}><span style={{ color:C.muted }}>Estimasi diterima</span><b style={{ color:C.green }}>{sQuote.outAmt} {sTTok}</b></div>
                  </div>
                )}
                {sHash && sStep===2 && (
                  <div style={g.successBox}>
                    <div style={{ color:C.green, fontWeight:"700", marginBottom:"6px" }}>✅ Swap Berhasil!</div>
                    <a href={explorerUrl(Number(sFrom),sHash)} target="_blank" rel="noreferrer" style={{ color:C.blue, fontSize:"11px" }}>Lihat di Explorer ↗</a>
                  </div>
                )}
                <div style={{ ...g.row, marginTop:"14px" }}>
                  {sStep<1 && <button style={g.btn("primary",sLoading||!sAmt)} onClick={getDeBridgeQuote} disabled={sLoading||!sAmt}>{sLoading?"⟳ Loading…":"Cek Quote"}</button>}
                  {sStep===1 && <button style={g.btn("primary",sLoading)} onClick={execSwap} disabled={sLoading}>{sLoading?"⟳ Proses…":"Eksekusi Swap"}</button>}
                  {sStep>0 && <button style={g.btn("ghost")} onClick={()=>{setSStep(0);setSQuote(null);setSHash(null);}}>Reset</button>}
                </div>
              </div>
            </div>
          )}

          {/* ── TRANSFER ── */}
          {page==="transfer" && (
            <div style={{ display:"flex", flexDirection:"column", gap:"16px", maxWidth:"520px" }}>
              <SectionHeader icon="📤" title="Transfer" sub="Kirim token ke alamat lain di chain manapun" />
              <div style={g.card}>
                <Steps step={tStep} labels={["Isi Data","Proses","Selesai"]} />
                <div style={g.grid2}>
                  <div>
                    <label style={g.label}>CHAIN</label>
                    <select style={g.select} value={tChain} onChange={e=>{setTChain(e.target.value);setTStep(0);}}>
                      {Object.entries(CHAINS_BY_KEY).filter(([,c])=>c.type==="evm").map(([k,c])=>(
                        <option key={k} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={g.label}>TOKEN</label>
                    <select style={g.select} value={tTok} onChange={e=>setTTok(e.target.value)}>
                      {tokenOpts.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop:"12px" }}>
                  <label style={g.label}>ALAMAT PENERIMA</label>
                  <input style={g.input} placeholder="0x..." value={tTo} onChange={e=>setTTo(e.target.value)} />
                </div>
                <div style={{ marginTop:"12px" }}>
                  <label style={g.label}>JUMLAH</label>
                  <input style={g.input} placeholder="0.00" value={tAmt} onChange={e=>setTAmt(e.target.value)} />
                </div>
                {tHash && tStep===2 && (
                  <div style={g.successBox}>
                    <div style={{ color:C.green, fontWeight:"700", marginBottom:"6px" }}>✅ Transfer Berhasil!</div>
                    <a href={explorerUrl(Number(tChain),tHash)} target="_blank" rel="noreferrer" style={{ color:C.blue, fontSize:"11px" }}>Lihat di Explorer ↗</a>
                  </div>
                )}
                <div style={{ marginTop:"14px" }}>
                  <button style={g.btn("primary",tLoading||!tTo||!tAmt)} onClick={execTransfer} disabled={tLoading||!tTo||!tAmt}>
                    {tLoading?"⟳ Proses…":"📤 Kirim"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── HISTORY ── */}
          {page==="history" && (
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
              <SectionHeader icon="📋" title="Riwayat" sub="Semua transaksi yang dilakukan di sesi ini" />
              <div style={g.card}>
                {history.length===0 && <div style={{ textAlign:"center", color:C.muted, padding:"32px" }}>Belum ada aktivitas di sesi ini</div>}
                {history.map((h,i)=>(
                  <div key={i} style={{ ...g.between, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                    <div style={g.row}>
                      <span style={g.tag(h.type==="Bridge"?C.purple:h.type==="Swap"?C.blue:C.green)}>{h.type}</span>
                      <span style={{ color:C.muted, fontSize:"11px" }}>{h.detail}</span>
                    </div>
                    <div style={g.row}>
                      <span style={{ fontSize:"10px", color:C.muted }}>{h.ts}</span>
                      {h.hash&&h.hash!=="—" && <a href={explorerUrl(h.chainId,h.hash)} target="_blank" rel="noreferrer" style={{ fontSize:"10px", color:C.blue }}>View ↗</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PANDUAN API ── */}
          {page==="guide" && (
            <div style={{ maxWidth:"680px", display:"flex", flexDirection:"column", gap:"12px" }}>
              <SectionHeader icon="📖" title="Panduan API & Setup" sub="Semua yang perlu kamu setup agar tool ini berjalan dengan data real" />
              {[
                { name:"DexScreener",      color:C.green,  icon:"📊", free:true, note:"Sudah aktif — tidak perlu setup",     steps:["Tidak perlu API key","Sudah dipakai tool ini untuk harga real-time","Rate limit: ~300 req/menit gratis","Docs: docs.dexscreener.com"] },
                { name:"Across Protocol",  color:C.blue,   icon:"🌉", free:true, note:"Sudah aktif di fitur Bridge",         steps:["Tidak perlu API key","Public endpoint: app.across.to/api/suggested-fees","Support: USDC, USDT, WETH di EVM chains","Docs: docs.across.to"] },
                { name:"deBridge DLN",     color:C.purple, icon:"🔗", free:true, note:"Sudah aktif di fitur Swap",           steps:["Tidak perlu API key — public REST API","Endpoint: api.dln.trade/v1.0/dln","Support: semua EVM + Solana","Docs: docs.debridge.finance"] },
                { name:"1inch Swap API",   color:C.blue,   icon:"🦋", free:true, note:"Untuk swap onchain 1 chain",          steps:["Daftar di portal.1inch.dev","Buat project → copy API key","Gratis 100K req/bulan","Endpoint: api.1inch.dev/swap/v6.0/{chainId}/swap"] },
                { name:"Mayan SDK",        color:"#9945FF",icon:"🔱", free:true, note:"Solana ↔ EVM bridge terbaik",         steps:["npm install @mayanfinance/swap-sdk","Tidak perlu API key","Support Solana ↔ EVM","Docs: mayan.finance/docs"] },
                { name:"Alchemy RPC",      color:C.yellow, icon:"⚡", free:true, note:"Untuk baca data onchain real-time",   steps:["Daftar di alchemy.com","Buat App → pilih chain","Copy RPC URL → tambah ke MetaMask","Gratis 300M CU/bulan"] },
                { name:"Tambah Chain Manual", color:C.orange, icon:"🦊", free:true, note:"Wajib untuk Nesa & HyperEVM",     steps:["MetaMask → Settings → Networks → Add Network","Nesa: ChainID 41443, RPC: explorer.nesa.ai","HyperEVM: ChainID 999, RPC: hyperliquid.xyz/docs","Solana: Install Phantom Wallet terpisah"] },
              ].map(item=>(
                <div key={item.name} style={{ ...g.card, borderLeft:`3px solid ${item.color}` }}>
                  <div style={{ ...g.between, marginBottom:"10px" }}>
                    <div style={g.row}>
                      <span style={{ fontSize:"18px" }}>{item.icon}</span>
                      <span style={{ fontWeight:"800", color:"#fff" }}>{item.name}</span>
                      {item.free && <span style={g.tag(C.green)}>FREE</span>}
                      <span style={{ fontSize:"10px", color:item.color }}>{item.note}</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
                    {item.steps.map((s,i)=>(
                      <div key={i} style={{ display:"flex", gap:"8px", fontSize:"11px" }}>
                        <span style={{ color:item.color, flexShrink:0 }}>{i+1}.</span>
                        <span style={{ color:C.muted }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ ...g.card, background:`${C.yellow}08`, border:`1px solid ${C.yellow}25` }}>
                <div style={{ fontWeight:"700", color:C.yellow, marginBottom:"8px" }}>⚠️ Checklist sebelum trading</div>
                {["MetaMask ter-install di browser","Wallet sudah connect ke tool ini","Saldo gas (ETH/BNB/dll) ada di tiap chain yang dipakai","Untuk Nesa & HyperEVM: tambah network manual di MetaMask","Untuk Solana: gunakan Phantom, bukan MetaMask","Test dengan jumlah kecil dulu"].map((item,i)=>(
                  <div key={i} style={{ ...g.row, marginBottom:"5px", fontSize:"11px", color:C.muted }}>
                    <span style={{ color:C.green }}>□</span><span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

