/**
 * API auth helpers - inject Supabase session token into requests
 */
import { getAccessToken } from "@/services/auth";

/**
 * Get headers with Supabase Bearer token when available
 */
export async function getAuthHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { ...extra };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}
