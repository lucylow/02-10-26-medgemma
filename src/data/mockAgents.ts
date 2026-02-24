// src/data/mockAgents.ts - Production-grade mock data + error fallbacks
export const MOCK_HEALTH_AGENTS = {
  // Vision Agent (MedSigLIP)
  vision: {
    redReflex: { left: "NORMAL", right: "NORMAL", confidence: 0.97 },
    strabismus: { detected: false, confidence: 0.94 },
    drawingAnalysis: {
      gripPattern: "palm grip (typical 24mo)",
      fineMotorPercentile: 78,
      concerns: [] as string[],
    },
    // Truncated embedding for demo – in production this would be a full 768-dim vector
    imageEmbeddings: [[0.23, -0.45, 0.67]],
  },

  // Audio Agent (Whisper-Tiny)
  audio: {
    cryAnalysis: {
      urgency: "LOW" as const,
      dehydrationRisk: 0.12,
      painIndicators: false,
      confidence: 0.89,
    },
    speechMilestones: {
      wordCount: 18,
      combinesWords: false, // 24mo red flag
      percentile: 32,
      concerns: ["Limited 2-word combinations"],
    },
    // Truncated MFCC-style features for demo
    audioFeatures: [0.34, 0.67, -0.12],
  },

  // Development Agent (ASQ-3)
  development: {
    ageMonths: 24,
    domainScores: {
      communication: { raw: 12, cutoff: 18, percentile: 28, flag: true },
      grossMotor: { raw: 22, cutoff: 20, percentile: 72, flag: false },
      fineMotor: { raw: 19, cutoff: 21, percentile: 65, flag: false },
      problemSolving: { raw: 15, cutoff: 17, percentile: 45, flag: true },
      personalSocial: { raw: 20, cutoff: 19, percentile: 68, flag: false },
    },
    overallASQ3: { score: 88, percentile: 42, risk: "MEDIUM" as const },
  },

  // Synthesized Health Data
  synthesizedHealthData: {
    vitals: {
      heartRate: 124, // Normal 24mo: 80-130
      respiratoryRate: 32, // Elevated: 20-30 normal
      temperature: 98.6,
      oxygenSaturation: 98,
    },
    developmental: {
      ageMonths: 24,
      asq3Score: 88,
      languagePercentile: 28,
      motorPercentile: 68,
    },
    multimodal: {
      imageAnalysis: "Normal red reflex bilaterally. Palm grip typical for age.",
      audioAnalysis:
        "18 words detected. No 2-word combinations (24mo red flag).",
      riskSynthesis:
        "Primary concern: language delay. Monitor + speech evaluation.",
    },
  },

  // ERROR FALLBACK DATA
  fallbackHealthData: {
    vitals: {
      heartRate: 110,
      respiratoryRate: 28,
      temperature: 98.6,
      oxygenSaturation: 98,
    },
    developmental: {
      ageMonths: 24,
      asq3Score: 92,
      languagePercentile: 45,
      motorPercentile: 72,
    },
    multimodal: {
      imageAnalysis: "Fallback: Vision processing unavailable",
      audioAnalysis: "Fallback: Audio analysis unavailable",
      riskSynthesis:
        "Using cached baseline data. Recommend rescreening when agents are online.",
    },
  },

  // Agent Errors (12% failure rate simulation)
  agentErrors: [
    { agent: "audio-agent", error: "Microphone timeout - using cached features" },
    { agent: "vision-agent", error: "Low light conditions - reduced confidence" },
  ],
} as const;

