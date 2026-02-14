/**
 * Route guard: redirects unauthenticated users to login
 * Use when Supabase Auth is configured and route requires auth
 */
import { Navigate, useLocation } from "react-router-dom";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If true, only protect when Supabase is configured; otherwise allow through */
  requireSupabase?: boolean;
}

export function ProtectedRoute({ children, requireSupabase = true }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, loading, isConfigured } = useSupabaseAuth();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (requireSupabase && !isConfigured) {
    return <>{children}</>;
  }

  if (isConfigured && !isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
