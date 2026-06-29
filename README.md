# ⚡ ARBX — Non-Custodial Multi-Chain Arbitrage Dashboard

> A pixel-art (8-bit) crypto arbitrage scanner and trading dashboard.
> **100% non-custodial** — ARBX never stores your funds, private keys, or seed phrases.

ARBX scans token prices across multiple chains and DEXes in real time, detects
arbitrage opportunities, estimates net profit after fees, and lets you swap,
bridge, and transfer — all signed directly from your own wallet (MetaMask).

---

## ✨ Features

### 🔍 Scanner
- Scan a token's contract address across multiple chains at once
- Paste from clipboard, import from TXT/CSV, export results to CSV/Excel
- Favorite tokens, progress bar, cancel scan, retry failed, scan history

### 📊 Arbitrage Engine
- Net profit after **gas + bridge fee + swap fee**
- Liquidity / volume score, slippage & price-impact estimates
- Confidence / risk score, minimum-profit filter
- **Best route recommendation**

### 🌉 Bridge
- Compare bridges by **Cheapest / Fastest / Safest**
- Estimated fee & time, copy URL, open all
- Supported: deBridge, Wormhole, Mayan, Across, Stargate, Symbiosis

### 🔄 Swap
- 25% / Half / Max amount helpers, reverse direction
- Slippage control, price impact, minimum received, route preview
- Powered by deBridge DLN (cross-chain, EVM)

### 💸 Transfer
- Max amount, paste address, address book, recent addresses
- ENS support and address validation (EVM & Solana)

### 👛 Wallet
- Connection status, native balance, network status & wrong-network warning
- Switch network, copy address, **Disconnect Session** (clears local state only)

### 🕓 History
- Search, filter, export CSV/Excel, copy hash, open in explorer, clear

### ⚙️ Settings
- Theme (dark/light), language, refresh interval
- Notifications, profit threshold, gas preference, API settings

### 🔔 Notifications
- Desktop notifications, Telegram bot, Discord webhook, sound alerts

---

## 🔗 Supported Chains

Ethereum · BSC · Base · Arbitrum · Polygon · Avalanche · HyperEVM · Nesa · Solana*

> \*Solana is supported for **scanning and bridging**. In-app swaps are
> EVM-only (signed via MetaMask). Solana swap support requires a Solana
> wallet (e.g. Phantom) integration, which is not yet included.

---

## 🛡️ Security & Non-Custodial Design

ARBX is built to be safe by design:

- **Never** asks for or stores private keys or seed phrases
- **No** custodial logic, internal balances, or fund storage
- All transactions are signed in **your own wallet**
- "Disconnect Session" only clears local app state — your wallet stays intact
- A confirmation screen is shown **before** every signing request
- Input sanitization, address validation, and duplicate-contract detection
- Request timeouts (AbortController), retry with exponential backoff, and rate limiting
- Local caching, offline detection, and an error boundary for stability

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Web3 wallet (e.g. MetaMask)

### Installation
\`\`\`bash
# Clone the repository
git clone https://github.com/kunlokx/ARBX.git
cd ARBX

# Install dependencies
npm install

# Run the development server
npm run dev
\`\`\`

### Build for production
\`\`\`bash
npm run build
\`\`\`

---

## 🧩 Tech & Data Sources

- **Frontend:** React (single-file `App.jsx`)
- **Prices:** DexScreener API (free, no API key required)
- **Swaps:** deBridge DLN API (no API key required)
- **ENS:** public ENS resolver

---

## ⚠️ Disclaimer

ARBX is a tool for research and convenience. It is **not financial advice**.
Crypto trading, arbitrage, and bridging carry significant risk, including
total loss of funds. Profit estimates are approximations and may differ from
actual results due to slippage, gas, MEV, and liquidity changes. Always do
your own research (DYOR) and verify every transaction before signing.

---

## 📜 License

Add your preferred license here (e.g. MIT).
