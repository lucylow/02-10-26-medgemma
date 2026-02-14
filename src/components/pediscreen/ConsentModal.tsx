/**
 * Parent-facing consent modal — shown before any data collection.
 * Uses exact microcopy for legal consistency; consent stored for audit.
 * Calls POST /api/consent when accepted for backend audit trail.
 */
import React from 'react';
import { postConsent } from '@/api/consentApi';
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

const CONSENT_STORAGE_KEY = 'pediscreen_consent_v1';

export interface ConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsent: (opts: { images: boolean; deidentified: boolean }) => void;
  /** Show extended FAQ paragraph */
  extended?: boolean;
  /** Optional: screening/patient IDs for consent record */
  screeningId?: string;
  patientId?: string;
  /** Optional: API key for consent endpoint */
  apiKey?: string;
}

export function hasStoredConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function storeConsent(): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
  } catch {
    /* ignore */
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
    storeConsent();
    onConsent({ images, deidentified });
    onOpenChange(false);
    // Record consent to backend for audit trail (fire-and-forget)
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
