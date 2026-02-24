/**
 * PediScreen Oracle — read Chainlink-verified screening results from Polygon.
 * Frontend focuses on read/subscribe; backend + Chainlink Functions handle writes.
 */

import { BrowserProvider, Contract, type Provider } from "ethers";
import { PEDISCREEN_ORACLE_ADDRESS } from "@/config/blockchain";

const getBrowserProviderClass = (): new (p: unknown) => Provider =>
  BrowserProvider;

const ORACLE_ABI = [
  // Screening record storage
  "function screenings(uint256 screeningId) view returns (string childId, uint8 riskLevel, uint16 confidence, string ipfsCid, bool verified, uint256 timestamp)",
  // Emitted by Chainlink Functions/Automation when a screening is verified
  "event ScreeningVerified(uint256 indexed screeningId, string childId, uint8 riskLevel, uint16 confidence, string ipfsCid, uint256 timestamp)",
] as const;

export type OracleRiskLevel = 0 | 1 | 2; // 0 = low, 1 = medium, 2 = high

export interface OracleScreeningRecord {
  screeningId: bigint;
  childId: string;
  riskLevel: OracleRiskLevel;
  /** Confidence in basis points (0–10000) */
  confidenceBps: number;
  /** Confidence as 0–1 float */
  confidence: number;
  ipfsCid: string;
  verified: boolean;
  timestamp: number;
}

function ensureOracleConfigured() {
  if (!PEDISCREEN_ORACLE_ADDRESS) {
    throw new Error("PediScreen Oracle not configured (set VITE_PEDISCREEN_ORACLE_ADDRESS).");
  }
}

async function getReadOnlyContract(): Promise<Contract> {
  ensureOracleConfigured();
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Web3 wallet not available in this environment.");
  }

  const ProviderClass = getBrowserProviderClass();
  const provider = new ProviderClass(window.ethereum);
  return new Contract(PEDISCREEN_ORACLE_ADDRESS, ORACLE_ABI, provider);
}

function normalizeRecord(
  screeningId: bigint,
  tuple: [string, bigint, bigint, string, boolean, bigint],
): OracleScreeningRecord {
  const [childId, riskLevel, confidence, ipfsCid, verified, timestamp] = tuple;
  const confidenceBps = Number(confidence);
  return {
    screeningId,
    childId,
    riskLevel: Number(riskLevel) as OracleRiskLevel,
    confidenceBps,
    confidence: confidenceBps / 10_000,
    ipfsCid,
    verified,
    timestamp: Number(timestamp),
  };
}

export async function fetchOracleRecord(
  screeningId: number | bigint,
): Promise<OracleScreeningRecord | null> {
  const id = BigInt(screeningId);
  const contract = await getReadOnlyContract();

  const tuple = (await contract.screenings(id)) as [
    string,
    bigint,
    bigint,
    string,
    boolean,
    bigint,
  ];

  const record = normalizeRecord(id, tuple);
  // If nothing has been written yet, many contracts will return default values.
  if (!record.verified && !record.childId && !record.ipfsCid) {
    return null;
  }
  return record;
}

/**
 * Subscribe to ScreeningVerified events. Returns an unsubscribe function.
 * Optionally filters to a specific screeningId.
 */
export async function watchOracleVerifications(
  onEvent: (record: OracleScreeningRecord) => void,
  filterScreeningId?: number | bigint,
): Promise<() => void> {
  const contract = await getReadOnlyContract();
  const filterId = filterScreeningId != null ? BigInt(filterScreeningId) : undefined;

  const handler = (
    screeningId: bigint,
    childId: string,
    riskLevel: bigint,
    confidence: bigint,
    ipfsCid: string,
    timestamp: bigint,
  ) => {
    if (filterId != null && screeningId !== filterId) return;
    const record = normalizeRecord(screeningId, [
      childId,
      riskLevel,
      confidence,
      ipfsCid,
      true,
      timestamp,
    ]);
    onEvent(record);
  };

  contract.on("ScreeningVerified", handler);

  return () => {
    contract.off("ScreeningVerified", handler);
  };
}

