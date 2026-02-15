/**
 * Production Auth Provider - Clerk + role-based access for PediScreen AI
 * Clinician/Parent dual-mode with organization support
 */

import React, { createContext, useContext, useEffect } from 'react';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  useAuth as useClerkAuth,
  useUser,
  useOrganization,
} from '@clerk/clerk-expo';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export type UserRole = 'clinician' | 'parent' | 'admin' | 'chc_worker';
export type UserMode = 'parent' | 'clinician' | 'admin';

interface AuthUser {
  firstName?: string;
  imageUrl?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  userRole: UserRole;
  userMode: UserMode;
  organization: ReturnType<typeof useOrganization>['organization'];
  isLoading: boolean;
  hasAccess: (permission: string) => boolean;
  signOut?: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Ignore
    }
  },
};

function determineUserMode(
  role: UserRole,
  org: ReturnType<typeof useOrganization>['organization']
): UserMode {
  if (role === 'admin') return 'admin';
  if (role === 'clinician' || org?.role === 'clinician') return 'clinician';
  return 'parent';
}

function AuthInnerProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { signOut } = useClerk();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoaded) return;
    const inAuthGroup = segments[0] === '(auth)';
    const authRoute = segments[1] as string | undefined;
    const publicAuthRoutes = ['sign-in', 'onboarding', 'verify-email'];

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (
      isSignedIn &&
      user?.publicMetadata?.role === 'new_user' &&
      (!inAuthGroup || !publicAuthRoutes.includes(authRoute ?? ''))
    ) {
      router.replace('/(auth)/onboarding');
    }
  }, [isSignedIn, isLoaded, user?.publicMetadata?.role, segments]);

  const userRole: UserRole =
    (user?.publicMetadata?.role as UserRole) || 'parent';
  const userMode = determineUserMode(userRole, organization);

  const hasAccess = (permission: string): boolean => {
    const permissions: Record<UserRole, string[]> = {
      clinician: [
        'view_evidence',
        'override_ai',
        'view_raw_logs',
        'manage_cases',
      ],
      admin: ['all'],
      chc_worker: ['view_summary', 'basic_override'],
      parent: ['view_summary'],
    };
    const perms = permissions[userRole] ?? [];
    return perms.includes(permission) || perms.includes('all');
  };

  const value: AuthState = {
    isAuthenticated: !!isSignedIn,
    user: user
      ? { firstName: user.firstName ?? undefined, imageUrl: user.imageUrl }
      : null,
    userRole,
    userMode,
    organization,
    isLoading: !isLoaded,
    hasAccess,
    signOut: signOut ? () => signOut() : undefined,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

const DEV_FALLBACK_STATE: AuthState = {
  isAuthenticated: true, // Dev: allow access when Clerk not configured
  user: { firstName: 'Dev User' },
  userRole: 'clinician',
  userMode: 'clinician',
  organization: null,
  isLoading: false,
  hasAccess: () => true,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    console.warn(
      'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY not set - using dev fallback (no auth)'
    );
    return (
      <AuthContext.Provider value={DEV_FALLBACK_STATE}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <AuthInnerProvider>{children}</AuthInnerProvider>
    </ClerkProvider>
  );
}

export function useAuthState() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthState must be used within AuthProvider');
  }
  return context;
}
