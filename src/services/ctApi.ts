/**
 * CT 3D Edge API — DICOM/NIfTI preprocess and MedGemma 3D inference.
 * Backend: POST /api/ct/preprocess, POST /api/ct/infer (see docs/CT_3D_EDGE_INTEGRATION.md).
 */
function getApiBase(): string {
  const backend = import.meta.env.VITE_PEDISCREEN_BACKEND_URL;
  if (backend) return backend.replace(/\/api\/?$/, "");
  const medgemma = import.meta.env.VITE_MEDGEMMA_API_URL;
  if (medgemma) return medgemma.replace(/\/api\/?$/, "");
  return import.meta.env.DEV ? "http://localhost:8000" : "https://api.pediscreen.ai";
}

const API_BASE = getApiBase();
const API_KEY = import.meta.env.VITE_API_KEY || "dev-example-key";

function headers(): Record<string, string> {
  const h: Record<string, string> = {};
  if (API_KEY) h["x-api-key"] = API_KEY;
  return h;
}

/** Anatomy/modality for CT (head, chest, extremity, etc.). */
export type CTAnatomy =
  | "head"
  | "chest"
  | "abdomen"
  | "pelvis"
  | "extremity"
  | "spine"
  | "wbct";

export interface CTVolumeMetadata {
  shape?: [number, number, number];
  spacing_mm?: [number, number, number];
  anatomy?: CTAnatomy;
  modality?: string;
  slice_count?: number;
}

export interface CTPreprocessRequest {
  /** Optional base64-encoded DICOM or NIfTI bytes (or use multipart in future). */
  volume_b64?: string;
  anatomy?: CTAnatomy;
}

export interface CTPreprocessResponse {
  volume_id?: string;
  metadata?: CTVolumeMetadata;
  patch_count?: number;
  message?: string;
}

export interface CTFinding {
  label: string;
  confidence?: number;
  region?: string;
}

export interface CTInferRequest {
  volume_id: string;
  anatomy?: CTAnatomy;
}

export interface CTInferResponse {
  findings?: CTFinding[];
  risk_tier?: string;
  inference_time_seconds?: number;
  fhir_bundle_id?: string;
  message?: string;
}

export async function ctPreprocess(
  body: CTPreprocessRequest
): Promise<CTPreprocessResponse> {
  const res = await fetch(`${API_BASE}/api/ct/preprocess`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 404 || text.includes("Not Found") || text.includes("no such"))
      throw new Error("CT preprocess API not available. Ensure backend exposes POST /api/ct/preprocess.");
    throw new Error(text || `Preprocess failed: ${res.status}`);
  }
  return res.json();
}

export async function ctInfer(body: CTInferRequest): Promise<CTInferResponse> {
  const res = await fetch(`${API_BASE}/api/ct/infer`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 404 || text.includes("Not Found") || text.includes("no such"))
      throw new Error("CT infer API not available. Ensure backend exposes POST /api/ct/infer.");
    throw new Error(text || `Inference failed: ${res.status}`);
  }
  return res.json();
}
