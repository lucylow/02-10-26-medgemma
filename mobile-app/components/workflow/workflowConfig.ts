/**
 * Agent config for workflow builder palette and nodes
 */

import type { AgentType } from '@/types/workflow';
import {
  Brain,
  Shield,
  Zap,
  Clock,
  Mic,
  Database,
  type LucideIcon,
} from 'lucide-react-native';

export const AGENT_PALETTE: Array<{
  type: AgentType;
  label: string;
  icon: LucideIcon;
  color: string;
}> = [
  { type: 'voice', label: 'Voice Input', icon: Mic, color: '#10B981' },
  { type: 'intake', label: 'Intake', icon: Shield, color: '#1E3A8A' },
  { type: 'embedding', label: 'Embedding', icon: Zap, color: '#F59E0B' },
  { type: 'medgemma', label: 'MedGemma 4B', icon: Brain, color: '#3B82F6' },
  { type: 'temporal', label: 'Temporal', icon: Clock, color: '#8B5CF6' },
  { type: 'safety', label: 'Safety', icon: Shield, color: '#EF4444' },
  { type: 'fhir', label: 'FHIR Export', icon: Database, color: '#06B6D4' },
];

export const AGENT_CONFIG: Record<
  AgentType,
  { label: string; icon: LucideIcon; color: string }
> = {
  voice: { label: 'Voice Input', icon: Mic, color: '#10B981' },
  intake: { label: 'Intake', icon: Shield, color: '#1E3A8A' },
  embedding: { label: 'Embedding', icon: Zap, color: '#F59E0B' },
  medgemma: { label: 'MedGemma 4B', icon: Brain, color: '#3B82F6' },
  temporal: { label: 'Temporal', icon: Clock, color: '#8B5CF6' },
  safety: { label: 'Safety', icon: Shield, color: '#EF4444' },
  fhir: { label: 'FHIR Export', icon: Database, color: '#06B6D4' },
};

export function getAgentDescription(type: AgentType): string {
  const desc: Record<AgentType, string> = {
    voice: 'Speech-to-text input',
    intake: 'Validate & parse input',
    embedding: 'Vision embeddings',
    medgemma: 'Clinical inference',
    temporal: 'History context',
    safety: 'Safety checks',
    fhir: 'Export to FHIR R4',
  };
  return desc[type] ?? type;
}
