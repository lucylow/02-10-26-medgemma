/**
 * AgentStatCard — Stats grid for dashboard
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type AgentStatCardVariant = 'primary' | 'success' | 'accent' | 'warning';

const variantStyles: Record<AgentStatCardVariant, { bg: string; iconBg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', iconBg: 'bg-primary/25', text: 'text-primary' },
  success: { bg: 'bg-success/10', iconBg: 'bg-success/25', text: 'text-success' },
  accent: { bg: 'bg-accent/10', iconBg: 'bg-accent/25', text: 'text-accent' },
  warning: { bg: 'bg-warning/10', iconBg: 'bg-warning/25', text: 'text-warning' },
};

export interface AgentStatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  /** Prefer variant for design tokens; color is fallback for custom hex */
  variant?: AgentStatCardVariant;
  color?: string;
  className?: string;
}

export function AgentStatCard({
  icon: Icon,
  label,
  value,
  variant,
  color,
  className,
}: AgentStatCardProps) {
  const styles = variant ? variantStyles[variant] : null;
  return (
    <Card
      className={cn(
        'border-none shadow-md flex-1 min-w-[120px]',
        styles?.bg,
        !styles && color && 'bg-opacity-10',
        className
      )}
      style={!styles && color ? { backgroundColor: color + '15' } : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
              styles?.iconBg
            )}
            style={!styles && color ? { backgroundColor: color + '30', color } : undefined}
          >
            {styles ? (
              <Icon size={20} className={styles.text} />
            ) : (
              <Icon size={20} style={{ color: color ?? 'currentColor' }} />
            )}
          </div>
          <div>
            <p
              className={cn('text-xl font-bold', styles?.text)}
              style={!styles && color ? { color } : undefined}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
