# PediScreen AI DApp — NFT Consent Integration

React/Next.js + Wagmi + RainbowKit + Polygon. Production-ready flow: X-Ray → MedGemma → Consent NFT → patient ownership.

## Flow

1. **Analysis (~2.1s)** — Upload X-ray → encrypted IPFS (QmHash).
2. **Consent** — Patient signs consent → NFT minted to wallet.
3. **Access** — Doctor requests access → on-chain verification.
4. **Revoke** — Patient can revoke anytime → global enforcement.

## Setup

```bash
cd pediscreen-dapp
cp .env.example .env.local
# Set NEXT_PUBLIC_WALLETCONNECT_ID, NEXT_PUBLIC_CONSENT_NFT, optional PINATA/ALCHEMY
npm install
npm run dev
```

## Deploy contract first

From repo root (contracts):

```bash
# Deploy ConsentNFT to Polygon Amoy (or Mumbai)
npx hardhat run scripts/deploy-consent-nft.js --network polygonAmoy
# Set NEXT_PUBLIC_CONSENT_NFT in .env.local
```

## Env vars

- `NEXT_PUBLIC_WALLETCONNECT_ID` — [WalletConnect Cloud](https://cloud.walletconnect.com)
- `NEXT_PUBLIC_CONSENT_NFT` — Deployed ConsentNFT address
- `NEXT_PUBLIC_PINATA_JWT` — Optional; for real IPFS pinning (dev uses placeholder hashes)
- `NEXT_PUBLIC_ALCHEMY_KEY` — Optional; for custom RPC

## User flow (2-tap)

1. Upload X-ray → MedGemma analysis.
2. “Create record” → Consent modal → Sign.
3. “NFT minted” → Owns medical record.
4. “Share with Dr. Smith” → 30-day access.
5. “Revoke access” → Instant enforcement.
