# Blockchain integration

PediScreen uses on-chain/off-chain records for HIPAA-compliant screening hashes, consent, audit trail, NFT screening records, USDC micropayments, and federated learning rewards.

## Contracts

| Contract | Purpose |
|----------|---------|
| `contracts/PediScreenRecords.sol` | HIPAA screening records (hashes only), consent, audit |
| `contracts/PediScreenGovernor.sol`, `contracts/PSDAOToken.sol` | DAO + timelock governance |
| `contracts/PediScreenRegistry.sol` | ERC721 screening NFTs |
| `contracts/PaymentEscrow.sol` | USDC micropayments |
| `contracts/HealthChainPOC.sol` | Base L2 patient data exchange (encrypted FHIR → IPFS, consent manager) |
| `contracts/PediScreenFedCoordinator.sol`, `contracts/PEDIRewardToken.sol` | Federated learning: register, submit gradient hashes, earn $PEDI |

Deploy:

- **Polygon Amoy:** `npx hardhat run scripts/deploy-blockchain.js --network polygonAmoy`
- **HealthChain (Base Sepolia):** `npx hardhat run scripts/deployHealthChain.js --network base-sepolia`
- **Federated:** `npx hardhat run scripts/deploy-federated.js --network polygonAmoy`

## Main app (Lovable / root `src/`)

- **Config:** `src/config/blockchain.ts` — contract addresses and chain ID from env (`VITE_*`).
- **Hooks:** `src/hooks/usePediScreenWallet.ts`, `useHealthChain.ts`, `useFedLearning.ts` — wallet connect (window.ethereum), HealthChain submit/grant/verify, federated register/submit.
- **Services:** `src/services/healthChain.ts` — encrypt/decrypt FHIR, IPFS stub, record hash, build HealthChain payload.
- **Components:** `src/components/blockchain/` — ConnectWalletButton, ScreeningResultBlockchain, FedLearningClient, VerifyHealthChainRecord.

Set env (see `.env.example`) then use components in screens; optional WagmiProvider when wagmi is installed.

## DAO frontend

Full governance UI (proposals, voting, timelock) lives in **pediscreen-dao-frontend/** with wagmi + DAOContext. Main app stays wallet-agnostic; for DAO flows use that app or add wagmi to the main app.

## Supabase

`supabase/functions/verify-screening` — verify on-chain screening by tokenId/aiReportHash.

## Tests

- HealthChain: `npm run test:healthchain` (CHW create record, grant consent, clinic access, verify, revoke).
