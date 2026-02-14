/**
 * Auth service - placeholder for JWT auth (Page 4)
 * Will integrate with backend /auth/* endpoints
 */

import { apiClient } from "./apiClient";

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
 * Get current user (placeholder - returns null until auth is implemented)
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await apiClient<User>("/auth/me", { skipAuth: true });
    return user;
  } catch {
    return null;
  }
}

/**
 * Logout (placeholder - clears client state when implemented)
 */
export async function logout(): Promise<void> {
  try {
    await apiClient("/auth/logout", { method: "POST", skipAuth: true });
  } catch {
    // ignore
  }
}
