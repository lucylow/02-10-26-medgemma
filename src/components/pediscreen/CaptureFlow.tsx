/**
 * CaptureFlow — unified component that combines:
 *   1. Source picker (Camera vs Gallery)
 *   2. Camera capture or image upload
 *   3. Consent modal
 *   4. Preview with Retake / Use
 *
 * Emits the final image data URL and upload preference to the parent.
 */
import React, { useState } from "react";
import { Camera, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import CameraCapture from "./CameraCapture";
import ImageUploader from "./ImageUploader";
import CapturePreviewStep from "./CapturePreviewStep";
import ImageUploadConsentModal, {
  type UploadPreference,
  hasImageConsentPreference,
  getStoredUploadPreference,
} from "./ImageUploadConsentModal";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type FlowStep = "pick" | "camera" | "upload" | "consent" | "preview";

export interface CaptureFlowResult {
  dataUrl: string;
  preference: UploadPreference;
}

export interface CaptureFlowProps {
  onComplete: (result: CaptureFlowResult) => void;
  onCancel?: () => void;
  className?: string;
}

export default function CaptureFlow({
  onComplete,
  onCancel,
  className,
}: CaptureFlowProps) {
  const [step, setStep] = useState<FlowStep>("pick");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  const handleImageCaptured = (dataUrl: string) => {
    setImageDataUrl(dataUrl);

    // If user already consented previously, skip modal
    if (hasImageConsentPreference()) {
      setStep("preview");
    } else {
      setShowConsent(true);
      setStep("consent");
    }
  };

  const handleConsentDecision = (_pref: UploadPreference) => {
    setShowConsent(false);
    setStep("preview");
  };

  const handleRetake = () => {
    setImageDataUrl(null);
    setStep("pick");
  };

  const handleUseImage = () => {
    if (!imageDataUrl) return;
    onComplete({
      dataUrl: imageDataUrl,
      preference: getStoredUploadPreference(),
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <AnimatePresence mode="wait">
        {step === "pick" && (
          <motion.div
            key="pick"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground text-center">
              Add a photo to support the screening (optional).
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                variant="outline"
                className="gap-2 min-w-[160px] h-20 flex-col rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => setStep("camera")}
              >
                <Camera className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Take Photo</span>
              </Button>
              <Button
                variant="outline"
                className="gap-2 min-w-[160px] h-20 flex-col rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => setStep("upload")}
              >
                <ImageIcon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Upload from Gallery</span>
              </Button>
            </div>
            {onCancel && (
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
                  Skip for now
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {step === "camera" && (
          <motion.div
            key="camera"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <CameraCapture
              onCapture={handleImageCaptured}
              onCancel={() => setStep("pick")}
            />
          </motion.div>
        )}

        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <ImageUploader
              onImageSelected={(dataUrl) => handleImageCaptured(dataUrl)}
              onCancel={() => setStep("pick")}
            />
          </motion.div>
        )}

        {step === "preview" && imageDataUrl && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <CapturePreviewStep
              imagePreview={imageDataUrl}
              useEmbeddingsOnly={getStoredUploadPreference() === "embeddings_only"}
              onRetake={handleRetake}
              onUseImage={handleUseImage}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consent modal */}
      <ImageUploadConsentModal
        open={showConsent}
        onOpenChange={setShowConsent}
        onConsent={handleConsentDecision}
      />
    </div>
  );
}
