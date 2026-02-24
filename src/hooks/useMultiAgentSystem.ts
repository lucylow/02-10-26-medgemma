// src/hooks/useMultiAgentSystem.ts - 7-Agent Medical Orchestration
import { useState, useCallback } from "react";
import { MOCK_HEALTH_AGENTS } from "../data/mockAgents";

export interface AgentStatus {
  id: string;
  name: string;
  type:
    | "vision"
    | "audio"
    | "development"
    | "triage"
    | "privacy"
    | "dao"
    | "orchestrator";
  status: "idle" | "processing" | "complete" | "error";
  confidence: number;
  output: unknown;
  timestamp: number;
  error?: string;
}

export interface HealthData {
  vitals: {
    heartRate: number;
    respiratoryRate: number;
    temperature: number;
    oxygenSaturation: number;
  };
  developmental: {
    ageMonths: number;
    asq3Score: number;
    languagePercentile: number;
    motorPercentile: number;
  };
  multimodal: {
    imageAnalysis: string;
    audioAnalysis: string;
    riskSynthesis: string;
  };
}

export interface MultiAgentState {
  agents: AgentStatus[];
  healthData: HealthData | null;
  overallRisk: "LOW" | "MEDIUM" | "HIGH" | null;
  isProcessing: boolean;
  error: string | null;
}

export function useMultiAgentSystem() {
  const [state, setState] = useState<MultiAgentState>({
    agents: [
      {
        id: "medgemma-orchestrator",
        name: "MedGemma Orchestrator",
        type: "orchestrator",
        status: "idle",
        confidence: 0,
        output: null,
        timestamp: 0,
      },
      {
        id: "vision-agent",
        name: "Vision Agent (MedSigLIP)",
        type: "vision",
        status: "idle",
        confidence: 0,
        output: null,
        timestamp: 0,
      },
      {
        id: "audio-agent",
        name: "Audio Agent (Whisper)",
        type: "audio",
        status: "idle",
        confidence: 0,
        output: null,
        timestamp: 0,
      },
      {
        id: "dev-agent",
        name: "Development Agent (ASQ-3)",
        type: "development",
        status: "idle",
        confidence: 0,
        output: null,
        timestamp: 0,
      },
      {
        id: "triage-agent",
        name: "Triage Agent",
        type: "triage",
        status: "idle",
        confidence: 0,
        output: null,
        timestamp: 0,
      },
      {
        id: "privacy-agent",
        name: "Privacy Agent (HIPAA)",
        type: "privacy",
        status: "idle",
        confidence: 0,
        output: null,
        timestamp: 0,
      },
      {
        id: "dao-agent",
        name: "DAO Agent (PEDISC)",
        type: "dao",
        status: "idle",
        confidence: 0,
        output: null,
        timestamp: 0,
      },
    ],
    healthData: null,
    overallRisk: null,
    isProcessing: false,
    error: null,
  });

  // Realistic multi-agent pipeline (12-18s total)
  const processHealthData = useCallback(async (_inputData: unknown) => {
    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      // PIPELINE: Sequential → Parallel agent execution
      const agentResults = await Promise.allSettled([
        // 1. Vision Agent (2.8s)
        new Promise((resolve) =>
          setTimeout(() => resolve(MOCK_HEALTH_AGENTS.vision), 2800),
        ),
        // 2. Audio Agent (3.2s)
        new Promise((resolve) =>
          setTimeout(() => resolve(MOCK_HEALTH_AGENTS.audio), 3200),
        ),
        // 3. Development Agent (2.1s)
        new Promise((resolve) =>
          setTimeout(() => resolve(MOCK_HEALTH_AGENTS.development), 2100),
        ),
      ]);

      const visionResult = agentResults[0];
      const audioResult = agentResults[1];
      const devResult = agentResults[2];

      setState((prev) => ({
        ...prev,
        agents: prev.agents.map((agent) => {
          if (agent.id === "vision-agent" && visionResult.status === "fulfilled") {
            return {
              ...agent,
              status: "complete",
              confidence: 0.94,
              output: visionResult.value,
              timestamp: Date.now(),
            };
          }
          if (agent.id === "audio-agent" && audioResult.status === "fulfilled") {
            return {
              ...agent,
              status: "complete",
              confidence: 0.87,
              output: audioResult.value,
              timestamp: Date.now(),
            };
          }
          if (agent.id === "dev-agent" && devResult.status === "fulfilled") {
            return {
              ...agent,
              status: "complete",
              confidence: 0.92,
              output: devResult.value,
              timestamp: Date.now(),
            };
          }
          return agent;
        }),
      }));

      // 4. Orchestrator synthesis (1.8s)
      await new Promise((resolve) => setTimeout(resolve, 1800));

      // 5. Triage + Final Risk (2.5s)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      setState((prev) => ({
        ...prev,
        healthData: MOCK_HEALTH_AGENTS.synthesizedHealthData,
        overallRisk: "MEDIUM",
        agents: prev.agents.map((agent) => ({
          ...agent,
          status:
            agent.type === "orchestrator" ||
            agent.type === "triage" ||
            agent.type === "privacy" ||
            agent.type === "dao"
              ? "complete"
              : agent.status,
          confidence: agent.type === "orchestrator" ? 0.96 : agent.confidence,
        })),
        isProcessing: false,
      }));
    } catch (error) {
      console.error("Multi-agent processing failed", error);
      setState((prev) => ({
        ...prev,
        error: "Multi-agent processing failed - using fallback data",
        isProcessing: false,
        healthData: MOCK_HEALTH_AGENTS.fallbackHealthData,
        overallRisk: "MEDIUM",
      }));
    }
  }, []);

  const resetPipeline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      agents: prev.agents.map((agent) => ({
        ...agent,
        status: "idle",
        confidence: 0,
        output: null,
      })),
      healthData: null,
      overallRisk: null,
      error: null,
      isProcessing: false,
    }));
  }, []);

  const getAgentByType = useCallback(
    (type: AgentStatus["type"]) => state.agents.find((a) => a.type === type),
    [state.agents],
  );

  return {
    ...state,
    processHealthData,
    resetPipeline,
    getAgentByType,
  };
}

