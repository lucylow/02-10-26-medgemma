/**
 * Stub for @opentelemetry/api when not installed (e.g. in Vitest without optional deps).
 */
const SpanStatusCode = { OK: 1, ERROR: 2 };

const noopSpan = {
  setStatus: () => {},
  setAttribute: () => {},
  recordException: () => {},
  end: () => {},
};

const tracer = {
  startSpan: (_name: string, _opts?: { attributes?: Record<string, unknown> }) => noopSpan,
};

const trace = {
  getTracer: () => tracer,
};

export { trace, SpanStatusCode };
export type Span = typeof noopSpan;
