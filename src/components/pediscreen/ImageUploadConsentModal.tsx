/**
 * Consent to upload images — shown before raw image capture.
 * Default: embeddings-only (recommended). Raw image requires explicit consent.
 * Exact copy per UI/UX roadmap Page 6.
 */
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export type UploadPreference = "embeddings_only" | "raw_image";

const STORAGE_KEY = "pediscreen_image_consent_v1";

export function getStoredUploadPreference(): UploadPreference {
  if (typeof window === "undefined") return "embeddings_only";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "raw_image" ? "raw_image" : "embeddings_only";
  } catch {
    return "embeddings_only";
  }
}

export function hasImageConsentPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function storeUploadPreference(pref: UploadPreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
}

export interface ImageUploadConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsent: (preference: UploadPreference) => void;
}

export default function ImageUploadConsentModal({
  open,
  onOpenChange,
  onConsent,
}: ImageUploadConsentModalProps) {
  const handleEmbeddingsOnly = () => {
    storeUploadPreference("embeddings_only");
    onConsent("embeddings_only");
    onOpenChange(false);
  };

  const handleRawImage = () => {
    storeUploadPreference("raw_image");
    onConsent("raw_image");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        aria-describedby="image-consent-description"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Consent to upload images
          </DialogTitle>
          <DialogDescription id="image-consent-description" asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                To help with accurate screening, you can upload images. We recommend sending
                embeddings only (recommended) — this keeps images private and reduces transfer.
                To share raw images, you must explicitly consent. You can change this in Settings.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            aria-label="Cancel and close"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto border-primary text-primary"
            onClick={handleEmbeddingsOnly}
            aria-label="Use embeddings only (recommended)"
          >
            Use embeddings only (recommended)
          </Button>
          <Button
            className="w-full sm:w-auto gap-2"
            onClick={handleRawImage}
            aria-label="Upload raw image (consent)"
          >
            <Shield className="w-4 h-4" />
            Upload raw image (consent)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
