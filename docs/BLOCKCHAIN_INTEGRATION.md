# Blockchain integration

PediScreen uses on-chain/off-chain records for HIPAA-compliant screening hashes, consent, audit trail, NFT screening records, USDC micropayments, and federated learning rewards.

## Contracts

| Contract | Purpose |
|----------|---------|
| `contracts/PediScreenRecords.sol` | HIPAA screening records (hashes only), consent, audit |
| `contracts/PediScreenGovernor.sol`, `contracts/PSDAOToken.sol` | DAO + timelock governance |
| `contracts/PediScreenRegistry.sol` | Hash-only screening registry: `recordScreening(screeningIdHash, reportHash)` for tamper-proof audit (no PHI on-chain) |
| `contracts/PaymentEscrow.sol` | USDC micropayments |
| `contracts/HealthChainPOC.sol` | Base L2 patient data exchange (encrypted FHIR → IPFS, consent manager) |
| `contracts/PediScreenFedCoordinator.sol`, `contracts/PEDIRewardToken.sol` | Federated learning: register, submit gradient hashes, earn $PEDI |

Deploy:

- **Polygon Amoy:** `npx hardhat run scripts/deploy-blockchain.js --network polygonAmoy`
- **HealthChain (Base Sepolia):** `npx hardhat run scripts/deployHealthChain.js --network base-sepolia`
- **Federated:** `npx hardhat run scripts/deploy-federated.js --network polygonAmoy`

## Main app (Lovable / root `src/`)

- **Config:** `src/config/blockchain.ts` — contract addresses and chain ID from env (`VITE_*`).
- **Hooks:** `src/hooks/usePediScreenWallet.ts`, `src/blockchain/usePediScreenRegistry.ts`, `useHealthChain.ts`, `useFedLearning.ts` — wallet connect, hash registry (record/verify), HealthChain, federated.
- **Services:** `src/services/healthChain.ts` — encrypt/decrypt FHIR, IPFS stub, record hash, build HealthChain payload. `screeningApi` passes through optional `blockchain` hints from backend.
- **Components:** `src/components/blockchain/` — ConnectWalletButton, **BlockchainAnchorCard** (anchor screening hash on-chain + verify), ScreeningResultBlockchain, FedLearningClient, VerifyHealthChainRecord.

Set env (see `.env.example`) then use components in screens; optional WagmiProvider when wagmi is installed.

### Where blockchain appears in the UI

- **Results screen** (`/pediscreen/results`): **BlockchainAnchorCard** — connect wallet, anchor screening (screeningIdHash + reportHash) via `PediScreenRegistry.recordScreening`, and verify against chain. Uses backend-provided `blockchain` hints when `/api/analyze` returns `blockchain: { screeningIdHash, reportHash, chainId, registryAddress }`; otherwise shows "Backend has not provided blockchain hashes". Optional: ScreeningResultBlockchain for NFT mint when configured.
- **PediScreen layout (header):** ConnectWalletButton in the top bar (desktop) so users can connect wallet from any PediScreen page.
- **Settings:** "Blockchain" tab with wallet connect, FedLearningClient (register client, submit gradient hashes), and a note when blockchain env is not configured.

## DAO frontend

Full governance UI (proposals, voting, timelock) lives in **pediscreen-dao-frontend/** with wagmi + DAOContext. Main app stays wallet-agnostic; for DAO flows use that app or add wagmi to the main app.

## Supabase: verify-screening

**Function:** `supabase/functions/verify-screening/index.ts`

**Purpose:** Verify a screening by tokenId, aiReportHash, or screeningId (database or future on-chain).

**Request:** `GET /verify-screening?tokenId=123` or `?aiReportHash=0x...` or `?screeningId=...`

**Response:** JSON with `verified`, `source` (`database` | `on_chain` | `not_found`), `screeningId`, `aiReportHash`, `tokenId`, optional `message`. When `screeningId` or matching `aiReportHash` is found in the `screenings` table, `verified` is true and `source` is `database`. For on-chain verification, set env `HEALTH_CHAIN_POC_ADDRESS` and `HEALTH_CHAIN_POC_RPC_URL` (implementation can be extended to call the contract).

Deploy: `supabase functions deploy verify-screening`

## Tests

- **HealthChain (Hardhat):** `npm run test:healthchain` — runs `npx hardhat test test/HealthChainPOC.test.js` (CHW create record, grant consent, clinic access, verify, revoke). Requires Hardhat and contract deps at repo root.

## Hash-only screening registry (PediScreenRegistry.sol)

- **Contract:** `contracts/PediScreenRegistry.sol` — stores `screeningIdHash` (keccak256(screeningId)) and `reportHash` (keccak256(canonical JSON report)); no PHI on-chain.
- **Frontend:** `BlockchainAnchorCard` uses `usePediScreenRegistry` (ethers) with `VITE_REGISTRY_ADDRESS` and `VITE_CHAIN_ID`. Connect wallet → Anchor on-chain → Verify against chain.
- **Backend:** When returning a screening, include `blockchain: { screeningIdHash, reportHash, chainId?, registryAddress? }` (e.g. from your `/api/analyze` response). Compute hashes with the same canonicalization as the contract (keccak256 of screening_id string and of canonical JSON report).
- **Deploy:** `npx hardhat run scripts/deploy-registry.js --network polygonAmoy` (or `mumbai` for Polygon Mumbai). Set `VITE_REGISTRY_ADDRESS` and `VITE_CHAIN_ID` in `.env`.

## Wiring contract calls (optional)

- **PediScreenRegistry (hash-only):** Wired in `usePediScreenRegistry` and `BlockchainAnchorCard` — `recordScreening`, `getScreening`, `exists`.
- **useHealthChain:** call HealthChainPOC `createPatientRecord`, `getRecord`, `grantConsent`, `revokeConsent` (see `test/HealthChainPOC.test.js`).
- **useFedLearning:** call PediScreenFedCoordinator `register` / `submitGradientHash` and PEDIRewardToken `balanceOf`.
- **ScreeningResultBlockchain:** optional NFT mint (PediScreenRegistry ERC721 or similar) with screening metadata and aiReportHash.

See `pediscreen-dao-frontend` for a full wagmi + contract integration example.
