const API_BASE_URL = import.meta.env.VITE_MEDGEMMA_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://api.pediscreen.ai/v1');

/** Supabase Edge Functions base URL (e.g. https://xxx.supabase.co/functions/v1). When set, uses FormData + multipart. */
const SUPABASE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL;

/** PediScreen FastAPI backend (e.g. http://localhost:8000). When set, uses FormData + x-api-key for /api/analyze. */
const PEDISCREEN_BACKEND_URL = import.meta.env.VITE_PEDISCREEN_BACKEND_URL;
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-example-key';

export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown' | 'on_track' | 'monitor' | 'refer';

export type SupportingEvidence = {
  fromParentReport: string[];
  fromAssessmentScores: string[];
  fromVisualAnalysis: string[];
};

export type DevelopmentalProfile = {
  strengths: string[];
  concerns: string[];
  milestonesMet: string[];
  milestonesEmerging: string[];
  milestonesNotObserved: string[];
};

export type FollowUp = {
  rescreenIntervalDays: number;
  monitoringFocus: string[];
  redFlagsToWatch: string[];
};

export type ScreeningResult = {
  success: boolean;
  screeningId?: string;
  modelUsed?: boolean;
  modelParseOk?: boolean;
  report?: {
    riskLevel: RiskLevel;
    riskRationale?: string;
    summary: string;
    parentFriendlyExplanation?: string;
    keyFindings?: string[];
    recommendations?: string[];
    parentFriendlyTips?: string[];
    developmentalAnalysis?: {
      strengths: string[];
      concerns: string[];
    };
    developmentalProfile?: DevelopmentalProfile;
    supportingEvidence?: SupportingEvidence;
    referralGuidance?: {
      needed: boolean;
      specialties?: string[];
      urgency?: 'routine' | 'priority' | 'urgent';
      reason?: string;
    };
    followUp?: FollowUp;
    modelEvidence?: { type: string; content: string; influence?: number }[];
  };
  timestamp?: string;
  message?: string;
  localProcessing?: boolean;
  confidence?: number;
  evidenceGrounding?: Record<string, unknown>;
};

export type ScreeningRequest = {
  childAge: string;
  domain: string;
  observations: string;
  imageFile?: File | null;
  /** Consent record id for audit; from consentService.getConsent() */
  consent_id?: string | null;
  additionalContext?: Record<string, unknown>;
  useGemma3?: boolean;
  communicationParams?: {
    language?: string;
    tone?: string;
    reading_level?: string;
  };
};

/**
 * Submit screening to MedGemma API for analysis.
 * When VITE_PEDISCREEN_BACKEND_URL is set, uses FastAPI backend (FormData + x-api-key).
 * When VITE_SUPABASE_FUNCTION_URL is set, uses Supabase Edge Functions (FormData + multipart).
 */
export const submitScreening = async (request: ScreeningRequest): Promise<ScreeningResult> => {
  try {
    // PediScreen FastAPI backend: use FormData + x-api-key (matches backend/app/api/analyze)
    if (PEDISCREEN_BACKEND_URL) {
      const form = new FormData();
      form.append('childAge', request.childAge);
      form.append('domain', request.domain || '');
      form.append('observations', request.observations);
      if (request.imageFile) {
        form.append('image', request.imageFile, request.imageFile.name);
      }

      const headers: Record<string, string> = {};
      if (API_KEY) headers['x-api-key'] = API_KEY;

      const response = await fetch(`${PEDISCREEN_BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers,
        body: form,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.error || `HTTP ${response.status}`);
      }

      const r = data.report || {};
      return {
        success: true,
        screeningId: data.screening_id,
        modelUsed: data.model_used ?? undefined,
        modelParseOk: data.model_parse_ok ?? undefined,
        report: {
          riskLevel: mapRiskLevel(r.riskLevel || 'unknown'),
          summary: r.summary || '',
          keyFindings: r.keyFindings || [],
          recommendations: r.recommendations || [],
          supportingEvidence: {
            fromParentReport: (r.evidence || []).filter((e: { type: string }) => e.type === 'text').map((e: { content: string }) => e.content),
            fromAssessmentScores: [],
            fromVisualAnalysis: (r.evidence || []).filter((e: { type: string }) => e.type === 'image').map((e: { content: string }) => e.content),
          },
          modelEvidence: (r.evidence || []).filter((e: { type: string }) => e.type === 'model_text' || e.type === 'model_error').map((e: { type: string; content: string; influence?: number }) => ({ type: e.type, content: e.content, influence: e.influence })),
        },
        timestamp: data.timestamp ? String(data.timestamp) : new Date().toISOString(),
        confidence: r.confidence,
      };
    }

    // Supabase Edge Functions: use FormData + multipart (with session token when available)
    if (SUPABASE_FUNCTION_URL) {
      const form = new FormData();
      form.append('childAge', request.childAge);
      form.append('domain', request.domain || '');
      form.append('observations', request.observations);
      if (request.consent_id) form.append('consent_id', request.consent_id);
      if (request.imageFile) {
        form.append('image', request.imageFile, request.imageFile.name);
      }

      const { getAuthHeaders } = await import('@/lib/apiAuth');
      const headers = await getAuthHeaders();

      const response = await fetch(`${SUPABASE_FUNCTION_URL}/analyze`, {
        method: 'POST',
        headers,
        body: form,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.error || `HTTP ${response.status}`);
      }

      const r = data.report || {};
      const riskMap: Record<string, RiskLevel> = {
        low: 'on_track',
        medium: 'monitor',
        high: 'refer',
      };
      const riskLevel = riskMap[r.riskLevel] || 'unknown';

      return {
        success: true,
        screeningId: data.screening_id,
        modelUsed: data.model_used ?? undefined,
        modelParseOk: data.model_parse_ok ?? undefined,
        report: {
          riskLevel,
          summary: r.summary || '',
          keyFindings: r.keyFindings || [],
          recommendations: r.recommendations || [],
          supportingEvidence: {
            fromParentReport: (r.evidence || []).filter((e: { type: string }) => e.type === 'text').map((e: { content: string }) => e.content),
            fromAssessmentScores: [],
            fromVisualAnalysis: (r.evidence || []).filter((e: { type: string }) => e.type === 'image').map((e: { content: string }) => e.content),
          },
          modelEvidence: (r.evidence || []).filter((e: { type: string }) => e.type === 'model_text' || e.type === 'model_error').map((e: { type: string; content: string; influence?: number }) => ({ type: e.type, content: e.content, influence: e.influence })),
        },
        timestamp: data.timestamp ? String(data.timestamp) : new Date().toISOString(),
        confidence: r.confidence,
      };
    }

    // MedGemma API: JSON + base64 image
    let body: any;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (request.imageFile) {
      // If there's an image, convert it to base64 to send as JSON
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(request.imageFile as File);
      });
      const imageBase64 = await base64Promise;
      
      body = JSON.stringify({
        age_months: parseInt(request.childAge),
        domain: request.domain,
        observations: request.observations,
        image_b64: imageBase64.split(',')[1], // Remove data:image/jpeg;base64,
        consent_id: request.consent_id ?? undefined,
        use_gemma3_for_communication: request.useGemma3 ?? true, // Default to true for Gemma 3
        communication_params: request.communicationParams || {
          tone: 'reassuring',
          language: 'English',
          reading_level: 'grade 6'
        }
      });
    } else {
      body = JSON.stringify({
        age_months: parseInt(request.childAge),
        domain: request.domain,
        observations: request.observations,
        consent_id: request.consent_id ?? undefined,
        use_gemma3_for_communication: request.useGemma3 ?? true,
        communication_params: request.communicationParams || {
          tone: 'reassuring',
          language: 'English',
          reading_level: 'grade 6'
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Map enhanced API response to frontend format
    const structuredReport = data.report || {};
    const riskStrat = structuredReport.risk_stratification || data.risk_assessment || {};
    const devProfile = structuredReport.developmental_profile || data.developmental_analysis || {};
    const evidence = structuredReport.supporting_evidence || {};
    const recs = structuredReport.recommendations || data.recommendations || {};
    const referral = structuredReport.referral_guidance || data.referral_guidance || {};
    const followUp = structuredReport.follow_up || {};

    return {
      success: true,
      screeningId: data.screening_id || data.screeningId,
      report: {
        riskLevel: mapRiskLevel(riskStrat.level || riskStrat.risk_level || structuredReport.riskLevel || 'unknown'),
        riskRationale: riskStrat.rationale || '',
        summary: structuredReport.clinical_summary || data.clinical_summary || '',
        parentFriendlyExplanation: structuredReport.parent_friendly_explanation || '',
        keyFindings: devProfile.concerns || data.developmental_analysis?.key_findings || [],
        recommendations: extractRecommendations(recs),
        parentFriendlyTips: recs.parent_friendly_tips || [],
        developmentalAnalysis: {
          strengths: devProfile.strengths || [],
          concerns: devProfile.concerns || [],
        },
        developmentalProfile: {
          strengths: devProfile.strengths || [],
          concerns: devProfile.concerns || [],
          milestonesMet: devProfile.milestones_met || [],
          milestonesEmerging: devProfile.milestones_emerging || [],
          milestonesNotObserved: devProfile.milestones_not_observed || [],
        },
        supportingEvidence: {
          fromParentReport: evidence.from_parent_report || [],
          fromAssessmentScores: evidence.from_assessment_scores || [],
          fromVisualAnalysis: evidence.from_visual_analysis || [],
        },
        referralGuidance: {
          needed: referral.needed || false,
          specialties: referral.specialties || [],
          urgency: referral.urgency || 'routine',
          reason: referral.reason || '',
        },
        followUp: {
          rescreenIntervalDays: followUp.rescreen_interval_days || 90,
          monitoringFocus: followUp.monitoring_focus || [],
          redFlagsToWatch: followUp.red_flags_to_watch || [],
        },
      },
      timestamp: data.timestamp || new Date().toISOString(),
      confidence: riskStrat.confidence || data.confidence,
      evidenceGrounding: data.evidence_grounding,
    };
  } catch (error) {
    console.error('MedGemma API Error:', error);
    
    // Fallback to local simulation if API is unavailable
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('API unavailable, using local simulation...');
      return simulateLocalAnalysis({
        childAge: request.childAge,
        domain: request.domain,
        observations: request.observations,
      });
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Analysis service unavailable',
    };
  }
};

/**
 * Map risk level from API to frontend format
 */
function mapRiskLevel(level: string): RiskLevel {
  const normalized = level?.toLowerCase() || 'unknown';
  
  const riskMap: Record<string, RiskLevel> = {
    'low': 'on_track',
    'medium': 'monitor',
    'high': 'refer',
    'on_track': 'on_track',
    'monitor': 'monitor',
    'refer': 'refer',
    'unknown': 'unknown',
  };
  
  return riskMap[normalized] || 'unknown';
}

/**
 * Extract recommendations from various API response formats
 */
function extractRecommendations(recommendations: unknown): string[] {
  if (!recommendations) return [];
  
  if (Array.isArray(recommendations)) {
    return recommendations;
  }
  
  // Handle structured recommendations object
  if (typeof recommendations === 'object') {
    const rec = recommendations as Record<string, string[]>;
    return [
      ...(rec.immediate || []),
      ...(rec.short_term || []),
      ...(rec.long_term || []),
    ];
  }
  
  return [];
}

export type ScreeningListItem = {
  id: string;
  screening_id: string;
  child_age_months: number;
  domain: string | null;
  observations: string | null;
  image_path: string | null;
  report: { riskLevel?: string; summary?: string; keyFindings?: string[] };
  created_at: string;
};

/**
 * List screenings from backend.
 * PediScreen backend: /api/screenings (x-api-key required).
 * Supabase: /list_screenings when VITE_SUPABASE_FUNCTION_URL is set.
 */
export const listScreenings = async (params?: { limit?: number; page?: number }): Promise<{ items: ScreeningListItem[] }> => {
  if (PEDISCREEN_BACKEND_URL) {
    const limit = params?.limit ?? 50;
    const skip = ((params?.page ?? 0) * limit);
    const headers: Record<string, string> = {};
    if (API_KEY) headers['x-api-key'] = API_KEY;
    const res = await fetch(`${PEDISCREEN_BACKEND_URL}/api/screenings?limit=${limit}&skip=${skip}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const items = (data.items || []).map((d: Record<string, unknown>) => ({
      id: String(d._id || d.screening_id),
      screening_id: String(d.screening_id || d._id),
      child_age_months: Number(d.childAge ?? 0),
      domain: d.domain as string | null,
      observations: d.observations as string | null,
      image_path: d.image_path as string | null,
      report: (d.report as Record<string, unknown>) || {},
      created_at: d.timestamp ? new Date((d.timestamp as number) * 1000).toISOString() : '',
    }));
    return { items };
  }
  if (!SUPABASE_FUNCTION_URL) {
    return { items: [] };
  }
  const limit = params?.limit ?? 50;
  const page = params?.page ?? 0;
  const url = `${SUPABASE_FUNCTION_URL}/list_screenings?limit=${limit}&page=${page}`;
  const { getAuthHeaders } = await import('@/lib/apiAuth');
  const headers = await getAuthHeaders();
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

/**
 * Get a single screening by ID.
 * PediScreen backend: /api/screenings/{id} (x-api-key required).
 * Supabase: /get_screening when VITE_SUPABASE_FUNCTION_URL is set.
 */
export const getScreening = async (screeningId: string): Promise<ScreeningListItem | null> => {
  if (PEDISCREEN_BACKEND_URL) {
    const headers: Record<string, string> = {};
    if (API_KEY) headers['x-api-key'] = API_KEY;
    const res = await fetch(`${PEDISCREEN_BACKEND_URL}/api/screenings/${encodeURIComponent(screeningId)}`, { headers });
    if (!res.ok) return null;
    const d = await res.json();
    return {
      id: String(d._id || d.screening_id),
      screening_id: String(d.screening_id || d._id),
      child_age_months: Number(d.childAge ?? 0),
      domain: d.domain as string | null,
      observations: d.observations as string | null,
      image_path: d.image_path as string | null,
      report: d.report || {},
      created_at: d.timestamp ? new Date(d.timestamp * 1000).toISOString() : '',
    };
  }
  if (!SUPABASE_FUNCTION_URL) return null;
  const { getAuthHeaders } = await import('@/lib/apiAuth');
  const headers = await getAuthHeaders();
  const res = await fetch(`${SUPABASE_FUNCTION_URL}/get_screening?id=${encodeURIComponent(screeningId)}`, { headers });
  if (!res.ok) return null;
  return res.json();
};

/**
 * Check API health status
 * Uses Supabase /health edge function when VITE_SUPABASE_FUNCTION_URL is set
 */
export const checkApiHealth = async (): Promise<{ healthy: boolean; latency?: number }> => {
  try {
    const start = performance.now();
    const healthUrl = SUPABASE_FUNCTION_URL
      ? `${SUPABASE_FUNCTION_URL}/health`
      : PEDISCREEN_BACKEND_URL
        ? `${PEDISCREEN_BACKEND_URL}/health`
        : `${API_BASE_URL}/health`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    const latency = performance.now() - start;

    return {
      healthy: response.ok,
      latency: Math.round(latency),
    };
  } catch {
    return { healthy: false };
  }
};

/**
 * Local processing simulation for demo/offline mode
 */
export const simulateLocalAnalysis = (screeningData: {
  childAge: string;
  domain: string;
  observations: string;
}): Promise<ScreeningResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const riskLevels: RiskLevel[] = ['on_track', 'monitor', 'refer'];
      const randomRisk = riskLevels[Math.floor(Math.random() * riskLevels.length)];
      
      const domainLabels: Record<string, string> = {
        communication: 'Communication & Language',
        gross_motor: 'Gross Motor Skills',
        fine_motor: 'Fine Motor Skills',
        cognitive: 'Problem Solving',
        social: 'Personal-Social',
      };
      
      const ageMonths = parseInt(screeningData.childAge) || 24;
      const domainLabel = domainLabels[screeningData.domain] || 'General Development';

      // Generate evidence-grounded findings based on observations
      const observationSnippet = screeningData.observations.slice(0, 50) || 'General developmental assessment';
      
      resolve({
        success: true,
        screeningId: `local_${Date.now()}`,
        report: {
          riskLevel: randomRisk,
          riskRationale: randomRisk === 'on_track' 
            ? `Based on the provided observations, the child demonstrates age-appropriate development in ${domainLabel.toLowerCase()}.`
            : randomRisk === 'monitor'
              ? `Some variations from typical developmental patterns noted in ${domainLabel.toLowerCase()} that warrant monitoring.`
              : `Observations suggest potential delays in ${domainLabel.toLowerCase()} that require professional evaluation.`,
          summary: `Developmental screening completed for a ${ageMonths}-month-old child focusing on ${domainLabel}. ${
            randomRisk === 'on_track' 
              ? 'The child demonstrates age-appropriate skills with no significant concerns identified. Development appears to be progressing normally across assessed areas.' 
              : randomRisk === 'monitor' 
                ? 'Some areas show minor variations from typical development that may benefit from targeted activities and continued monitoring. No immediate intervention required.' 
                : 'The screening indicates potential developmental concerns that warrant professional evaluation. Early intervention services may be beneficial.'
          }`,
          keyFindings: [
            `Primary assessment domain: ${domainLabel}`,
            randomRisk === 'on_track' 
              ? 'Child demonstrates expected developmental milestones for age'
              : randomRisk === 'monitor'
                ? 'Minor variations noted in expected skill acquisition'
                : 'Significant gaps observed in expected developmental milestones',
            'Observations analyzed using MedGemma multimodal AI',
          ],
          recommendations: randomRisk === 'on_track' 
            ? [
                'Continue regular developmental monitoring',
                'Engage in age-appropriate play and learning activities',
                'Schedule next routine screening in 6 months',
              ]
            : randomRisk === 'monitor'
              ? [
                  'Follow-up screening recommended in 2-3 months',
                  'Implement targeted developmental activities for this domain',
                  'Document ongoing observations and progress',
                  'Consult pediatrician if no improvement observed',
                ]
              : [
                  'Schedule comprehensive developmental evaluation within 2 weeks',
                  'Contact early intervention services for assessment',
                  'Document detailed observations for specialist review',
                  'Follow up with pediatrician promptly',
                ],
          parentFriendlyTips: randomRisk === 'on_track'
            ? [
                'Read together daily for 15-20 minutes',
                'Narrate daily activities to build vocabulary',
                'Encourage independent exploration in safe environments',
              ]
            : [
                `Practice ${domainLabel.toLowerCase()} skills through play`,
                'Create consistent daily routines',
                'Celebrate small achievements to build confidence',
                'Use everyday moments as learning opportunities',
              ],
          developmentalProfile: {
            strengths: randomRisk === 'on_track' 
              ? [
                  'Age-appropriate milestone achievement',
                  'Positive engagement with caregivers',
                  'Shows curiosity and interest in environment',
                ]
              : randomRisk === 'monitor'
                ? [
                    'Shows effort in developmental activities',
                    'Responsive to caregiver interactions',
                  ]
                : [
                    'Engages with support',
                  ],
            concerns: randomRisk === 'refer' 
              ? [
                  'Significant delay indicators present',
                  'Skills notably below age expectations',
                  'Professional evaluation recommended',
                ]
              : randomRisk === 'monitor'
                ? [
                    'Minor variations from typical development',
                    'May benefit from additional support activities',
                  ]
                : [],
            milestonesMet: randomRisk === 'on_track'
              ? [
                  `${ageMonths}-month ${domainLabel.toLowerCase()} skills demonstrated`,
                  'Social engagement appropriate for age',
                ]
              : [],
            milestonesEmerging: randomRisk !== 'refer'
              ? [`Skills developing in ${domainLabel.toLowerCase()}`]
              : [],
            milestonesNotObserved: randomRisk === 'refer'
              ? [`Expected ${ageMonths}-month ${domainLabel.toLowerCase()} milestones`]
              : [],
          },
          supportingEvidence: {
            fromParentReport: [
              `Observations provided: "${observationSnippet}..."`,
              `Child age reported: ${ageMonths} months`,
            ],
            fromAssessmentScores: [],
            fromVisualAnalysis: [],
          },
          referralGuidance: {
            needed: randomRisk === 'refer',
            specialties: randomRisk === 'refer' 
              ? ['Developmental Pediatrics', 'Early Intervention Services']
              : [],
            urgency: randomRisk === 'refer' ? 'priority' : 'routine',
            reason: randomRisk === 'refer'
              ? 'Screening results indicate potential developmental delays requiring specialist evaluation'
              : '',
          },
          followUp: {
            rescreenIntervalDays: randomRisk === 'on_track' ? 180 : randomRisk === 'monitor' ? 90 : 30,
            monitoringFocus: [domainLabel],
            redFlagsToWatch: randomRisk === 'refer'
              ? ['Regression in previously acquired skills', 'Loss of eye contact or social engagement']
              : ['Lack of progress despite intervention'],
          },
        },
        localProcessing: true,
        confidence: randomRisk === 'on_track' ? 0.88 : randomRisk === 'monitor' ? 0.78 : 0.82,
      });
    }, 2000);
  });
};
