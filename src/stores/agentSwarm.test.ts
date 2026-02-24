import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentSwarm, AGENT_IDS, type AgentId } from './agentSwarm';

describe('agentSwarm', () => {
  beforeEach(() => {
    useAgentSwarm.getState().resetSwarm();
  });

  it('exposes 12 agents', () => {
    const { agents } = useAgentSwarm.getState();
    expect(AGENT_IDS.length).toBe(12);
    for (const id of AGENT_IDS) {
      expect(agents[id]).toBeDefined();
      expect(agents[id].id).toBe(id);
      expect(agents[id].name).toBeTruthy();
      expect(agents[id].status).toBe('idle');
    }
  });

  it('activateAgent sets status to thinking', () => {
    const { activateAgent, agents } = useAgentSwarm.getState();
    activateAgent('triage');
    expect(useAgentSwarm.getState().agents.triage.status).toBe('thinking');
  });

  it('updateAgentStatus sets status, output, and confidence', () => {
    const { updateAgentStatus } = useAgentSwarm.getState();
    updateAgentStatus('triage', 'complete', { risk_level: 'referral', confidence: 0.9 });
    const { agents } = useAgentSwarm.getState();
    expect(agents.triage.status).toBe('complete');
    expect(agents.triage.confidence).toBe(0.9);
    expect(agents.triage.output).toEqual({ risk_level: 'referral', confidence: 0.9 });
  });

  it('delegateTask adds message and task to agent', () => {
    const { delegateTask, agentMessages, agents } = useAgentSwarm.getState();
    delegateTask('human', 'asq', 'Score communication domain');
    const state = useAgentSwarm.getState();
    expect(state.agentMessages.length).toBe(1);
    expect(state.agentMessages[0].from).toBe('human');
    expect(state.agentMessages[0].to).toBe('asq');
    expect(state.agentMessages[0].content).toBe('Score communication domain');
    expect(state.agents.asq.tasks).toContain('Score communication domain');
  });

  it('startScreeningSession sets activePatient and clears episode memory', () => {
    const { startScreeningSession, addSharedMemory } = useAgentSwarm.getState();
    addSharedMemory({ note: 'prior' });
    startScreeningSession('patient-123');
    const { activePatient, episodeMemory } = useAgentSwarm.getState();
    expect(activePatient).toBe('patient-123');
    expect(episodeMemory.length).toBe(0);
  });

  it('addSharedMemory appends to sharedMemory and episodeMemory', () => {
    const { addSharedMemory } = useAgentSwarm.getState();
    addSharedMemory({ key: 'a' });
    addSharedMemory({ key: 'b' });
    const { sharedMemory, episodeMemory } = useAgentSwarm.getState();
    expect(sharedMemory.length).toBe(2);
    expect(episodeMemory.length).toBe(2);
  });

  it('resolveConflicts returns decision with highest confidence-weighted vote', () => {
    const { updateAgentStatus, resolveConflicts } = useAgentSwarm.getState();
    updateAgentStatus('triage', 'complete', { risk_level: 'referral', confidence: 0.9 });
    updateAgentStatus('rop', 'complete', { risk_level: 'monitor', confidence: 0.3 });
    updateAgentStatus('growth', 'complete', { risk_level: 'referral', confidence: 0.8 });
    const votes: Record<string, string> = {
      triage: 'referral',
      rop: 'monitor',
      growth: 'referral',
    };
    const decision = resolveConflicts(votes);
    expect(decision).toBe('referral');
  });

  it('resetSwarm restores initial agent states', () => {
    const { activateAgent, delegateTask, resetSwarm } = useAgentSwarm.getState();
    activateAgent('triage');
    delegateTask('human', 'asq', 'Task');
    resetSwarm();
    const { agents, agentMessages } = useAgentSwarm.getState();
    expect(agents.triage.status).toBe('idle');
    expect(agentMessages.length).toBe(0);
  });
});
