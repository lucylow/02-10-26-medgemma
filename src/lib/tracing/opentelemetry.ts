/**
 * OpenTelemetry distributed tracing for PediScreen inference.
 * Page 3 — Span every layer (prompt → tokenization → model → postprocessing).
 * Works without an exporter (spans are no-op if no global TracerProvider is set).
 */

import { trace, SpanStatusCode, type Span } from '@opentelemetry/api';

const TRACER_NAME = 'pediscreen';
const TRACER_VERSION = '1.0.0';

function getEnv(name: string): string {
  if (typeof process === 'undefined' || !process.env) return name === 'DOMAIN' ? 'general' : 'unknown';
  const v = process.env[name];
  if (name === 'DOMAIN') return v ?? 'general';
  return v ?? 'unknown';
}
/**
 * Run an async function under a named span and record success/error.
 */
export async function traceInference<T>(
  operationName: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME, TRACER_VERSION);
  const span = tracer.startSpan(operationName, {
    attributes: {
      'pediscreen.adapter': getEnv('ADAPTER_ID'),
      'pediscreen.domain': getEnv('DOMAIN'),
      ...attributes,
    },
  });

  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
    return result;
  } catch (error) {
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.end();
    throw error;
  }
}

/**
 * Start a span manually for multi-step flows. Caller must end the span.
 */
export function startSpan(
  operationName: string,
  attributes?: Record<string, string | number | boolean>
): Span {
  const tracer = trace.getTracer(TRACER_NAME, TRACER_VERSION);
  return tracer.startSpan(operationName, {
    attributes: {
      'pediscreen.adapter': getEnv('ADAPTER_ID'),
      'pediscreen.domain': getEnv('DOMAIN'),
      ...attributes,
    },
  });
}
