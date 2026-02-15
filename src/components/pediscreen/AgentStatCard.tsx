/**
 * AgentStatCard — Stats grid for dashboard
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AgentStatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  color: string;
  className?: string;
}

export function AgentStatCard({
  icon: Icon,
  label,
  value,
  color,
  className,
}: AgentStatCardProps) {
  return (
    <Card
      className={cn(
        'border-none shadow-md flex-1 min-w-[120px]',
        className
      )}
      style={{ backgroundColor: color + '15' }}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: color + '30' }}
          >
            <Icon size={20} style={{ color }} />
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color }}>
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
