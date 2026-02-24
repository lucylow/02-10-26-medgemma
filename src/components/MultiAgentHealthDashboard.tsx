// src/components/MultiAgentHealthDashboard.tsx - Kaggle Gold Demo Ready
import { useState } from "react";
import {
  useMultiAgentSystem,
  type AgentStatus,
} from "../hooks/useMultiAgentSystem";
import { MOCK_HEALTH_AGENTS } from "../data/mockAgents";
import { cn } from "../lib/utils";

export function MultiAgentHealthDashboard() {
  const { agents, healthData, overallRisk, processHealthData, resetPipeline } =
    useMultiAgentSystem();
  const [inputAge, setInputAge] = useState(24);
  const [inputObservations, setInputObservations] = useState("");

  const startScreening = async () => {
    await processHealthData({
      ageMonths: inputAge,
      parentObservations:
        inputObservations || MOCK_HEALTH_AGENTS.development.ageMonths,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      {/* Header */}
      <div className="glass-medical p-8 rounded-b-3xl shadow-2xl border-b-4 border-white/50 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent mb-2">
              PediScreen AI
            </h1>
            <p className="text-xl text-gray-700 font-semibold">
              Multi-Agent Health Analysis
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={resetPipeline}
              className="px-6 py-3 bg-gray-500/20 hover:bg-gray-500/30 text-gray-800 font-bold rounded-2xl border border-gray-300 transition-all backdrop-blur-sm"
            >
              🔄 Reset Pipeline
            </button>
            <div className="px-6 py-3 bg-emerald-500/20 text-emerald-800 font-bold rounded-2xl border border-emerald-300">
              7 AI Agents Active
            </div>
            {overallRisk && (
              <div
                className={cn(
                  "px-6 py-3 rounded-2xl font-black text-xl shadow-2xl",
                  overallRisk === "LOW"
                    ? "bg-emerald-500 text-white"
                    : overallRisk === "MEDIUM"
                      ? "bg-amber-500 text-white"
                      : "bg-red-500 text-white",
                )}
              >
                {overallRisk} Risk
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Input Form */}
        {!healthData ? (
          <div className="glass-medical p-12 rounded-4xl text-center max-w-2xl mx-auto">
            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl">
              <svg
                className="w-14 h-14 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>

            <h2 className="text-3xl font-black text-gray-900 mb-8">
              Start Multi-Agent Analysis
            </h2>
            <p className="text-xl text-gray-600 mb-12 max-w-md mx-auto">
              7 specialized AI agents will analyze developmental milestones,
              vitals, vision, and audio in ~15 seconds.
            </p>

            <div className="space-y-6 max-w-md mx-auto">
              <div>
                <label
                  className="block text-sm font-semibold text-gray-700 mb-2"
                  htmlFor="age-range"
                >
                  Child Age
                </label>
                <input
                  id="age-range"
                  type="range"
                  min={6}
                  max={72}
                  value={inputAge}
                  onChange={(e) => setInputAge(Number(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-600"
                />
                <div className="text-center text-2xl font-bold text-gray-900 mt-2">
                  {inputAge} months
                </div>
              </div>

              <textarea
                placeholder="Parent observations (optional)..."
                value={inputObservations}
                onChange={(e) => setInputObservations(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 ring-blue-500/20 transition-all resize-vertical min-h-[120px] text-lg"
              />

              <button
                type="button"
                onClick={startScreening}
                className="w-full py-6 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black text-xl rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300"
              >
                🚀 Launch 7-AI Agent Analysis (15s)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Agent Pipeline */}
            <AgentPipeline agents={agents} />

            {/* Health Vitals */}
            <HealthVitalsDisplay data={healthData} />

            {/* Agent Results */}
            <AgentResultsGrid agents={agents} />
          </>
        )}
      </div>
    </div>
  );
}

// Agent Pipeline Visualization
function AgentPipeline({ agents }: { agents: AgentStatus[] }) {
  return (
    <div className="agent-flow mb-16">
      {agents.map((agent, index) => (
        <div
          key={agent.id}
          className={cn(
            "agent-step flex-1",
            agent.status === "processing" && "agent-step-active",
            agent.status === "complete" && "agent-step-complete",
            agent.status === "idle" && "agent-step-pending",
          )}
        >
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg mb-2 transition-all",
              agent.status === "processing" &&
                "animate-pulse bg-gradient-to-br from-blue-500 to-purple-500 scale-110",
              agent.status === "complete" &&
                "bg-gradient-to-br from-emerald-500 to-teal-500",
              agent.status === "idle" && "bg-gray-300",
            )}
          >
            {agent.status === "processing" ? (
              <svg
                className="w-8 h-8 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : agent.status === "complete" ? (
              "✅"
            ) : (
              agent.id.charAt(0).toUpperCase()
            )}
          </div>
          <div className="text-center">
            <div className="font-bold text-sm">
              {agent.name.split(" ")[0]}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {agent.status}
            </div>
            {agent.confidence > 0 && (
              <div className="text-xs font-mono bg-black/10 px-2 py-1 rounded mt-1">
                {Math.round(agent.confidence * 100)}%
              </div>
            )}
          </div>
          {index < agents.length - 1 && (
            <div
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 w-8 h-1",
                agents[index].status === "complete"
                  ? "bg-emerald-400"
                  : "bg-gray-200",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Health Vitals Display Component
function HealthVitalsDisplay({ data }: { data: { vitals: any } }) {
  const vitals = data.vitals;

  return (
    <div className="health-vitals mb-16">
      {/* Heart Rate */}
      <div className="vital-card vital-normal">
        <div className="text-3xl font-black text-emerald-600 mb-2">
          {vitals.heartRate}
          bpm
        </div>
        <div className="text-sm font-semibold text-emerald-800 uppercase tracking-wide">
          Heart Rate
        </div>
        <div className="text-xs text-emerald-700 mt-1">Normal (80-130)</div>
      </div>

      {/* Respiratory Rate */}
      <div
        className={cn(
          "vital-card",
          vitals.respiratoryRate > 30 ? "vital-warning" : "vital-normal",
        )}
      >
        <div className="text-3xl font-black text-orange-600 mb-2">
          {vitals.respiratoryRate}
          rpm
        </div>
        <div className="text-sm font-semibold text-orange-800 uppercase tracking-wide">
          Respiratory
        </div>
        <div className="text-xs text-orange-700 mt-1">
          {vitals.respiratoryRate > 30 ? "Elevated" : "Normal"} (20-30)
        </div>
      </div>

      {/* Temperature */}
      <div className="vital-card vital-normal">
        <div className="text-3xl font-black text-blue-600 mb-2">
          {vitals.temperature}
          °F
        </div>
        <div className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
          Temperature
        </div>
        <div className="text-xs text-blue-700 mt-1">Normal (98-99)</div>
      </div>

      {/* Oxygen */}
      <div className="vital-card vital-normal">
        <div className="text-3xl font-black text-purple-600 mb-2">
          {vitals.oxygenSaturation}%
        </div>
        <div className="text-sm font-semibold text-purple-800 uppercase tracking-wide">
          SpO₂
        </div>
        <div className="text-xs text-purple-700 mt-1">Normal (95-100)</div>
      </div>
    </div>
  );
}

// Simple grid for agent outputs (placeholder for future deep dives)
function AgentResultsGrid({ agents }: { agents: AgentStatus[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className={cn(
            "glass-medical p-6 rounded-3xl border-2",
            agent.status === "complete" && "border-emerald-300",
            agent.status === "idle" && "border-gray-200",
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold">{agent.name}</h3>
            <span className="text-xs uppercase tracking-wide text-gray-500">
              {agent.status}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {agent.status === "complete"
              ? "Analysis complete. See integrated risk and vitals above."
              : "Awaiting analysis in the 7-agent pipeline."}
          </p>
        </div>
      ))}
    </div>
  );
}

export default MultiAgentHealthDashboard;

