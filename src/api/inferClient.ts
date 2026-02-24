/**
 * Infer API client with circuit-breaker and mock fallback.
 * Respects VITE_API_MODE=mock|dev|prod.
 */

const API_URL =
  import.meta.env.VITE_PEDISCREEN_BACKEND_URL ||
  import.meta.env.VITE_MEDGEMMA_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8000/api" : "https://api.pediscreen.ai/v1");

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000;

let failureCount = 0;
let circuitOpenUntil = 0;

export interface InferPayload {
  embedding_b64?: string;
  age_months?: number;
  domain?: string;
  observations?: string;
  [key: string]: unknown;
}

export interface InferResult {
  summary: string[];
  risk: "low" | "monitor" | "refer";
  recommendations: string[];
  parent_text: string;
  explain: string[];
  nearest_neighbors?: { case_id: string; age_months: number; label: string }[];
  confidence: number;
  adapter_id?: string;
}

export function mockInfer(_payload: InferPayload): InferResult {
  const r = Math.random();
  const risk: InferResult["risk"] =
    r < 0.2 ? "refer" : r < 0.5 ? "monitor" : "low";
  return {
    summary: ["Mock summary"],
    risk,
    recommendations: [
      "Try 5 minutes of language modeling daily",
      "Rescreen in 3 months",
    ],
    parent_text:
      "Your child shows signs that merit watching; see clinician if concerns persist.",
    explain: ["Parental report: few words", "Drawing: age-typical"],
    confidence: 0.72,
    nearest_neighbors: [],
  };
}

export async function postInfer(payload: InferPayload): Promise<InferResult> {
  const apiMode = import.meta.env.VITE_API_MODE || "dev";

  if (apiMode === "mock") return mockInfer(payload);
  if (Date.now() < circuitOpenUntil) return mockInfer(payload);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const signal =
      typeof AbortSignal?.timeout === "function"
        ? AbortSignal.timeout(30000)
        : controller.signal;
    const res = await fetch(`${API_URL}/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    if (timeoutId) clearTimeout(timeoutId);
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const data = await res.json();
          message = (data.detail ?? data.message ?? data.error ?? message) as string;
        } else {
          message = (await res.text()) || message;
        }
      } catch {
        // use default message
      }
      throw new Error(message);
    }
    failureCount = 0;
    return (await res.json()) as InferResult;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      failureCount++;
      if (failureCount >= FAILURE_THRESHOLD) {
        circuitOpenUntil = Date.now() + COOLDOWN_MS;
      }
      return mockInfer(payload);
    }
    failureCount++;
    if (failureCount >= FAILURE_THRESHOLD) {
      circuitOpenUntil = Date.now() + COOLDOWN_MS;
    }
    return mockInfer(payload);
  }
}

/** Reset circuit breaker (for tests) */
export function resetCircuitBreaker(): void {
  failureCount = 0;
  circuitOpenUntil = 0;
}
