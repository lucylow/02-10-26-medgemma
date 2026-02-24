/**
 * Centralized API client for PediScreen AI
 * Handles base URL, auth headers (x-api-key + Supabase Bearer token), and error handling
 */

import { getAccessToken } from "./auth";

const API_BASE =
  import.meta.env.VITE_PEDISCREEN_BACKEND_URL ||
  import.meta.env.VITE_MEDGEMMA_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "https://api.pediscreen.ai/v1");

const API_KEY = import.meta.env.VITE_API_KEY || "dev-example-key";

export interface ApiError {
  code: string;
  message: string;
  status?: number;
}

export class ApiClientError extends Error {
  code: string;
  status?: number;
  /** True for network/timeout/5xx — callers may retry */
  isRetryable?: boolean;

  constructor(message: string, code = "UNKNOWN", status?: number, isRetryable?: boolean) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.isRetryable = isRetryable ?? (status != null && status >= 500);
  }
}

const DEFAULT_TIMEOUT_MS = 30000;

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let code = "HTTP_ERROR";
    let bodyConsumed = false;

    if (isJson) {
      try {
        const data = await response.json();
        bodyConsumed = true;
        message = data.detail || data.message || data.error || message;
        code = data.code || code;
      } catch {
        if (!bodyConsumed) {
          try {
            message = (await response.text()) || message;
          } catch {
            // use default message
          }
        }
      }
    } else {
      try {
        message = (await response.text()) || message;
      } catch {
        // use default message
      }
    }

    const isRetryable = response.status >= 500 || response.status === 408 || response.status === 429;
    throw new ApiClientError(message, code, response.status, isRetryable);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (isJson) {
    return response.json();
  }

  return response.text() as unknown as T;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
  /** Request timeout in ms (default 30000). Uses AbortSignal.timeout when supported. */
  timeoutMs?: number;
}

/**
 * Centralized fetch wrapper with base URL, default headers, and error handling
 */
export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, skipAuth, timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;

  let url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  if (params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) search.set(k, String(v));
    });
    const qs = search.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (!skipAuth) {
    if (API_KEY) headers["x-api-key"] = API_KEY;
    const token = await getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const timeoutSignal =
    typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(timeoutMs) : undefined;
  const signal = init.signal ?? timeoutSignal;

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal,
    });

    return handleResponse<T>(response);
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    const isNetwork = err instanceof TypeError && (message.includes("fetch") || message.includes("Failed to fetch"));
    const isAbort = err instanceof Error && err.name === "AbortError";
    throw new ApiClientError(
      isAbort ? "Request timed out" : isNetwork ? "Network error. Please check your connection." : message,
      isAbort ? "TIMEOUT" : isNetwork ? "NETWORK_ERROR" : "REQUEST_FAILED",
      undefined,
      isNetwork || isAbort
    );
  }
}

export default apiClient;
