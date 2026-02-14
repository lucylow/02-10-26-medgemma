// functions/analyze/model_client.ts
// Helper for calling Hugging Face Inference API or a custom inference URL
// Deno + fetch. Exports callTextModel and callMultiModalModel.

export type ModelResponse = {
  ok: boolean;
  json?: unknown;
  text?: string;
  error?: string;
};

const DEFAULT_TIMEOUT = 15_000; // ms

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Call a text model (Hugging Face Inference API).
 * - modelName: e.g. "google/medgemma-2b-it" or "gpt2"
 * - hfApiKey: Hugging Face API key
 * - prompt: text prompt (we will instruct model to return JSON)
 */
export async function callTextModel(
  modelName: string,
  hfApiKey: string,
  prompt: string,
  maxTokens = 256
): Promise<ModelResponse> {
  try {
    const url = `https://api-inference.huggingface.co/models/${modelName}`;
    const body = JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: maxTokens, temperature: 0.2 },
    });
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfApiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body,
      },
      DEFAULT_TIMEOUT
    );

    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${txt}` };
    }
    const json = await res.json();
    // HF may return [{ generated_text: "..." }] or direct artifact; handle both
    if (Array.isArray(json) && json[0]?.generated_text) {
      return { ok: true, json };
    }
    return { ok: true, json };
  } catch (err: unknown) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Call a multimodal model endpoint (image + prompt). Uses multipart/form-data to send image + inputs.
 * modelNameOrUrl: HF model id or full URL to the inference endpoint
 * hfApiKey: token
 * imageBytes: Uint8Array of file
 * filename: original filename
 * prompt: text prompt
 */
export async function callMultimodalModel(
  modelNameOrUrl: string,
  hfApiKey: string,
  imageBytes: Uint8Array,
  filename: string,
  prompt: string
): Promise<ModelResponse> {
  try {
    const url = modelNameOrUrl.startsWith("http")
      ? modelNameOrUrl
      : `https://api-inference.huggingface.co/models/${modelNameOrUrl}`;
    const form = new FormData();
    const fileBlob = new Blob([imageBytes]);
    form.append("data", fileBlob, filename);
    form.append("inputs", prompt);
    form.append("options", JSON.stringify({ wait_for_model: true }));

    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfApiKey}`,
          Accept: "application/json",
        },
        body: form,
      },
      DEFAULT_TIMEOUT * 2 // images might take longer
    );

    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${txt}` };
    }
    const json = await res.json();
    return { ok: true, json };
  } catch (err: unknown) {
    return { ok: false, error: String(err) };
  }
}
