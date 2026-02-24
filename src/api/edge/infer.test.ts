import { describe, it, expect } from 'vitest';
import { inferEdgeHandler } from './infer';

describe('inferEdgeHandler', () => {
  it('OPTIONS returns 204', async () => {
    const res = await inferEdgeHandler(new Request('http://x/', { method: 'OPTIONS' }));
    expect(res.status).toBe(204);
  });

  it('non-POST returns 405', async () => {
    const res = await inferEdgeHandler(new Request('http://x/', { method: 'GET' }));
    expect(res.status).toBe(405);
    const j = await res.json();
    expect(j.error).toContain('Method not allowed');
  });

  it('invalid JSON body returns 400', async () => {
    const res = await inferEdgeHandler(
      new Request('http://x/', { method: 'POST', body: 'not json' })
    );
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toContain('Invalid JSON');
  });

  it('missing age_months or observations returns 400', async () => {
    const res = await inferEdgeHandler(
      new Request('http://x/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age_months: 24 }),
      })
    );
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toContain('required');
  });

  it('returns 200 with report when no HF_API_KEY (mock path)', async () => {
    const res = await inferEdgeHandler(
      new Request('http://x/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age_months: 24,
          observations: 'Says 8 words, not pointing',
          domain: 'communication',
        }),
      })
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.report).toBeDefined();
    expect(j.report.riskLevel).toBe('monitor');
    expect(j.report.confidence).toBe(0.72);
    expect(j.report.reasoningChain).toBeDefined();
    expect(Array.isArray(j.report.reasoningChain)).toBe(true);
    expect(j.adapter).toBeDefined();
    expect(j.adapter.id).toBe('pediscreen_v1');
  });
});
