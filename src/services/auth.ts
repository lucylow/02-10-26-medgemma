/**
 * Auth service - Supabase integration (Page 4)
 * Primary auth is via SupabaseAuthContext; this module provides helpers.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

/**
 * Get current session access token for API calls
 */
export async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Logout - delegates to Supabase signOut
 */
export async function logout(): Promise<void> {
  if (isSupabaseConfigured) await supabase.auth.signOut();
}
