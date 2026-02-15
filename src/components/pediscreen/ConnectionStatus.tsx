/**
 * ConnectionStatus — Online/offline indicator for PediScreen
 */

import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConnectionStatusProps {
  isConnected: boolean;
  className?: string;
}

export function ConnectionStatus({ isConnected, className }: ConnectionStatusProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
        isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
        className
      )}
    >
      {isConnected ? (
        <>
          <Wifi size={16} />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>Offline — Local screening only</span>
        </>
      )}
    </div>
  );
}
