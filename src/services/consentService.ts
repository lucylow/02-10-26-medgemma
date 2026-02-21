/**
 * Consent service — store consent choices and consent_id for audit.
 * Consent must be explicit before any raw image/audio leaves device.
 * Default: embeddings-only (privacy-first).
 */

const CONSENT_KEY = "consent_v1";

export type ConsentScope = "embeddings_only" | "raw_image" | "revoked";

export interface ConsentRecord {
  id: string;
  scope: ConsentScope;
  /** Allow raw images for a specific purpose (e.g. "screening") */
  rawImagePurpose?: string;
  /** Allow de-identified data for improvement */
  deidentified?: boolean;
  /** Allow images to be retained */
  images?: boolean;
  grantedAt: number;
}

function getStore(): Storage {
  if (typeof window === "undefined") throw new Error("consentService requires browser");
  return localStorage;
}

/**
 * Get stored consent if any. Returns null when no consent has been granted.
 */
export async function getConsent(): Promise<ConsentRecord | null> {
  try {
    const raw = getStore().getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    return parsed.grantedAt ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Set consent and persist. Generates consent_id and returns the record.
 * Call after user explicitly accepts; include consent_id in API calls (infer, upload).
 */
export async function setConsent(opts: {
  scope?: ConsentScope;
  rawImagePurpose?: string;
  deidentified?: boolean;
  images?: boolean;
}): Promise<ConsentRecord> {
  const id = `consent_${Date.now()}`;
  const record: ConsentRecord = {
    id,
    scope: opts.scope ?? "embeddings_only",
    rawImagePurpose: opts.rawImagePurpose,
    deidentified: opts.deidentified ?? true,
    images: opts.images ?? false,
    grantedAt: Date.now(),
  };
  getStore().setItem(CONSENT_KEY, JSON.stringify(record));
  return record;
}

/**
 * Revoke consent (set scope to revoked).
 */
export async function revokeConsent(): Promise<ConsentRecord> {
  return setConsent({ scope: "revoked" });
}

/**
 * Sync helper: whether we have any stored consent (including revoked).
 */
export function hasStoredConsentSync(): boolean {
  try {
    return !!getStore().getItem(CONSENT_KEY);
  } catch {
    return false;
  }
}
