/**
 * HealthChain POC — encrypt/decrypt FHIR, IPFS, record hash/signature helpers.
 * Backend or contract integration can be wired to these functions.
 */

export interface HealthChainRecordPayload {
  encryptedFhirCid: string;
  recordHash: string;
  signature?: string;
  consentManager?: string;
}

/** Stub: encrypt FHIR bundle for IPFS. Replace with real encryption (e.g. AES + key exchange). */
export async function encryptFhirForHealthChain(
  _fhirBundle: object
): Promise<{ ciphertext: string; iv?: string }> {
  const json = JSON.stringify(_fhirBundle);
  return { ciphertext: btoa(unescape(encodeURIComponent(json))) };
}

/** Stub: decrypt FHIR from HealthChain record. */
export async function decryptFhirFromHealthChain(
  ciphertext: string,
  _iv?: string
): Promise<object> {
  try {
    const json = decodeURIComponent(escape(atob(ciphertext)));
    return JSON.parse(json) as object;
  } catch {
    return {};
  }
}

/** Stub: upload encrypted payload to IPFS; return CID. Replace with real IPFS client (e.g. Pinata, NFT.Storage). */
export async function uploadToIpfs(_payload: string): Promise<string> {
  return `ipfs://stub-${Date.now()}`;
}

/** Compute a deterministic hash of a record for on-chain storage (hash only, no PHI). */
export async function computeRecordHash(payload: Record<string, unknown>): Promise<string> {
  const str = JSON.stringify(payload, Object.keys(payload).sort());
  const buf = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Stub: sign record hash with wallet. In production use ethers/viem signMessage with connected wallet. */
export async function signRecordHash(
  _recordHash: string,
  _signerAddress: string
): Promise<string> {
  return `0xstub-signature-${Date.now()}`;
}

/** Build payload for HealthChain createRecord (encrypted FHIR → IPFS → hash + optional signature). */
export async function buildHealthChainPayload(
  fhirBundle: object,
  options?: { consentManager?: string }
): Promise<HealthChainRecordPayload> {
  const { ciphertext } = await encryptFhirForHealthChain(fhirBundle);
  const encryptedFhirCid = await uploadToIpfs(ciphertext);
  const recordHash = await computeRecordHash({
    encryptedFhirCid,
    consentManager: options?.consentManager,
  });
  return {
    encryptedFhirCid,
    recordHash,
    consentManager: options?.consentManager,
  };
}
