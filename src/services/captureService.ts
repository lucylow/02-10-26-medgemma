/**
 * Capture service — embeddings-first default (Page 3).
 * consent_raw_image defaults to false; raw image upload requires explicit consent.
 */

/** Default: do NOT send raw images unless user explicitly consents */
export const CONSENT_RAW_IMAGE_DEFAULT = false;

/** User preference (can be changed in settings — must be explicit) */
export interface CaptureDefaults {
  consent_raw_image: boolean;
}

/** Default capture settings — privacy-by-design */
export const defaultCaptureDefaults: CaptureDefaults = {
  consent_raw_image: CONSENT_RAW_IMAGE_DEFAULT,
};

/** Get user's capture defaults (from settings/localStorage) */
export function getCaptureDefaults(): CaptureDefaults {
  try {
    const stored = localStorage.getItem("pediscreen_capture_defaults");
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<CaptureDefaults>;
      return { ...defaultCaptureDefaults, ...parsed };
    }
  } catch {
    // ignore
  }
  return defaultCaptureDefaults;
}

/** Persist user's capture defaults (e.g. after explicit settings change) */
export function setCaptureDefaults(defaults: Partial<CaptureDefaults>): void {
  const current = getCaptureDefaults();
  const next = { ...current, ...defaults };
  localStorage.setItem("pediscreen_capture_defaults", JSON.stringify(next));
}
