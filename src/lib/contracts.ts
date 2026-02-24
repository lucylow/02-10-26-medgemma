import { BrowserProvider, Contract } from "ethers";

import { PEDISCREEN_REGISTRY_ADDRESS } from "@/config/blockchain";

export const PEDISCREEN_NFT_ADDRESS =
  (import.meta.env.VITE_PEDISCREEN_NFT_ADDRESS as string | undefined) ||
  PEDISCREEN_REGISTRY_ADDRESS ||
  // Fallback demo address (Polygon) used in AccessibleNFTGallery links.
  "0x742d35Cc6b6DBcF823d80ADa7017a40A9D0e6637";

// Minimal ABI fragment for a custom screening NFT contract.
// The actual deployed contract may include additional methods/events;
// this fragment is intentionally small for frontend minting.
export const PEDISCREEN_NFT_ABI = [
  "function mint(address to, uint256 screeningId, string ipfsCID, uint8 riskLevel) external returns (uint256)",
  "event ScreeningMinted(uint256 indexed tokenId, address indexed parent, string ipfsCID, uint8 riskLevel)",
] as const;

export const RISK_LEVELS = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
} as const;

export type RiskLevelKey = keyof typeof RISK_LEVELS;

export interface ScreeningNFTMetadata {
  screeningId: string;
  childAgeMonths: number;
  riskLevel: RiskLevelKey;
  confidence: number;
  keyFindings: string[];
  recommendations: string[];
  evidenceHash: string;
  medgemmaVersion: string;
  ipfsCID: string;
  timestamp: number;
  chwAddress: string;
}

type Eip1193ProviderLike = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getBrowserProvider(windowEthereum: unknown): BrowserProvider {
  return new BrowserProvider(windowEthereum as Eip1193ProviderLike);
}

/**
 * Mint a screening NFT on-chain using the connected browser wallet.
 * Returns the minted tokenId and transaction hash.
 */
export async function mintScreeningNFT(
  screening: ScreeningNFTMetadata,
): Promise<{ tokenId: number; txHash: string }> {
  if (typeof window === "undefined") {
    throw new Error("Window is not available");
  }

  const win = window as unknown as { ethereum?: unknown };
  if (!win.ethereum) {
    throw new Error("No Ethereum provider found. Install MetaMask or a Web3 wallet.");
  }

  if (!PEDISCREEN_NFT_ADDRESS) {
    throw new Error(
      "PEDISCREEN_NFT_ADDRESS is not configured. Set VITE_PEDISCREEN_NFT_ADDRESS or VITE_PEDISCREEN_REGISTRY_ADDRESS.",
    );
  }

  const provider = getBrowserProvider(win.ethereum);
  const signer = await provider.getSigner();
  const contract = new Contract(
    PEDISCREEN_NFT_ADDRESS,
    PEDISCREEN_NFT_ABI,
    signer,
  );

  const riskLevelValue = RISK_LEVELS[screening.riskLevel];

  const tx = await contract.mint(
    screening.chwAddress,
    BigInt(screening.screeningId),
    screening.ipfsCID,
    riskLevelValue,
  );

  const receipt = await tx.wait();

  type ScreeningMintedLog = {
    name: string;
    args?: { tokenId?: bigint | number };
  };

  const event = receipt.logs
    .map((log: unknown): ScreeningMintedLog | null => {
      try {
        return contract.interface.parseLog(log as { topics: string[]; data: string }) as ScreeningMintedLog;
      } catch {
        return null;
      }
    })
    .find((e): e is ScreeningMintedLog => !!e && e.name === "ScreeningMinted");

  const tokenId =
    (event?.args?.tokenId != null
      ? Number(event.args.tokenId)
      : undefined) ?? 0;

  return {
    tokenId,
    txHash: (receipt as { hash?: string; transactionHash?: string }).hash ??
      (receipt as { transactionHash?: string }).transactionHash ??
      "",
  };
}

