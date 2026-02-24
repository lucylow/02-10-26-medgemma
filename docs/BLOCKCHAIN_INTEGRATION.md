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

### Where blockchain appears in the UI

- **Results screen** (`/pediscreen/results`): After a screening, an "On-chain record" card shows ConnectWalletButton and ScreeningResultBlockchain (hash + optional mint NFT). Report hash is computed client-side from the result report when `report` is passed.
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

## Wiring contract calls (optional)

The hooks currently stub contract interactions (TODOs in code). To wire real reads/writes:

1. Add **viem** (or ethers) and use `publicClient.readContract` / `walletClient.writeContract` with ABIs from `artifacts/contracts/.../...json`.
2. In `useHealthChain`: call HealthChainPOC `createPatientRecord`, `getRecord`, `grantConsent`, `revokeConsent` (see `test/HealthChainPOC.test.js` for signatures).
3. In `useFedLearning`: call PediScreenFedCoordinator `register` / `submitGradientHash` and PEDIRewardToken `balanceOf`.
4. In `ScreeningResultBlockchain`: call PediScreenRegistry mint (or batchMint) with screening metadata and aiReportHash.

See `pediscreen-dao-frontend` for a full wagmi + contract integration example.
