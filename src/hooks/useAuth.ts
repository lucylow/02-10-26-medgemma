/**
 * Auth hook - uses Supabase when configured, otherwise returns unauthenticated
 */
import { useContext } from "react";
import { SupabaseAuthContext } from "@/contexts/SupabaseAuthContext";

// Safe default when provider is not mounted (e.g. tests)
const defaultAuth = {
  user: null as { id: string; email: string; name?: string } | null,
  isAuthenticated: false,
  loading: false,
};

export function useAuth() {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) return defaultAuth;
  return {
    user: ctx.user,
    isAuthenticated: ctx.isAuthenticated,
    loading: ctx.loading,
  };
}
