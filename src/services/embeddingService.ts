/**
 * Embedding service — client-side or remote.
 * Mock mode: deterministic embedding from bytes (no network).
 * Real mode: on-device MedSigLIP or remote /embed API.
 */

const API_URL =
  import.meta.env.VITE_MEDGEMMA_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "https://api.pediscreen.ai/v1");

export interface EmbeddingResult {
  embedding_b64: string;
  shape: number[];
  emb_version?: string;
}

/** Mulberry32 PRNG for deterministic mock embeddings */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic embedding from bytes — same seed yields same vector (dev/mock) */
export function deterministicEmbeddingFromBytes(
  buffer: ArrayBuffer,
  dim = 256
): Float32Array {
  const hash = simpleHash(new Uint8Array(buffer));
  const seed = hash >>> 0;
  const rng = mulberry32(seed);
  const arr = new Float32Array(dim);
  for (let i = 0; i < dim; i++) arr[i] = (rng() - 0.5) * 2;
  const norm = Math.hypot(...arr);
  for (let i = 0; i < dim; i++) arr[i] /= norm || 1;
  return arr;
}

/** Simple 32-bit hash (no crypto in browser for deterministic mock) */
function simpleHash(bytes: Uint8Array): number {
  let h = 0;
  for (let i = 0; i < bytes.length; i++) {
    h = (h << 5) - h + bytes[i];
    h |= 0;
  }
  return h;
}

/** Base64 encode Float32Array */
function float32ToBase64(arr: Float32Array): string {
  const u8 = new Uint8Array(arr.buffer);
  let binary = "";
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary);
}

export async function computeEmbedding(fileBlob: Blob): Promise<EmbeddingResult> {
  const apiMode = import.meta.env.VITE_API_MODE || "dev";

  if (apiMode === "mock") {
    const buffer = await fileBlob.arrayBuffer();
    const arr = deterministicEmbeddingFromBytes(buffer);
    return {
      embedding_b64: float32ToBase64(arr),
      shape: [arr.length],
      emb_version: "mock_v1",
    };
  }

  // On-device MedSigLIP (if available)
  const win = window as unknown as { medSiglip?: { computeEmbedding: (b: Blob) => Promise<EmbeddingResult> } };
  if (win.medSiglip?.computeEmbedding) {
    return win.medSiglip.computeEmbedding(fileBlob);
  }

  // Remote embed API
  const formData = new FormData();
  formData.append("file", fileBlob, "image.jpg");
  const resp = await fetch(`${API_URL}/embed`, {
    method: "POST",
    body: formData,
  });
  if (!resp.ok) throw new Error(`Embed API error: ${resp.status}`);
  return resp.json();
}
