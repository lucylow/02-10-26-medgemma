'use client';

import { motion } from 'framer-motion';
import {
  useAgentSwarm,
  type Agent,
  type AgentId,
  AGENT_IDS,
} from '@/stores/agentSwarm';
import { AgentCommunicationsPanel } from './AgentCommunicationsPanel';

const AGENT_COLORS: Record<AgentId, string> = {
  triage: '#EF4444',
  rop: '#F59E0B',
  growth: '#10B981',
  audio: '#8B5CF6',
  asq: '#1E40AF',
  immunization: '#EC4899',
  evidence: '#06B6D4',
  safety: '#84CC16',
  referral: '#F97316',
  chw: '#6366F1',
  audit: '#64748B',
  orchestrator: '#A855F7',
};

export function AgentSwarmDashboard() {
  const { agents, activePatient, agentMessages, taskQueue } = useAgentSwarm();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900">
      <div className="bg-black/30 backdrop-blur-xl border-b border-white/10 p-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-white" aria-hidden>
                🤖
              </span>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">
                AI Agent Swarm
              </h1>
              <p className="text-sm md:text-base text-white/70">
                {activePatient
                  ? `Patient: ${activePatient.slice(-8)}`
                  : 'No active patient'}
              </p>
            </div>
          </div>
          <div className="flex gap-4 text-sm font-mono text-white/50">
            <span>Tasks: {taskQueue.length}</span>
            <span>Messages: {agentMessages.length}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {AGENT_IDS.map((agentId) => (
              <AgentStatusCard
                key={agentId}
                agent={agents[agentId]}
                agentId={agentId}
              />
            ))}
          </div>
        </div>
        <AgentCommunicationsPanel />
      </div>
    </div>
  );
}

interface AgentStatusCardProps {
  agent: Agent;
  agentId: AgentId;
}

function AgentStatusCard({ agent, agentId }: AgentStatusCardProps) {
  const activateAgent = useAgentSwarm((s) => s.activateAgent);

  const statusStyles = {
    idle: 'border-gray-800/50 bg-gray-900/50 hover:border-white/30',
    thinking: 'border-blue-500/50 bg-blue-500/10',
    complete: 'border-emerald-500/50 bg-emerald-500/10',
    error: 'border-red-500/50 bg-red-500/10',
  };

  const statusIndicator = {
    idle: { bg: 'bg-gray-800', icon: '⏸️' },
    thinking: {
      bg: 'bg-gradient-to-r from-blue-500 to-purple-500',
      icon: '⚡',
    },
    complete: { bg: 'bg-emerald-500', icon: '✅' },
    error: { bg: 'bg-red-500', icon: '❌' },
  };

  const indicator = statusIndicator[agent.status];
  const isThinking = agent.status === 'thinking';

  return (
    <motion.div
      layout
      animate={{
        scale: isThinking ? 1.02 : 1,
        boxShadow: isThinking
          ? '0 25px 50px -12px rgba(0,0,0,0.5)'
          : '0 20px 25px -5px rgba(0,0,0,0.3)',
      }}
      className={`group relative p-5 md:p-6 rounded-2xl md:rounded-3xl border-2 md:border-4 transition-all overflow-hidden ${statusStyles[agent.status]}`}
    >
      <div
        className={`absolute -top-2 -right-2 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl ${indicator.bg}`}
        aria-hidden
      >
        {indicator.icon}
      </div>

      <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
        <div
          className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-2xl shadow-xl text-white"
          style={{ backgroundColor: AGENT_COLORS[agentId] }}
        >
          {agentId.slice(0, 3).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-xl font-black text-white truncate">
            {agent.name}
          </h3>
          <p className="text-xs md:text-sm text-white/60 capitalize">
            {agent.status}
          </p>
        </div>
        <div className="text-xl md:text-2xl font-black text-white">
          {(agent.confidence * 100).toFixed(0)}%
        </div>
      </div>

      {agent.status === 'complete' && agent.output != null && (
        <div className="text-xs md:text-sm bg-black/30 p-3 md:p-4 rounded-xl md:rounded-2xl text-white/80 line-clamp-2">
          {typeof agent.output === 'string'
            ? `${agent.output.slice(0, 100)}...`
            : `${JSON.stringify(agent.output).slice(0, 100)}...`}
        </div>
      )}

      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => activateAgent(agentId)}
        disabled={isThinking}
        className="w-full mt-4 md:mt-6 px-3 py-2.5 md:px-4 md:py-3 bg-white/20 backdrop-blur-xl rounded-xl md:rounded-2xl border border-white/30 font-bold text-white hover:bg-white/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm md:text-base"
      >
        {isThinking ? '⏳ Processing...' : 'Activate agent'}
      </motion.button>
    </motion.div>
  );
}
