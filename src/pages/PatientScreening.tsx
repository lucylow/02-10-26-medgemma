'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAgentSwarm, type AgentId } from '@/stores/agentSwarm';
import { AgentSwarmDashboard } from '@/components/agents/AgentSwarmDashboard';

const SPECIALIST_AGENTS: AgentId[] = ['rop', 'growth', 'audio', 'asq'];

export default function PatientScreening() {
  const { id: patientId } = useParams<{ id: string }>();
  const {
    startScreeningSession,
    activateAgent,
    agents,
    resolveConflicts,
  } = useAgentSwarm();

  useEffect(() => {
    if (patientId) {
      startScreeningSession(patientId);
      const t1 = setTimeout(() => activateAgent('triage'), 500);
      const t2 = setTimeout(() => {
        SPECIALIST_AGENTS.forEach((agentId) => activateAgent(agentId));
      }, 2000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [patientId, startScreeningSession, activateAgent]);

  const allAgentsComplete = useMemo(
    () =>
      Object.values(agents).every(
        (a) => a.status === 'complete' || a.status === 'error'
      ),
    [agents]
  );

  const finalDecision = useMemo(() => {
    if (!allAgentsComplete) return null;
    const votes: Record<string, string> = {};
    const agentIds: AgentId[] = [
      'triage',
      'rop',
      'growth',
      'audio',
      'asq',
      'evidence',
      'safety',
    ];
    for (const agentId of agentIds) {
      const out = agents[agentId]?.output;
      const risk =
        out != null && typeof out === 'object' && 'risk_level' in out
          ? String((out as { risk_level?: string }).risk_level)
          : 'monitor';
      votes[agentId] = risk;
    }
    return resolveConflicts(votes);
  }, [allAgentsComplete, agents, resolveConflicts]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="text-center mb-8 md:mb-16">
        <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent mb-4">
          Patient screening: {patientId ?? '—'}
        </h1>
        {finalDecision != null && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`inline-flex items-center gap-3 md:gap-4 px-6 py-5 md:px-12 md:py-8 rounded-2xl md:rounded-3xl font-black text-xl md:text-3xl shadow-2xl ${
              finalDecision === 'referral'
                ? 'bg-red-500 text-white'
                : finalDecision === 'urgent'
                  ? 'bg-orange-500 text-white'
                  : finalDecision === 'monitor'
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500 text-white'
            }`}
          >
            🏥 Final decision: {finalDecision.toUpperCase()}
          </motion.div>
        )}
      </div>
      <AgentSwarmDashboard />
    </div>
  );
}
