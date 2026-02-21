/**
 * Parent-facing consent modal — shown before any data collection.
 * Consent-first: consent required before raw image/audio; consent_id stored and sent with API calls.
 * Uses consentService for single source of truth; calls POST /api/consent for backend audit.
 */
import React from 'react';
import { postConsent } from '@/api/consentApi';
import { getConsent, setConsent, type ConsentScope } from '@/services/consentService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import {
  CONSENT_MODAL_HEADER,
  PARENT_CONSENT_INTRO,
  PARENT_FAQ_PARAGRAPH,
} from '@/constants/disclaimers';

export interface ConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with consent_id and options; include consent_id in upload/infer calls */
  onConsent: (opts: { images: boolean; deidentified: boolean; consent_id: string }) => void;
  /** Show extended FAQ paragraph */
  extended?: boolean;
  /** Optional: screening/patient IDs for consent record */
  screeningId?: string;
  patientId?: string;
  /** Optional: API key for consent endpoint */
  apiKey?: string;
}

/** Sync: whether the user has already granted consent (embeddings_only or raw_image). Used for initial modal visibility. */
export function hasStoredConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('consent_v1');
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { scope?: string };
    return parsed.scope !== 'revoked';
  } catch {
    return false;
  }
}

export default function ConsentModal({
  open,
  onOpenChange,
  onConsent,
  extended = false,
  screeningId,
  patientId,
  apiKey,
}: ConsentModalProps) {
  const [images, setImages] = React.useState(true);
  const [deidentified, setDeidentified] = React.useState(true);

  const handleAccept = async () => {
    const scope: ConsentScope = images ? 'raw_image' : 'embeddings_only';
    const record = await setConsent({
      scope,
      rawImagePurpose: images ? 'screening' : undefined,
      deidentified,
      images,
    });
    onConsent({ images, deidentified, consent_id: record.id });
    onOpenChange(false);
    try {
      await postConsent({
        screeningId,
        patientId,
        consentGiven: true,
        consentScope: { storeData: true, shareWithEHR: false, deidentified, images },
        consentMethod: 'web',
        apiKey,
      });
    } catch {
      /* non-blocking; consent stored locally */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {CONSENT_MODAL_HEADER}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{PARENT_CONSENT_INTRO}</p>
              {extended && <p>{PARENT_FAQ_PARAGRAPH}</p>}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={images}
              onChange={(e) => setImages((e.target as HTMLInputElement).checked)}
              className="rounded border-input"
            />
            <span className="text-sm">
              Images or de-identified data may be retained for improvement (optional)
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={deidentified}
              onChange={(e) => setDeidentified((e.target as HTMLInputElement).checked)}
              className="rounded border-input"
            />
            <span className="text-sm">
              Allow de-identified data to improve PediScreen
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAccept} className="gap-2">
            <Shield className="w-4 h-4" />
            I consent to assist my child&apos;s screening
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
