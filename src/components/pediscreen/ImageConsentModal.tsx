/**
 * Consent modal for image upload — shown before raw image upload.
 * Exact microcopy per spec. User can choose embeddings-only (recommended) or raw upload.
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

const TITLE = "Consent to upload images";
const BODY =
  "By uploading images you consent to share this data with your care team. You may opt to only send embeddings (recommended).";

export type ImageConsentChoice = "embeddings_only" | "raw_upload";

export interface ImageConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoice: (choice: ImageConsentChoice) => void;
}

const STORAGE_KEY = "pediscreen_image_consent_v1";

export function getStoredImageConsent(): ImageConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "embeddings_only" || v === "raw_upload") return v;
    return null;
  } catch {
    return null;
  }
}

export function storeImageConsent(choice: ImageConsentChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* ignore */
  }
}

export default function ImageConsentModal({
  open,
  onOpenChange,
  onChoice,
}: ImageConsentModalProps) {
  const handleEmbeddingsOnly = () => {
    storeImageConsent("embeddings_only");
    onChoice("embeddings_only");
    onOpenChange(false);
  };

  const handleRawUpload = () => {
    storeImageConsent("raw_upload");
    onChoice("raw_upload");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {TITLE}
          </DialogTitle>
          <DialogDescription asChild>
            <p className="text-sm text-muted-foreground">{BODY}</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleEmbeddingsOnly}
            className="flex-1"
          >
            Use embeddings only (recommended)
          </Button>
          <Button onClick={handleRawUpload} className="flex-1">
            Upload raw image (consent)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
