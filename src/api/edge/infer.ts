/**
 * Edge infer — HAI-DEF MedGemma pipeline (Pages 2–3).
 * Uses Chain-of-Thought + JSON prompt, adapter registry, and schema validation.
 * Portable: Request/Response for Node serverless or Deno (Lovable Edge).
 *
 * Expects env: MEDGEMMA_MODEL (or HF model id), HF_API_KEY when calling HF Inference API.
 */

import { buildInferPrompt, extractJsonFromModelOutput, parseAndValidateReport } from '@/lib/prompts/pediscreen';
import { getAdapter } from '@/lib/adapters';

const MEDGEMMA_MODEL = typeof process !== 'undefined' && process.env?.MEDGEMMA_MODEL
  ? process.env.MEDGEMMA_MODEL
  : 'google/medgemma-2b-it';

/**
 * Call Hugging Face text generation (when HF_API_KEY is set).
 * In browser or without key, this throws; use from edge/server only.
 */
async function callHfTextGeneration(
  prompt: string,
  model: string,
  apiKey: string
): Promise<{ generated_text: string }> {
  const res = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 512,
          temperature: 0.05,
          do_sample: false,
          repetition_penalty: 1.1,
        },
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HF Inference failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { generated_text?: string } | Array<{ generated_text?: string }>;
  const generated_text = Array.isArray(data)
    ? data[0]?.generated_text ?? ''
    : (data as { generated_text?: string }).generated_text ?? '';
  return { generated_text };
}

export interface EdgeInferPayload {
  age_months: number;
  domain?: string;
  observations: string;
  embedding_b64?: string;
  embedding_analysis?: string;
  adapter_id?: string;
}

export interface EdgeInferResponse {
  success: boolean;
  report: import('@/lib/prompts/pediscreen').PediScreenReportSchema;
  adapter?: import('@/lib/adapters').Adapter;
  error?: string;
}

/**
 * POST handler for /infer (edge/serverless).
 * 1. Resolve adapter 2. Build prompt 3. Call MedGemma 4. JSON parse + validate.
 */
export async function inferEdgeHandler(request: Request): Promise<Response> {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let payload: EdgeInferPayload;
  try {
    payload = (await request.json()) as EdgeInferPayload;
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { age_months, domain, observations, embedding_analysis, adapter_id } = payload;
  if (age_months == null || !observations || typeof observations !== 'string') {
    return new Response(
      JSON.stringify({ success: false, error: 'age_months and observations required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const adapter = await getAdapter(adapter_id || 'pediscreen_v1');
    const prompt = buildInferPrompt({
      age_months: Number(age_months),
      domain: domain ?? 'general',
      observations,
      embedding_analysis,
    });

    const apiKey = typeof process !== 'undefined' && process.env?.HF_API_KEY;
    let generated_text: string;

    if (apiKey) {
      const out = await callHfTextGeneration(prompt, adapter.hf_model, apiKey);
      generated_text = out.generated_text;
    } else {
      // No API key: return deterministic mock JSON for dev/Lovable compatibility
      generated_text = JSON.stringify({
        riskLevel: 'monitor',
        confidence: 0.72,
        summary: 'Developmental observations suggest follow-up screening in 30 days.',
        parentSummary: 'We suggest a follow-up check in about a month to see how things are going.',
        reasoningChain: [
          'Step 1: Age-expected communication milestones reviewed for ' + age_months + ' months.',
          'Step 2: Observations compared to ASQ-3 norms; no immediate referral criteria met.',
        ],
        evidence: [],
        recommendations: ['FOLLOWUP: Repeat ASQ-3 in 30 days'],
        calibrationMetadata: { platt_scale: 0.92, dataset: 'asq3_n=5000' },
      });
    }

    const jsonStr = extractJsonFromModelOutput(generated_text);
    if (!jsonStr) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid JSON in model output' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(jsonStr) as unknown;
    const report = parseAndValidateReport(parsed);
    if (!report) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid MedGemma JSON schema' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: EdgeInferResponse = { success: true, report, adapter };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/** Default export for Lovable Edge: handle fetch request */
export default inferEdgeHandler;
