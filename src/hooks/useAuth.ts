/**
 * Auth hook - placeholder for user context (Page 4)
 */

import { useState, useEffect } from "react";
import { getCurrentUser, type User } from "@/services/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  return { user, isAuthenticated: !!user, loading };
}
