/**
 * Central demo & mock data for interactive frontend demos.
 * Used by: landing DemoSection, VisualAnalysisDemoSection, Profiles, ChildProfileDetail, ScreeningHistory.
 */

import type { ScreeningResult } from '@/services/screeningApi';

// —— Preset demo cases for landing Interactive Screening Demo ——
export type DemoPresetId = 'language_delay' | 'motor_ontrack' | 'social_monitor' | 'cognitive_typical' | 'custom';

export type DemoPreset = {
  id: DemoPresetId;
  label: string;
  description: string;
  age: string;
  domain: string;
  domainLabel: string;
  observations: string;
  /** Precomputed result for instant demo (no API call) */
  result: ScreeningResult;
};

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'language_delay',
    label: 'Language delay (24 mo)',
    description: 'Limited words, no word combinations',
    age: '24',
    domain: 'communication',
    domainLabel: 'Language & Communication',
    observations: "My 2-year-old says only about 10 words and doesn't seem to combine them. He points to things he wants but doesn't use words. He understands simple instructions like \"come here\" or \"give me the ball.\"",
    result: {
      success: true,
      screeningId: 'demo_lang_24_1',
      inferenceId: 'demo_inf_lang_1',
      feedbackAllowed: true,
      localProcessing: true,
      confidence: 0.82,
      report: {
        riskLevel: 'monitor',
        riskRationale: 'Expressive vocabulary below typical 50+ words at 24 months; word combinations not yet observed.',
        summary: 'The reported language development for a 24-month-old shows potential delays. Receptive language (understanding) appears within expected range; expressive vocabulary is below the typical 50+ words expected at this age.',
        keyFindings: [
          'Vocabulary size (~10 words, expected: 50+ at 24 months)',
          'Word combinations not yet observed (expected: emerging at 18–24 months)',
          'Following simple instructions: yes',
          'Pointing to communicate: yes',
        ],
        recommendations: [
          'Formal screening: Complete ASQ-3 or M-CHAT-R for comprehensive assessment.',
          'Language-rich environment: Increase interactive reading and narrate daily activities.',
          'Professional consultation: Schedule evaluation within 1–2 months.',
          'Follow-up: Rescreen in 4–6 weeks to monitor progress.',
        ],
        parentFriendlyTips: ['Read together daily 15–20 min', 'Narrate daily activities', 'Use gestures + words together'],
        developmentalProfile: {
          strengths: ['Understands simple instructions', 'Uses pointing to communicate'],
          concerns: ['Limited expressive vocabulary', 'No two-word combinations yet'],
          milestonesMet: ['Points to communicate', 'Follows one-step directions'],
          milestonesEmerging: ['Expressive vocabulary'],
          milestonesNotObserved: ['Two-word combinations'],
        },
        supportingEvidence: {
          fromParentReport: ['~10 words reported', 'No word combinations'],
          fromAssessmentScores: [],
          fromVisualAnalysis: [],
        },
        referralGuidance: { needed: false, specialties: [], urgency: 'routine', reason: '' },
        followUp: { rescreenIntervalDays: 42, monitoringFocus: ['Communication'], redFlagsToWatch: ['Regression in words'] },
      },
    },
  },
  {
    id: 'motor_ontrack',
    label: 'Motor on track (18 mo)',
    description: 'Walking, stacking blocks, scribbling',
    age: '18',
    domain: 'gross_motor',
    domainLabel: 'Gross Motor Skills',
    observations: 'She started walking at 14 months. She can stack 3–4 blocks, scribble with a crayon, and climb onto the sofa. She sometimes runs and loves kicking a ball.',
    result: {
      success: true,
      screeningId: 'demo_motor_18_1',
      inferenceId: 'demo_inf_motor_1',
      feedbackAllowed: true,
      localProcessing: true,
      confidence: 0.91,
      report: {
        riskLevel: 'on_track',
        riskRationale: 'Gross and fine motor milestones are within expected range for 18 months.',
        summary: 'Motor development appears typical for an 18-month-old. Walking, block stacking, scribbling, and climbing are all age-appropriate.',
        keyFindings: [
          'Walking established (started at 14 months)',
          'Stacks 3–4 blocks',
          'Scribbles with crayon',
          'Climbing and kicking ball observed',
        ],
        recommendations: [
          'Continue monitoring: Track milestones using CDC "Learn the Signs. Act Early."',
          'Engage in play: Provide age-appropriate activities for motor and coordination.',
          'Routine check-ups: Continue regular well-child visits.',
        ],
        parentFriendlyTips: ['Safe climbing spaces', 'Ball play outdoors', 'Crayons and paper for scribbling'],
        developmentalProfile: {
          strengths: ['Walking', 'Block stacking', 'Scribbling', 'Climbing'],
          concerns: [],
          milestonesMet: ['Walks independently', 'Stacks blocks', 'Scribbles'],
          milestonesEmerging: ['Running', 'Kicking'],
          milestonesNotObserved: [],
        },
        supportingEvidence: {
          fromParentReport: ['Walking at 14 mo', 'Block stacking and scribbling'],
          fromAssessmentScores: [],
          fromVisualAnalysis: [],
        },
        referralGuidance: { needed: false, specialties: [], urgency: 'routine', reason: '' },
        followUp: { rescreenIntervalDays: 90, monitoringFocus: ['Motor'], redFlagsToWatch: [] },
      },
    },
  },
  {
    id: 'social_monitor',
    label: 'Social-emotional (36 mo)',
    description: 'Some shyness, limited peer play',
    age: '36',
    domain: 'social',
    domainLabel: 'Personal-Social',
    observations: "He's very shy with new people and doesn't join other kids at the park. At home he plays pretend with us and shows affection. He has occasional tantrums but calms with reassurance.",
    result: {
      success: true,
      screeningId: 'demo_social_36_1',
      inferenceId: 'demo_inf_social_1',
      feedbackAllowed: true,
      localProcessing: true,
      confidence: 0.76,
      report: {
        riskLevel: 'monitor',
        riskRationale: 'Limited peer interaction in unfamiliar settings; home-based social play and attachment appear positive.',
        summary: 'Social-emotional development shows strengths at home (pretend play, affection). Shyness and limited peer play in new settings may benefit from gentle exposure and monitoring.',
        keyFindings: [
          'Plays pretend and shows affection at home',
          'Shy with new people and limited peer play at park',
          'Tantrums with ability to calm with reassurance',
        ],
        recommendations: [
          'Complete ASQ:SE-2 for social-emotional screening.',
          'Gradual exposure: Short, low-pressure playdates or small groups.',
          'Discuss with pediatrician at next visit if concerns persist.',
        ],
        parentFriendlyTips: ['Practice greetings and turn-taking at home', 'Small playgroups before big parks'],
        developmentalProfile: {
          strengths: ['Pretend play', 'Shows affection', 'Calms with reassurance'],
          concerns: ['Shyness in new settings', 'Limited peer interaction'],
          milestonesMet: ['Pretend play', 'Attachment to caregivers'],
          milestonesEmerging: ['Peer play'],
          milestonesNotObserved: [],
        },
        supportingEvidence: {
          fromParentReport: ['Shy with strangers', 'Plays at home', 'Tantrums and calming'],
          fromAssessmentScores: [],
          fromVisualAnalysis: [],
        },
        referralGuidance: { needed: false, specialties: [], urgency: 'routine', reason: '' },
        followUp: { rescreenIntervalDays: 60, monitoringFocus: ['Social-emotional'], redFlagsToWatch: ['Withdrawal from previously enjoyed activities'] },
      },
    },
  },
  {
    id: 'cognitive_typical',
    label: 'Problem-solving (48 mo)',
    description: 'Counts, puzzles, follows rules',
    age: '48',
    domain: 'cognitive',
    domainLabel: 'Problem Solving',
    observations: 'She counts to 10, does 12-piece puzzles, and follows simple game rules. She asks "why" a lot and remembers stories we read. She can name a few colors and shapes.',
    result: {
      success: true,
      screeningId: 'demo_cog_48_1',
      inferenceId: 'demo_inf_cog_1',
      feedbackAllowed: true,
      localProcessing: true,
      confidence: 0.89,
      report: {
        riskLevel: 'on_track',
        riskRationale: 'Cognitive and problem-solving skills are within expected range for 4 years.',
        summary: 'Cognitive development appears typical: counting, puzzles, rule-following, curiosity, and memory are age-appropriate.',
        keyFindings: [
          'Counts to 10',
          'Completes 12-piece puzzles',
          'Follows simple game rules',
          'Asks "why" and remembers stories',
          'Names some colors and shapes',
        ],
        recommendations: [
          'Continue routine monitoring per AAP schedule.',
          'Encourage curiosity with books and simple experiments.',
        ],
        parentFriendlyTips: ['Board games with rules', 'Puzzles and building sets', 'Answer "why" questions simply'],
        developmentalProfile: {
          strengths: ['Counting', 'Puzzles', 'Rule-following', 'Memory', 'Curiosity'],
          concerns: [],
          milestonesMet: ['Counts to 10', 'Puzzles', 'Follows rules', 'Names colors/shapes'],
          milestonesEmerging: [],
          milestonesNotObserved: [],
        },
        supportingEvidence: {
          fromParentReport: ['Counts, puzzles, rules, stories, colors/shapes'],
          fromAssessmentScores: [],
          fromVisualAnalysis: [],
        },
        referralGuidance: { needed: false, specialties: [], urgency: 'routine', reason: '' },
        followUp: { rescreenIntervalDays: 180, monitoringFocus: ['Cognitive'], redFlagsToWatch: [] },
      },
    },
  },
];

// —— Mock child profiles (Profiles list & ChildProfileDetail) ——
export type MockChildProfile = {
  id: string;
  name: string;
  age: string;
  birthDate: string;
  lastScreening: string;
  status: string;
  progress: number;
  initials: string;
  color: string;
  /** Optional: link to a demo preset for "New Screening" from profile */
  lastDomain?: string;
};

export const MOCK_CHILD_PROFILES: MockChildProfile[] = [
  {
    id: '1',
    name: 'Maya Johnson',
    age: '18 months',
    birthDate: 'August 12, 2024',
    lastScreening: 'Jan 15, 2026',
    status: 'On track',
    progress: 85,
    initials: 'MJ',
    color: 'bg-blue-100 text-blue-600',
    lastDomain: 'communication',
  },
  {
    id: '2',
    name: 'Leo Smith',
    age: '36 months',
    birthDate: 'Feb 5, 2023',
    lastScreening: 'Dec 10, 2025',
    status: 'Needs follow-up',
    progress: 60,
    initials: 'LS',
    color: 'bg-amber-100 text-amber-600',
    lastDomain: 'social',
  },
  {
    id: '3',
    name: 'Aria Chen',
    age: '24 months',
    birthDate: 'Nov 20, 2024',
    lastScreening: 'Feb 1, 2026',
    status: 'On track',
    progress: 78,
    initials: 'AC',
    color: 'bg-emerald-100 text-emerald-600',
    lastDomain: 'gross_motor',
  },
];

export const MOCK_CHILDREN_BY_ID: Record<string, MockChildProfile> = Object.fromEntries(
  MOCK_CHILD_PROFILES.map((c) => [c.id, c])
);

// —— Mock screening history entries ——
export type MockScreeningHistoryEntry = {
  id: string;
  childId: string;
  childName: string;
  date: string;
  domain: string;
  domainLabel: string;
  riskLevel: string;
  summary: string;
  screeningId?: string;
};

export const MOCK_SCREENING_HISTORY: MockScreeningHistoryEntry[] = [
  { id: 'h1', childId: '1', childName: 'Maya Johnson', date: 'Jan 15, 2026', domain: 'communication', domainLabel: 'Communication & Language', riskLevel: 'On track', summary: 'Language milestones within expected range.', screeningId: 'demo_lang_18_1' },
  { id: 'h2', childId: '2', childName: 'Leo Smith', date: 'Dec 10, 2025', domain: 'social', domainLabel: 'Personal-Social', riskLevel: 'Monitor', summary: 'Some shyness; peer play emerging.', screeningId: 'demo_social_36_1' },
  { id: 'h3', childId: '1', childName: 'Maya Johnson', date: 'Oct 1, 2025', domain: 'gross_motor', domainLabel: 'Gross Motor', riskLevel: 'On track', summary: 'Walking and climbing on track.', screeningId: 'demo_motor_15_1' },
  { id: 'h4', childId: '3', childName: 'Aria Chen', date: 'Feb 1, 2026', domain: 'gross_motor', domainLabel: 'Gross Motor', riskLevel: 'On track', summary: 'Running, kicking ball, stacking blocks.', screeningId: 'demo_motor_24_1' },
];

// —— Visual analysis demo: sample images with mock MedGemma findings ——
export type MockVisualSample = {
  id: string;
  label: string;
  description: string;
  /** Placeholder: "block_tower" | "drawing" | "play_activity" — no real image in demo */
  imageType: string;
  findings: string[];
  riskLevel: 'on_track' | 'monitor' | 'refer';
  confidence: number;
  recommendation: string;
};

export const MOCK_VISUAL_SAMPLES: MockVisualSample[] = [
  {
    id: 'blocks',
    label: 'Block tower (4 blocks)',
    description: 'Child-built tower, 4 blocks',
    imageType: 'block_tower',
    findings: ['Tower of 4 blocks — age-appropriate for 18–24 mo', 'Hand preference observed', 'Sustained attention during build'],
    riskLevel: 'on_track',
    confidence: 0.88,
    recommendation: 'Continue block play; introduce patterns and counting.',
  },
  {
    id: 'drawing',
    label: 'Scribble drawing',
    description: 'Crayon scribbles on paper',
    imageType: 'drawing',
    findings: ['Circular and linear scribbles', 'Palmar grasp; emerging finger control', 'Multiple colors used'],
    riskLevel: 'on_track',
    confidence: 0.85,
    recommendation: 'Offer varied drawing tools; practice tripod grasp with chunky crayons.',
  },
  {
    id: 'play',
    label: 'Pretend play (tea party)',
    description: 'Child with dolls and toy cups',
    imageType: 'play_activity',
    findings: ['Pretend feeding and serving', 'Sequencing of play actions', 'Social script imitation'],
    riskLevel: 'on_track',
    confidence: 0.9,
    recommendation: 'Encourage narrative play and turn-taking with peers.',
  },
];

// —— CHW workflow demo steps ——
export type CHWWorkflowStep = {
  id: number;
  title: string;
  description: string;
  actionLabel?: string;
  completed?: boolean;
};

export const CHW_WORKFLOW_STEPS: CHWWorkflowStep[] = [
  { id: 1, title: 'Enter community / select household', description: 'CHW opens PediScreen on tablet or phone. Selects household or adds new family.' },
  { id: 2, title: 'Select or add child', description: 'Choose existing child profile or add new with basic info (name, DOB, caregiver consent).' },
  { id: 3, title: 'Run screening', description: 'Enter parent observations and optional photo. Submit for MedGemma analysis. Works offline — results sync when online.' },
  { id: 4, title: 'Review results with family', description: 'Share risk level and recommendations in plain language. Schedule follow-up or referral as needed.' },
  { id: 5, title: 'Sync when connected', description: 'Data syncs to clinic dashboard when CHW has connectivity. No data loss in low-connectivity settings.' },
];
