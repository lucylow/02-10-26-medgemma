import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hashPrompt,
  initWandBTrace,
  logInferenceTrace,
  finishWandBTrace,
  type TraceContext,
  type InferenceTraceMetrics,
} from './wandb';

describe('wandb tracing', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('hashPrompt', () => {
    it('returns a short non-empty string', () => {
      const h = hashPrompt('Hello world');
      expect(h).toBeDefined();
      expect(typeof h).toBe('string');
      expect(h.length).toBeGreaterThan(0);
    });

    it('is deterministic for same input', () => {
      const p = 'Age: 24 months, observations: says 8 words';
      expect(hashPrompt(p)).toBe(hashPrompt(p));
    });

    it('differs for different inputs', () => {
      expect(hashPrompt('a')).not.toBe(hashPrompt('b'));
    });
  });

  describe('initWandBTrace', () => {
    it('returns TraceContext with span_id, adapter_id, prompt_hash when WANDB_API_KEY unset', async () => {
      const ctx = await initWandBTrace('pediscreen-prod', {
        adapter_id: 'pediscreen_v1',
        prompt_hash: 'abc',
      });
      expect(ctx.span_id).toBeDefined();
      expect(ctx.adapter_id).toBe('pediscreen_v1');
      expect(ctx.prompt_hash).toBe('abc');
      expect(ctx._wandb).toBeUndefined();
    });

    it('uses default project and adapter_id unknown when omitted', async () => {
      const ctx = await initWandBTrace();
      expect(ctx.adapter_id).toBe('unknown');
    });
  });

  describe('logInferenceTrace', () => {
    it('does not throw when _wandb is unset (no-op)', async () => {
      const trace: TraceContext = {
        span_id: 's1',
        adapter_id: 'a1',
        prompt_hash: 'h1',
      };
      await expect(
        logInferenceTrace(trace, {
          latency_ms: 100,
          input_tokens: 50,
          output_tokens: 20,
          risk_level: 'monitor',
          confidence: 0.85,
        })
      ).resolves.toBeUndefined();
    });

    it('accepts optional safety_score', async () => {
      const trace: TraceContext = { span_id: 's1', adapter_id: 'a1', prompt_hash: 'h1' };
      await expect(
        logInferenceTrace(trace, {
          latency_ms: 200,
          input_tokens: 10,
          output_tokens: 5,
          risk_level: 'referral',
          confidence: 0.9,
          safety_score: 0.95,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('finishWandBTrace', () => {
    it('does not throw when _wandb is unset (no-op)', async () => {
      const trace: TraceContext = { span_id: 's1', adapter_id: 'a1', prompt_hash: 'h1' };
      await expect(finishWandBTrace(trace)).resolves.toBeUndefined();
    });
  });
});
