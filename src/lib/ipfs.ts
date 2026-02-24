import axios from "axios";

// Shared Pinata configuration used for all IPFS helpers in this app.
export const PINATA_GATEWAY = "https://gateway.pinata.cloud";
const PINATA_API = "https://api.pinata.cloud";

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY as string | undefined;
// Support both the new SECRET_API_KEY name and the original SECRET_KEY name.
const PINATA_SECRET_KEY =
  (import.meta.env.VITE_PINATA_SECRET_API_KEY as string | undefined) ??
  (import.meta.env.VITE_PINATA_SECRET_KEY as string | undefined);
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string | undefined;

/**
 * Minimal screening evidence shape used by existing blockchain demo flow.
 * Kept for backwards compatibility.
 */
export interface ScreeningEvidence {
  medgemmaRaw: unknown;
  transcript: string;
  imageEmbeddings: number[][];
  timestamp: number;
  childAgeMonths: number;
}

/**
 * Rich medical evidence payload for HIPAA-grade storage on IPFS.
 * This is the preferred shape for new flows.
 */
export interface MedicalEvidence {
  screeningId: string;
  childAgeMonths: number;
  medgemmaOutput: {
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    confidence: number;
    keyFindings: string[];
    recommendations: string[];
    rawInference: string;
  };
  evidenceArtifacts: {
    transcript: string;
    imageEmbeddings: number[][]; // e.g. MedSigLIP 1x768
    audioFeatures?: number[]; // optional Whisper-style features
    timestamp: number;
  };
  metadata: {
    medgemmaVersion: string;
    chwAddress: string;
    parentWallet: string;
    hash: string; // SHA3-256 or similar hash of evidence
  };
}

function assertPinataCredentials(): void {
  if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_SECRET_KEY)) {
    throw new Error(
      "Pinata credentials not configured. Set VITE_PINATA_JWT or VITE_PINATA_API_KEY/VITE_PINATA_SECRET_API_KEY.",
    );
  }
}

/**
 * Upload structured screening evidence to IPFS via Pinata.
 * Returns an ipfs://CID URI string on success.
 *
 * This is kept for existing callers; new flows should prefer uploadMedicalEvidence
 * for richer, typed payloads.
 */
export async function uploadScreeningToIPFS(
  evidence: ScreeningEvidence,
): Promise<string> {
  assertPinataCredentials();

  const metadata = {
    name: `PediScreen-${evidence.timestamp}`,
    keyvalues: {
      screeningType: "developmental",
      medgemmaVersion: "4b-pt-v1",
      childAge: evidence.childAgeMonths,
    },
  };

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([JSON.stringify(evidence)], { type: "application/json" }),
    "evidence.json",
  );
  formData.append("pinataMetadata", JSON.stringify(metadata));

  const response = await axios.post(
    `${PINATA_API}/pinning/pinFileToIPFS`,
    formData,
    {
      headers: {
        ...(PINATA_JWT ? { Authorization: `Bearer ${PINATA_JWT}` } : {}),
        ...(PINATA_API_KEY
          ? {
              pinata_api_key: PINATA_API_KEY,
            }
          : {}),
        ...(PINATA_SECRET_KEY
          ? {
              pinata_secret_api_key: PINATA_SECRET_KEY,
            }
          : {}),
      },
    },
  );

  if (!response.data?.IpfsHash) {
    throw new Error("Pinata response missing IpfsHash");
  }

  return `ipfs://${response.data.IpfsHash as string}`;
}

/**
 * Upload a full medical evidence bundle to IPFS via Pinata.
 * Returns the CID, public gateway URL, and pin size.
 */
export async function uploadMedicalEvidence(
  evidence: MedicalEvidence,
): Promise<{ ipfsHash: string; gatewayUrl: string; size: number }> {
  assertPinataCredentials();

  // Deterministic metadata for indexers and future NFT metadata.
  const metadata = {
    name: `PediScreen-${evidence.screeningId}`,
    keyvalues: {
      screeningType: "developmental",
      riskLevel: evidence.medgemmaOutput.riskLevel,
      medgemmaVersion: evidence.metadata.medgemmaVersion,
      childAge: evidence.childAgeMonths,
      verified: false, // Can be flipped by Chainlink oracle or backend once validated
    },
  };

  const evidenceBlob = new Blob([JSON.stringify(evidence, null, 2)], {
    type: "application/json",
  });
  const metadataBlob = new Blob([JSON.stringify(metadata)], {
    type: "application/json",
  });

  const formData = new FormData();
  formData.append(
    "file",
    evidenceBlob,
    `evidence-${evidence.screeningId}.json`,
  );
  formData.append("pinataMetadata", metadataBlob);

  const response = await axios.post(
    `${PINATA_API}/pinning/pinFileToIPFS`,
    formData,
    {
      headers: {
        ...(PINATA_JWT ? { Authorization: `Bearer ${PINATA_JWT}` } : {}),
        ...(PINATA_API_KEY
          ? {
              pinata_api_key: PINATA_API_KEY,
            }
          : {}),
        ...(PINATA_SECRET_KEY
          ? {
              pinata_secret_api_key: PINATA_SECRET_KEY,
            }
          : {}),
      },
    },
  );

  const ipfsHash = response.data?.IpfsHash as string | undefined;
  const size = (response.data?.PinSize as number | undefined) ?? 0;

  if (!ipfsHash) {
    throw new Error("Pinata response missing IpfsHash");
  }

  return {
    ipfsHash,
    gatewayUrl: `${PINATA_GATEWAY}/ipfs/${ipfsHash}`,
    size,
  };
}

/**
 * Lightweight verification that a CID is resolvable via the Pinata gateway.
 */
export async function verifyIPFSContent(ipfsHash: string): Promise<boolean> {
  if (!ipfsHash) return false;

  try {
    const response = await axios.get(`${PINATA_GATEWAY}/ipfs/${ipfsHash}`, {
      timeout: 5000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

