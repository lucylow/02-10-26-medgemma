import { describe, it, expect } from 'vitest';
import {
  recordInference,
  recordSafetyRejection,
  getMetricsBody,
  getMetricsContentType,
  inferenceCounter,
  latencyHistogram,
  safetyRejectionCounter,
  metricsAvailable,
} from './prometheus';

describe('prometheus metrics', () => {
  it('recordInference does not throw', () => {
    recordInference('pediscreen_v1', 'monitor', 'communication', 150);
    recordInference('pediscreen_v1', 'referral', 'motor', 500);
  });

  it('recordSafetyRejection does not throw', () => {
    recordSafetyRejection('toxicity');
    recordSafetyRejection('harmful_recommendation');
  });

  it('counters and histogram are defined', () => {
    expect(inferenceCounter).toBeDefined();
    expect(typeof inferenceCounter.inc).toBe('function');
    expect(latencyHistogram).toBeDefined();
    expect(typeof latencyHistogram.observe).toBe('function');
    expect(safetyRejectionCounter).toBeDefined();
    expect(typeof safetyRejectionCounter.inc).toBe('function');
  });

  it('metricsAvailable is boolean', () => {
    expect(typeof metricsAvailable).toBe('boolean');
  });

  it('getMetricsBody returns a string', async () => {
    const body = await getMetricsBody();
    expect(typeof body).toBe('string');
    expect(body.length).toBeGreaterThan(0);
    // When prom-client not loaded (e.g. jsdom), we get the fallback message
    if (!metricsAvailable) {
      expect(body).toContain('Metrics not available');
    }
  });

  it('getMetricsContentType returns a string', async () => {
    const ct = await getMetricsContentType();
    expect(typeof ct).toBe('string');
    expect(ct.length).toBeGreaterThan(0);
  });
});
