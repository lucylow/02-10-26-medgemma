# PediScreen DAO Frontend

React + Vite + Wagmi + RainbowKit DAO dashboard with **timelock support** for PediScreen AI governance (payment rate proposals, voting, queue, execute).

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local with deployed contract addresses (see repo root: npm run deploy-dao --network polygonAmoy)
```

## Run

```bash
npm run dev
```

## Build & deploy

```bash
npm run build
npm run preview   # local preview
# Deploy dist/ to Vercel, Netlify, etc.
```

## Env (from deploy-dao output)

| Variable | Description |
|----------|-------------|
| `VITE_PEDISCREEN_DAO_ADDRESS` | PediScreenDAO governor |
| `VITE_PSDAO_TOKEN_ADDRESS` | PSDAOToken (governance token) |
| `VITE_PEDISCREEN_TREASURY_ADDRESS` | PediScreenTreasury (USDC) |
| `VITE_TIMELOCK_ADDRESS` | TimelockController (e.g. 2 days) |
| `VITE_WALLETCONNECT_PROJECT_ID` | Optional WalletConnect project ID |
| `VITE_CHAIN_ID` | 80002 (Amoy) or 137 (Polygon) |

## Features

- **Voting power**: PSDAO balance + delegate to self
- **Propose payment rate**: USDC per screening (6 decimals)
- **Vote**: For / Against on proposals
- **Queue & execute**: After vote succeeds, queue then execute after timelock
- **Timelock status**: Shows delay and treasury/timelock addresses
