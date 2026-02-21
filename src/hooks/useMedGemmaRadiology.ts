/**
 * useMedGemmaRadiology — Production radiology inference (Bone Age, ROP).
 * When backend exposes radiology-specific endpoints, use this hook to analyze
 * hand X-rays (bone age) and fundus images (ROP). Otherwise falls back to
 * generic analyze or mock.
 */
import { useCallback, useState } from 'react';

const API_BASE = import.meta.env.VITE_PEDISCREEN_BACKEND_URL?.replace(/\/api\/?$/, '')
  || (import.meta.env.DEV ? 'http://localhost:8000' : 'https://api.pediscreen.ai');
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-example-key';

function authHeaders(): Record<string, string> {
  return API_KEY ? { 'x-api-key': API_KEY } : {};
}

export type BoneAgeResult = {
  bone_age_months?: number;
  chronological_age_months?: number;
  z_score?: number;
  confidence?: number;
  icd10?: string[];
};

export type ROPResult = {
  zone?: 'I' | 'II' | 'III';
  stage?: 1 | 2 | 3 | 'none';
  plus_disease?: boolean;
  confidence?: number;
};

function parseJsonFromText(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function useMedGemmaRadiology() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeBoneAge = useCallback(async (imageFile: File | string): Promise<BoneAgeResult> => {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      if (typeof imageFile === 'string') {
        const res = await fetch(imageFile);
        const blob = await res.blob();
        form.append('image', blob, 'xray.jpg');
      } else {
        form.append('image', imageFile, imageFile.name);
      }
      form.append('task', 'bone_age');

      const res = await fetch(`${API_BASE}/api/radiology/analyze-bone-age`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          const msg = (json as { detail?: string }).detail ?? text;
          throw new Error(msg);
        } catch (e) {
          if (e instanceof Error) throw e;
          throw new Error(text);
        }
      }

      const data = (await res.json()) as {
        result?: string;
        bone_age_months?: number;
        [k: string]: unknown;
      };
      if (data.bone_age_months != null) {
        return {
          bone_age_months: data.bone_age_months,
          chronological_age_months: data.chronological_age_months as number | undefined,
          z_score: data.z_score as number | undefined,
          confidence: data.confidence as number | undefined,
          icd10: data.icd10 as string[] | undefined,
        };
      }
      const raw = (data.result ?? data.generated_text ?? data.text ?? '') as string;
      return parseJsonFromText(raw) as BoneAgeResult;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeROP = useCallback(async (imageFile: File | string): Promise<ROPResult> => {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      if (typeof imageFile === 'string') {
        const res = await fetch(imageFile);
        const blob = await res.blob();
        form.append('image', blob, 'fundus.jpg');
      } else {
        form.append('image', imageFile, imageFile.name);
      }
      form.append('task', 'rop');

      const res = await fetch(`${API_BASE}/api/radiology/analyze-rop`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          const msg = (json as { detail?: string }).detail ?? text;
          throw new Error(msg);
        } catch (e) {
          if (e instanceof Error) throw e;
          throw new Error(text);
        }
      }

      const data = (await res.json()) as { result?: string; zone?: string; [k: string]: unknown };
      if (data.zone != null || data.stage != null) {
        return {
          zone: data.zone as 'I' | 'II' | 'III' | undefined,
          stage: data.stage as 1 | 2 | 3 | 'none' | undefined,
          plus_disease: data.plus_disease as boolean | undefined,
          confidence: data.confidence as number | undefined,
        };
      }
      const raw = (data.result ?? data.generated_text ?? data.text ?? '') as string;
      return parseJsonFromText(raw) as ROPResult;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  return { analyzeBoneAge, analyzeROP, loading, error };
}
