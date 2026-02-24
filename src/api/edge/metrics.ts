/**
 * GET /metrics — Prometheus scrape endpoint for HAI-DEF inference metrics.
 * Page 6 — Latency, throughput, safety rejections.
 */

import { getMetricsContentType, getMetricsBody } from '@/lib/metrics/prometheus';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function metricsEdgeHandler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const contentType = await getMetricsContentType();
    const body = await getMetricsBody();
    return new Response(body, {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': contentType },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`# Error: ${message}\n`, {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
    });
  }
}

export default metricsEdgeHandler;
