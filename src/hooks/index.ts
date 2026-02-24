/**
 * PediScreen AI — Multi-Agent State Management Hooks
 * Input → useSmartRouter → useAgentPipeline → useAgentStream → useAgentCache
 */

export { useAgentState, type AgentType, type AgentStatus, type AgentNode, type AgentState } from './useAgentState';
export { useSmartRouting, type RouteDecision } from './useSmartRouting';
export { useAgentStream } from './useAgentStream';
export {
  useOfflineAgents,
  OFFLINE_RULES,
  findBestRule,
  hash,
  type OfflineResponse,
} from './useOfflineAgents';
export { useAgentCache, type CachedCaseData } from './useAgentCache';
export { useAgentOrchestrator } from './useAgentOrchestrator';
export { usePediScreenWallet } from './usePediScreenWallet';
export { useHealthChain } from './useHealthChain';
export { useFedLearning } from './useFedLearning';
