/**
 * AgentNode — Medical-grade agent pipeline node with status, offline indicator
 */

import React from 'react';
import {
  Shield,
  Zap,
  Clock,
  Brain,
  ShieldCheck,
  FileText,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentType, AgentStatus } from '@/contexts/AgentContext';

const AGENT_CONFIG: Record<
  AgentType,
  { color: string; icon: LucideIcon; label: string; offline: boolean }
> = {
  intake: { color: '#10B981', icon: Shield, label: 'Intake', offline: true },
  embedding: { color: '#F59E0B', icon: Zap, label: 'Vision', offline: false },
  temporal: { color: '#8B5CF6', icon: Clock, label: 'History', offline: true },
  medgemma: { color: '#1E3A8A', icon: Brain, label: 'MedGemma 4B', offline: false },
  safety: { color: '#EF4444', icon: ShieldCheck, label: 'Safety', offline: true },
  summarizer: { color: '#06B6D4', icon: FileText, label: 'Summary', offline: true },
};

const STATUS_STYLES: Record<
  AgentStatus,
  { bg: string; pulse: boolean; badgeBg?: string }
> = {
  idle: { bg: '#F1F5F9', pulse: false },
  pending: { bg: '#E2E8F0', pulse: false },
  running: { bg: 'transparent', pulse: true, badgeBg: '#F59E0B' },
  streaming: { bg: '#3B82F620', pulse: true, badgeBg: '#3B82F6' },
  success: { bg: 'transparent', pulse: false, badgeBg: '#10B981' },
  failed: { bg: '#FEF2F2', pulse: false, badgeBg: '#EF4444' },
  error: { bg: '#FEF2F2', pulse: false, badgeBg: '#EF4444' },
  offline: { bg: '#FEF3C7', pulse: false, badgeBg: '#F59E0B' },
};

export interface AgentNodeProps {
  agent: AgentType;
  status: AgentStatus;
  position: number;
  total: number;
  mode: 'online' | 'hybrid' | 'offline';
  className?: string;
}

export function AgentNode({
  agent,
  status,
  position,
  total,
  mode,
  className,
}: AgentNodeProps) {
  const config = AGENT_CONFIG[agent] ?? {
    color: '#64748B',
    icon: Brain,
    label: agent,
    offline: false,
  };
  const statusStyles = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const Icon = config.icon;

  const bgColor =
    status === 'success'
      ? config.color + '20'
      : status === 'running' || status === 'streaming'
        ? config.color + '15'
        : statusStyles.bg;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-w-[72px] max-w-[96px] p-3 rounded-xl border-0 shadow-md transition-all',
        statusStyles.pulse && 'animate-pulse',
        className
      )}
      style={{
        backgroundColor: bgColor,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <span className="text-xs text-slate-500 mb-1">
        {position}/{total}
      </span>
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
        style={{ backgroundColor: config.color + '30' }}
      >
        <Icon size={18} style={{ color: config.color }} />
      </div>
      <span
        className="text-xs font-semibold text-slate-800 text-center mb-1"
        style={{ lineHeight: 1.2 }}
      >
        {config.label}
      </span>
      <span
        className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase"
        style={{
          backgroundColor: statusStyles.badgeBg ?? config.color + '40',
          color: status === 'failed' || status === 'error' ? '#fff' : '#1E293B',
        }}
      >
        {status}
      </span>
      {!config.offline && mode !== 'online' && (
        <span className="text-[10px] text-amber-600 font-medium mt-1">OFFLINE</span>
      )}
    </div>
  );
}
