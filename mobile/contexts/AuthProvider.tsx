import React, { createContext, useContext, useState, useCallback } from "react";

type UserRole = "clinician" | "parent" | "admin";

interface AuthState {
  user: { id: string; role: UserRole; email?: string } | null;
  authToken: string | null;
  apiKey: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (token: string, user: AuthState["user"], apiKey?: string) => void;
  signOut: () => void;
  hasAccess: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  clinician: ["review_cases", "approve_reports", "edit_drafts", "view_audit"],
  parent: ["submit_screening", "view_results"],
  admin: [
    "review_cases",
    "approve_reports",
    "edit_drafts",
    "view_audit",
    "manage_users",
  ],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    authToken: null,
    apiKey: process.env.EXPO_PUBLIC_API_KEY ?? null,
  });

  const signIn = useCallback(
    (token: string, user: AuthState["user"], apiKey?: string) => {
      setState({
        user,
        authToken: token,
        apiKey: apiKey ?? state.apiKey,
      });
    },
    [state.apiKey]
  );

  const signOut = useCallback(() => {
    setState({ user: null, authToken: null, apiKey: state.apiKey });
  }, [state.apiKey]);

  const hasAccess = useCallback(
    (permission: string): boolean => {
      if (!state.user) return false;
      const perms = ROLE_PERMISSIONS[state.user.role] ?? [];
      return perms.includes(permission);
    },
    [state.user]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signOut,
        hasAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      authToken: null,
      apiKey: null,
      signIn: () => {},
      signOut: () => {},
      hasAccess: () => false,
    };
  }
  return ctx;
}
