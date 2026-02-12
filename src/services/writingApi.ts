/**
 * Technical writing API — generates research-grade prose via MedGemma.
 */

const API_BASE = import.meta.env.VITE_MEDGEMMA_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000' : 'https://api.pediscreen.ai');

export type WritingMode =
  | 'research_longform'
  | 'slide_deck'
  | 'executive_summary'
  | 'judge_pitch';

export type Persona = 'clinical' | 'regulatory' | 'vc' | 'technical';

export type TechnicalWritingRequest = {
  product_name?: string;
  model_name?: string;
  target_audience: string;
  writing_mode: WritingMode;
  key_points: string[];
  constraints?: string[];
  word_count?: number;
  persona?: Persona;
};

export type ReportSectionData = {
  id: string;
  title: string;
  content: string;
  locked: boolean;
};

export type StructuredWritingResponse = {
  mode: WritingMode;
  sections?: ReportSectionData[];
  slides?: { slide: string; content: string }[];
  version: string;
  disclaimer: string;
  citation_placeholders: string[];
};

export const generateStructuredWriting = async (
  req: TechnicalWritingRequest
): Promise<StructuredWritingResponse> => {
  const base = API_BASE.replace(/\/api\/?$/, '');
  const res = await fetch(`${base}/api/writing/generate-structured`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_name: req.product_name ?? 'PediScreen AI',
      model_name: req.model_name ?? 'MedGemma',
      target_audience: req.target_audience,
      writing_mode: req.writing_mode,
      key_points: req.key_points,
      constraints: req.constraints ?? [],
      word_count: req.word_count ?? 600,
      persona: req.persona ?? 'clinical',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
};

export const saveReportRevision = async (
  reportId: string,
  aiVersion: string,
  humanVersion: string,
  editedBy: string
): Promise<void> => {
  const base = API_BASE.replace(/\/api\/?$/, '');
  const res = await fetch(`${base}/api/writing/save-revision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report_id: reportId,
      ai_version: aiVersion,
      human_version: humanVersion,
      edited_by: editedBy,
    }),
  });
  if (!res.ok) throw new Error('Failed to save revision');
};
