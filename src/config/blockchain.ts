/**
 * PediScreen — blockchain contract addresses and chain config (env-driven).
 * Used by main app for HIPAA records, NFT registry, HealthChain POC, and federated learning.
 * For full DAO governance UI, see pediscreen-dao-frontend/ (wagmi + DAOContext).
 */

/** Polygon Amoy (80002) registry & escrow; set via deploy-blockchain.js */
export const PEDISCREEN_REGISTRY_ADDRESS =
  (import.meta.env.VITE_PEDISCREEN_REGISTRY_ADDRESS as string) || "";
export const PAYMENT_ESCROW_ADDRESS =
  (import.meta.env.VITE_PAYMENT_ESCROW_ADDRESS as string) || "";
/** HIPAA records (hashes only), consent, audit */
export const PEDISCREEN_RECORDS_ADDRESS =
  (import.meta.env.VITE_PEDISCREEN_RECORDS_ADDRESS as string) || "";
/** Chainlink-powered oracle for verified PediScreen AI results */
export const PEDISCREEN_ORACLE_ADDRESS =
  (import.meta.env.VITE_PEDISCREEN_ORACLE_ADDRESS as string) || "";
/** HealthChain POC — Base L2 patient data exchange */
export const HEALTH_CHAIN_POC_ADDRESS =
  (import.meta.env.VITE_HEALTH_CHAIN_POC_ADDRESS as string) || "";
/** Federated learning coordinator (Polygon Amoy) */
export const FED_COORDINATOR_ADDRESS =
  (import.meta.env.VITE_FED_COORDINATOR_ADDRESS as string) || "";
export const PEDI_REWARD_TOKEN_ADDRESS =
  (import.meta.env.VITE_PEDI_REWARD_TOKEN_ADDRESS as string) || "";

/** Chain ID: 80002 = Polygon Amoy, 84532 = Base Sepolia, 8453 = Base Mainnet */
export const CHAIN_ID = parseInt(
  (import.meta.env.VITE_CHAIN_ID as string) || "80002",
  10
);

export function getChainRpcUrl(chainId: number): string {
  const env = import.meta.env.VITE_POLYGON_RPC_URL as string | undefined;
  if (env) return env;
  switch (chainId) {
    case 137:
      return "https://polygon-rpc.com";
    case 80002:
      return "https://rpc.ankr.com/polygon_amoy";
    case 80001:
      return "https://rpc.ankr.com/polygon_mumbai";
    case 8453:
      return "https://mainnet.base.org";
    case 84532:
      return "https://sepolia.base.org";
    default:
      return "https://polygon-rpc.com";
  }
}

export const isBlockchainConfigured =
  !!(
    PEDISCREEN_REGISTRY_ADDRESS ||
    PEDISCREEN_RECORDS_ADDRESS ||
    HEALTH_CHAIN_POC_ADDRESS ||
    PEDISCREEN_ORACLE_ADDRESS ||
    FED_COORDINATOR_ADDRESS
  );
