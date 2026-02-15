/**
 * Web connectivity hook — mirrors @react-native-community/netinfo for web
 */

import { useState, useEffect } from 'react';

export type ConnectionMode = 'online' | 'hybrid' | 'offline';

export function useNetInfo(): { isConnected: boolean | null; mode: ConnectionMode } {
  const [isConnected, setIsConnected] = useState<boolean | null>(
    typeof navigator !== 'undefined' ? navigator.onLine : null
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsConnected(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const mode: ConnectionMode = isConnected === true ? 'online' : isConnected === false ? 'offline' : 'hybrid';
  return { isConnected, mode };
}
