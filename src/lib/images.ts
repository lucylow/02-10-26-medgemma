/**
 * Medical asset pipeline — dynamic image loader and canonical paths for
 * ROP, ASQ-3, CHW field photos, growth charts, and UI assets.
 * Assets live under public/images/medical/ (see REPO_STRUCTURE).
 */

const MEDICAL_BASE = "/images/medical";

/**
 * Build a medical image URL with optional width/quality (for future CDN/optimization).
 * For now returns static path; can add ?w= & q= when using image service.
 */
export function medicalImage(path: string, width = 400): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${MEDICAL_BASE}/${normalized}`;
}

/** ROP (Retinopathy of Prematurity) — zones 1–3, stages normal + 1–5 */
export const ROP_IMAGES: Record<string, string> = {};
const ROP_ZONES = ["zone1", "zone2", "zone3"] as const;
const ROP_STAGES = ["normal", "stage1", "stage2", "stage3", "stage4", "stage5"] as const;
for (const zone of ROP_ZONES) {
  for (const stage of ROP_STAGES) {
    ROP_IMAGES[`${zone}_${stage}`] = medicalImage(`rop/${zone}/${stage}.png`);
  }
}

/** Convenience getters for common ROP views */
export function getROPImage(zone: "zone1" | "zone2" | "zone3", stage: string): string {
  const key = `${zone}_${stage}`;
  return ROP_IMAGES[key] ?? medicalImage(`rop/${zone}/${stage}.png`);
}

/** ASQ-3 milestones — communication, motor, etc. by age (0–60mo) */
export const ASQ3_MILESTONES: Record<string, string> = {};
const ASQ_DOMAINS = ["communication", "motor", "cognitive", "adaptive", "social-emotional"] as const;
const ASQ_AGES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 27, 30, 33, 36, 42, 48, 54, 60] as const;
for (const domain of ASQ_DOMAINS) {
  for (const age of ASQ_AGES) {
    ASQ3_MILESTONES[`${domain}_${age}mo`] = medicalImage(`asq3/${domain}/${age}mo.svg`);
  }
}

/** CHW field photography (global) */
export const CHW_IMAGES = {
  field_india: medicalImage("chw/field-india.jpg"),
  field_africa: medicalImage("chw/field-africa.jpg"),
  field_latin: medicalImage("chw/field-latin.jpg"),
} as const;

/** Growth chart templates (WHO standards) */
export const GROWTH_CHARTS = {
  who_height: medicalImage("growthcharts/who-standards-height.svg"),
  who_weight: medicalImage("growthcharts/who-standards-weight.svg"),
} as const;

/** UI assets (loading, gradients) */
export const UI_IMAGES = {
  loading_pulse: medicalImage("ui/loading-pulse.gif"),
  risk_gradients: medicalImage("ui/risk-gradients.png"),
  medical_pattern: medicalImage("ui/medical-pattern.png"),
} as const;
