/**
 * Weights & Biases (W&B) tracing for HAI-DEF MedGemma inference.
 * Page 2 — Every inference → W&B run + metrics for model performance and eval.
 * Optional: when WANDB_API_KEY is unset (e.g. Lovable Cloud default), tracing is no-op.
 */

export interface TraceContext {
  span_id: string;
  adapter_id: string;
  prompt_hash: string;
  /** Only set when W&B init succeeded; use to log and finish. */
  _wandb?: { log: (metrics: Record<string, unknown>) => void; finish: () => Promise<void> };
}

export interface WandBInitConfig {
  adapter_id?: string;
  model_version?: string;
  domain?: string;
  prompt_hash?: string;
  [key: string]: unknown;
}

/** Generate a short hash for prompt identity (e.g. for provenance). */
export function hashPrompt(prompt: string): string {
  let h = 0;
  const s = prompt.slice(0, 2000);
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * Initialize a W&B trace for this inference. No-op when WANDB_API_KEY is unset.
 */
export async function initWandBTrace(
  project: string = 'pediscreen-prod',
  config: WandBInitConfig = {}
): Promise<TraceContext> {
  const span_id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `span_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const adapter_id = config?.adapter_id ?? 'unknown';
  const prompt_hash = config?.prompt_hash ?? '';

  const ctx: TraceContext = { span_id, adapter_id, prompt_hash };

  try {
    const apiKey =
      typeof process !== 'undefined' && process.env?.WANDB_API_KEY;
    if (!apiKey) return ctx;

    const wandb = (await import('@wandb/sdk')).default;
    await wandb.init({
      project,
      config: {
        adapter_id: config?.adapter_id,
        model_version: config?.model_version,
        domain: config?.domain,
        ...config,
      },
      tags: ['hai-def', 'medgemma', 'production'],
    });

    ctx._wandb = {
      log: (metrics: Record<string, unknown>) => {
        wandb.log(metrics);
      },
      finish: () => wandb.finish(),
    };
  } catch (_) {
    // W&B unavailable (e.g. edge runtime, no key); continue without tracing
  }

  return ctx;
}

export interface InferenceTraceMetrics {
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  risk_level: string;
  confidence: number;
  safety_score?: number;
}

/**
 * Log inference metrics to the current W&B run. No-op if trace was not initialized with W&B.
 */
export async function logInferenceTrace(
  trace: TraceContext,
  metrics: InferenceTraceMetrics
): Promise<void> {
  if (!trace._wandb) return;
  try {
    trace._wandb.log({
      inference_latency_ms: metrics.latency_ms,
      input_tokens: metrics.input_tokens,
      output_tokens: metrics.output_tokens,
      risk_level: metrics.risk_level,
      confidence: metrics.confidence,
      safety_score: metrics.safety_score ?? 1,
      step: Date.now(),
    });
  } catch (_) {
    // ignore log errors
  }
}

/**
 * Finish the W&B run and flush. Call once per inference after logInferenceTrace.
 */
export async function finishWandBTrace(trace: TraceContext): Promise<void> {
  if (!trace._wandb) return;
  try {
    await trace._wandb.finish();
  } catch (_) {
    // ignore finish errors
  }
}
