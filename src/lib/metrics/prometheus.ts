/**
 * Production metrics (Prometheus) for HAI-DEF inference.
 * Page 6 — Golden signals: latency, throughput, error rates, safety rejections.
 * Safe to use in Node/serverless; in Edge/browser prom-client may be unavailable (no-op).
 */

type Counter = {
  inc: (labels?: Record<string, string>, value?: number) => void;
};

type Histogram = {
  observe: (labels: Record<string, string>, value: number) => void;
};

let inferenceCounter: Counter;
let latencyHistogram: Histogram;
let safetyRejectionCounter: Counter;
let metricsAvailable = false;
let register: { contentType: string; metrics: () => string | Promise<string> } | null = null;

function noopCounter(): Counter {
  return { inc: () => {} };
}
function noopHistogram(): Histogram {
  return { observe: () => {} };
}

inferenceCounter = noopCounter();
latencyHistogram = noopHistogram();
safetyRejectionCounter = noopCounter();

async function initPrometheus(): Promise<boolean> {
  if (metricsAvailable) return true;
  try {
    const client = await import('prom-client');
    const c = client.default;
    inferenceCounter = new c.Counter({
      name: 'pediscreen_inference_total',
      help: 'Total inferences by risk level',
      labelNames: ['adapter_id', 'risk_level', 'domain'],
    });
    latencyHistogram = new c.Histogram({
      name: 'pediscreen_inference_latency_ms',
      help: 'Inference latency distribution',
      labelNames: ['adapter_id'],
      buckets: [50, 100, 250, 500, 1000, 2000],
    });
    safetyRejectionCounter = new c.Counter({
      name: 'pediscreen_safety_rejection_total',
      help: 'Safety rejections by reason',
      labelNames: ['reason'],
    });
    register = c.register;
    metricsAvailable = true;
    return true;
  } catch {
    return false;
  }
}

// Eager init in Node-like env (has process and require or import.meta)
if (typeof process !== 'undefined' && process.env?.PEDISCREEN_METRICS !== 'false') {
  void initPrometheus();
}

export { inferenceCounter, latencyHistogram, safetyRejectionCounter, metricsAvailable };

/**
 * Record a successful inference for Prometheus.
 */
export function recordInference(
  adapter_id: string,
  risk_level: string,
  domain: string,
  latencyMs: number
): void {
  inferenceCounter.inc({ adapter_id, risk_level, domain }, 1);
  latencyHistogram.observe({ adapter_id }, latencyMs);
}

/**
 * Record a safety rejection (e.g. toxicity or harmful recommendation).
 */
export function recordSafetyRejection(reason: string): void {
  safetyRejectionCounter.inc({ reason }, 1);
}

/**
 * Return Prometheus scrape payload. Only works when prom-client is loaded (Node).
 */
export async function getMetricsContentType(): Promise<string> {
  const ok = await initPrometheus();
  return ok && register ? register.contentType : 'text/plain';
}

/**
 * Return Prometheus scrape body. Only works when prom-client is loaded (Node).
 */
export async function getMetricsBody(): Promise<string> {
  const ok = await initPrometheus();
  if (!ok || !register) return '# Metrics not available (e.g. edge runtime)\n';
  const out = register.metrics();
  return typeof out === 'string' ? out : await out;
}
