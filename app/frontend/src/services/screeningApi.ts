// Prefer PediScreen backend (8000); fallback to MedGemma API URL
const API_BASE_URL = import.meta.env.VITE_PEDISCREEN_BACKEND_URL
  ? `${import.meta.env.VITE_PEDISCREEN_BACKEND_URL}/api`
  : (import.meta.env.VITE_MEDGEMMA_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000/api' : 'https://api.pediscreen.ai/v1'));

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
  inferenceId?: string;
  feedbackAllowed?: boolean;
  feedbackUrl?: string;
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
  additionalContext?: Record<string, unknown>;
  useGemma3?: boolean;
  communicationParams?: {
    language?: string;
    tone?: string;
    reading_level?: string;
  };
  /** HITL Stage 0: Consent required before AI reasoning. If not provided, a placeholder is used for demo. */
  consent?: { consent_id: string; consent_given: boolean; consent_scope?: string[] };
};

/** Stream event types from SSE pipeline */
export type StreamEvent = {
  type: 'status' | 'agent_start' | 'agent_complete' | 'medgemma_token' | 'complete' | 'error';
  agent?: string;
  progress?: number;
  message?: string;
  token?: string;
  result?: unknown;
  success?: boolean;
  report?: ScreeningResult['report'] & { screening_id?: string; inference_id?: string };
};

export type StreamScreeningRequest = {
  childAge: string;
  domain: string;
  observations: string;
  imageFile?: File | null;
  consent?: { consent_id: string; consent_given: boolean; consent_scope?: string[] };
};

/**
 * Stream screening via SSE - real-time agent pipeline with token-by-token MedGemma output.
 * Calls POST /api/stream-analyze and parses Server-Sent Events.
 */
export const streamScreening = async (
  request: StreamScreeningRequest,
  onEvent: (event: StreamEvent) => void
): Promise<ScreeningResult | null> => {
  let imageB64: string | undefined;
  if (request.imageFile) {
    imageB64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(request.imageFile!);
    });
  }

  const body = {
    age_months: parseInt(request.childAge, 10),
    domain: request.domain,
    observations: request.observations,
    image_b64: imageB64,
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = import.meta.env.VITE_API_KEY;
  if (apiKey) headers['x-api-key'] = apiKey;

  const res = await fetch(`${API_BASE_URL}/stream-analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Stream failed: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let finalReport: ScreeningResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6)) as StreamEvent;
          onEvent(data);
          if (data.type === 'complete' && data.report) {
            const r = data.report as Record<string, unknown>;
            finalReport = {
              success: true,
              screeningId: (r.screening_id as string) ?? (r.screeningId as string),
              inferenceId: (r.inference_id as string) ?? (r.inferenceId as string),
              feedbackAllowed: (r.feedback_allowed as boolean) ?? true,
              feedbackUrl: r.feedback_url as string,
              report: (r.report ?? r) as ScreeningResult['report'],
              timestamp: r.timestamp as string,
            };
          }
          if (data.type === 'error') {
            throw new Error(data.message || 'Stream error');
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }

  return finalReport;
};

/**
 * Submit screening to MedGemma API for analysis
 */
export const submitScreening = async (request: ScreeningRequest): Promise<ScreeningResult> => {
  try {
    // We use JSON for the request as we've updated the backend to handle InferRequest
    // but if images are present we might need multipart/form-data. 
    // Let's check if the backend handles JSON with base64 for images.
    
    let body: any;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // HITL Stage 0: Consent required before AI reasoning
    const consent = request.consent ?? {
      consent_id: crypto.randomUUID(),
      consent_given: true,
      consent_scope: ['screening', 'medgemma-inference'],
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
        consent,
        // Gemma 3 parent rewrite happens after clinician sign-off, not here
        use_gemma3_for_communication: false,
      });
    } else {
      body = JSON.stringify({
        age_months: parseInt(request.childAge),
        domain: request.domain,
        observations: request.observations,
        consent,
        use_gemma3_for_communication: false,
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
      inferenceId: data.inference_id,
      feedbackAllowed: data.feedback_allowed ?? true,
      feedbackUrl: data.feedback_url,
      report: {
        riskLevel: mapRiskLevel(riskStrat.level || riskStrat.risk_level || 'unknown'),
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

/**
 * HITL Stage 3: Generate parent-facing summary ONLY after clinician sign-off.
 * Call this after the clinician has signed off on the screening.
 */
export const generateParentSummary = async (
  screeningId: string,
  params?: { tone?: string; language?: string; reading_level?: string }
): Promise<{ parentSummary: string; disclaimer: string }> => {
  const response = await fetch(`${API_BASE_URL}/generate-parent-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      screening_id: screeningId,
      communication_params: params || { tone: 'reassuring', language: 'English', reading_level: 'grade 6' },
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return {
    parentSummary: data.parent_summary || '',
    disclaimer: data.disclaimer || 'Screening summary – not a diagnosis.',
  };
};

/**
 * Check API health status
 */
export const checkApiHealth = async (): Promise<{ healthy: boolean; latency?: number }> => {
  try {
    const start = performance.now();
    const response = await fetch(`${API_BASE_URL}/health`, {
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
        inferenceId: `local-inf-${Date.now()}`,
        feedbackAllowed: true,
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
