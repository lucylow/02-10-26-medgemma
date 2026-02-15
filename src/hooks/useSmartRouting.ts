/**
 * useSmartRouting — Smart routing hook for multi-agent orchestration
 * Content-based + priority routing for PediScreen AI
 */

import { useState, useCallback, useMemo } from 'react';
import type { AgentType } from './useAgentState';
import { analyzePriority } from '@/lib/routing/SmartRouter';

export type RouteDecision = {
  primaryAgent: AgentType;
  fullPipeline: AgentType[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  rationale: string;
};

export function useSmartRouting(input: string, ageMonths: number) {
  const [analyzing, setAnalyzing] = useState(false);

  const routeDecision = useMemo((): RouteDecision => {
    return analyzeInputIntent(input, ageMonths);
  }, [input, ageMonths]);

  const executeRouting = useCallback(
    async (overrideInput?: string, overrideAge?: number) => {
      setAnalyzing(true);
      const inp = overrideInput ?? input;
      const age = overrideAge ?? ageMonths;

      // Brief delay for UX (simulates NLP analysis)
      await new Promise((r) => setTimeout(r, 300));

      const decision = analyzeInputIntent(inp, age);
      setAnalyzing(false);
      return decision;
    },
    [input, ageMonths]
  );

  return {
    decision: routeDecision,
    executeRouting,
    analyzing,
    recommendedAgent: routeDecision.primaryAgent,
    priority: routeDecision.priority,
  };
}

/**
 * Production-grade input classifier — integrates with SmartRouter
 */
function analyzeInputIntent(input: string, age: number): RouteDecision {
  const text = input.toLowerCase().trim();

  // EMERGENCY ROUTING (immediate safety)
  const emergencyKeywords = [
    'emergency',
    'seizure',
    'unresponsive',
    'breathing',
    'choking',
    'not breathing',
  ];
  if (emergencyKeywords.some((kw) => text.includes(kw))) {
    return {
      primaryAgent: 'safety',
      fullPipeline: ['intake', 'safety'],
      priority: 'urgent',
      confidence: 0.98,
      rationale: 'Emergency keywords detected — safety first',
    };
  }

  // Domain classification for rationale
  const domains = {
    language: [/words|says|talk|babble|name|point|speak|vocabulary/i],
    motor: [/walk|crawl|run|throw|stack|grasp|draw|climb|jump/i],
    social: [/eye|smile|share|hug|play|friend|wave|imitate/i],
    cognitive: [/puzzle|count|color|shape|sort|match|solve|pretend/i],
  };

  const domainScores: Record<string, number> = {};
  Object.entries(domains).forEach(([domain, patterns]) => {
    const matches = patterns.filter((p) => p.test(text)).length;
    domainScores[domain] = matches / patterns.length;
  });

  const topDomain =
    (Object.entries(domainScores).sort(([, a], [, b]) => b - a)[0]?.[0] as keyof typeof domains) ||
    'language';

  const isComplexCase = /concern|worry|delay|not.*expected/i.test(text);
  const hasHistory = /before|last.*time|progress/i.test(text);

  const priority = analyzePriority(input);
  const pipeline = getPipelineSync(text); // Sync pipeline selection

  return {
    primaryAgent: 'intake',
    fullPipeline: pipeline,
    priority,
    confidence: 0.92,
    rationale: `Domain: ${topDomain}, complexity: ${isComplexCase ? 'high' : 'low'}${hasHistory ? ', has history' : ''}`,
  };
}

/** Sync pipeline selection — mirrors SmartRouter logic */
function getPipelineSync(text: string): AgentType[] {
  const urgent = [
    /emergency/i,
    /seizure/i,
    /unresponsive/i,
    /breathing/i,
    /not breathing/i,
    /choking/i,
  ];
  if (urgent.some((r) => r.test(text))) return ['intake', 'safety'];

  const domainPatterns = [
    /words|says|talk|name|point|speak|vocabulary/i,
    /walk|crawl|stack|throw|grasp|climb|run|jump/i,
    /eye|smile|share|play|hug|wave|point|imitate/i,
    /stack|sort|match|problem|solve|pretend/i,
  ];
  const hasDomains = domainPatterns.some((r) => r.test(text));

  if (hasDomains) {
    return ['intake', 'embedding', 'temporal', 'medgemma', 'safety', 'summarizer'];
  }
  return ['intake', 'medgemma', 'safety'];
}
