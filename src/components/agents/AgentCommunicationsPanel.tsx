'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentSwarm, AGENT_IDS, type AgentId } from '@/stores/agentSwarm';

export function AgentCommunicationsPanel() {
  const { agentMessages, delegateTask, agents } = useAgentSwarm();
  const [newMessage, setNewMessage] = useState('');
  const [targetAgentId, setTargetAgentId] = useState<AgentId>('triage');

  const sendAgentMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    delegateTask('human', targetAgentId, newMessage.trim());
    setNewMessage('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="lg:col-span-1 bg-black/40 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-white/20 p-4 md:p-6 space-y-4 md:space-y-6"
    >
      <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
        💬 Agent communications
      </h3>

      <div className="h-72 md:h-96 overflow-y-auto space-y-3 pr-2">
        <AnimatePresence mode="popLayout">
          {agentMessages.slice(-20).map((message, idx) => (
            <motion.div
              key={`${message.from}-${message.timestamp}-${idx}`}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-3 md:p-4 rounded-xl md:rounded-2xl text-sm ${
                message.from === 'human'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white ml-auto max-w-[85%]'
                  : 'bg-white/10 backdrop-blur-xl border border-white/20 max-w-[85%]'
              }`}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-bold text-xs uppercase tracking-wide opacity-90">
                  {message.from}
                </span>
                <span className="text-xs opacity-50">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="break-words">{message.content}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <form
        onSubmit={sendAgentMessage}
        className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10"
      >
        <select
          value={targetAgentId}
          onChange={(e) => setTargetAgentId(e.target.value as AgentId)}
          className="flex-1 min-w-0 px-3 py-2.5 md:px-4 md:py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl md:rounded-2xl text-white font-medium text-sm focus:outline-none focus:border-white/50"
          aria-label="Select agent to send task to"
        >
          {AGENT_IDS.map((id) => (
            <option key={id} value={id}>
              {agents[id]?.name ?? id}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Task or message..."
          className="flex-1 min-w-0 px-3 py-2.5 md:px-4 md:py-3 bg-white/10 border border-white/20 rounded-xl md:rounded-2xl text-white placeholder-white/50 text-sm focus:outline-none focus:border-white/50"
          aria-label="Message to agent"
        />
        <button
          type="submit"
          className="px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl md:rounded-2xl hover:shadow-xl transition-all whitespace-nowrap text-sm md:text-base"
        >
          Send task →
        </button>
      </form>
    </motion.div>
  );
}
