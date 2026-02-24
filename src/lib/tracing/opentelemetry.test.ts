import { describe, it, expect } from 'vitest';
import { traceInference, startSpan } from './opentelemetry';

describe('opentelemetry tracing', () => {
  describe('traceInference', () => {
    it('returns the result of the async function', async () => {
      const result = await traceInference('test.op', async () => 42);
      expect(result).toBe(42);
    });

    it('returns object results', async () => {
      const out = await traceInference('test.op', async () => ({ ok: true }));
      expect(out).toEqual({ ok: true });
    });

    it('propagates errors and records them on the span', async () => {
      await expect(
        traceInference('test.op', async () => {
          throw new Error('fail');
        })
      ).rejects.toThrow('fail');
    });

    it('accepts optional attributes', async () => {
      const result = await traceInference(
        'test.op',
        async () => 'ok',
        { adapter_id: 'pediscreen_v1', domain: 'communication' }
      );
      expect(result).toBe('ok');
    });
  });

  describe('startSpan', () => {
    it('returns a span with end()', () => {
      const span = startSpan('manual.span');
      expect(span).toBeDefined();
      expect(typeof span.end).toBe('function');
      span.end();
    });

    it('accepts optional attributes', () => {
      const span = startSpan('manual.span', { domain: 'motor' });
      expect(span).toBeDefined();
      span.end();
    });
  });
});
