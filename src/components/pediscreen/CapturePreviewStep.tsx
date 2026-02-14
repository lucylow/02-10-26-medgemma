/**
 * Preview step after capture — Retake or Use Image.
 * Page 7: Show centered preview with Retake (left) and Use Image (right).
 * If embeddings-only: show "Will be processed to create an embedding locally".
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CapturePreviewStepProps {
  imagePreview: string;
  useEmbeddingsOnly?: boolean;
  onRetake: () => void;
  onUseImage: () => void;
  className?: string;
}

export default function CapturePreviewStep({
  imagePreview,
  useEmbeddingsOnly = true,
  onRetake,
  onUseImage,
  className,
}: CapturePreviewStepProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative flex justify-center">
        <img
          src={imagePreview}
          alt="Captured image preview"
          className="max-h-[320px] rounded-xl object-contain border border-border shadow-md"
        />
      </div>

      {useEmbeddingsOnly && (
        <p className="text-xs text-muted-foreground text-center px-2">
          Will be processed to create an embedding locally.
        </p>
      )}

      <p className="text-sm text-muted-foreground text-center">
        If your photo is dark or blurry, retake for better results.
      </p>

      <div className="flex gap-3 justify-center flex-wrap">
        <Button
          type="button"
          variant="outline"
          className="gap-2 min-w-[140px]"
          onClick={onRetake}
          aria-label="Retake photo"
        >
          <RotateCcw className="w-4 h-4" />
          Retake
        </Button>
        <Button
          type="button"
          className="gap-2 min-w-[140px]"
          onClick={onUseImage}
          aria-label="Use this image"
        >
          <Check className="w-4 h-4" />
          Use Image
        </Button>
      </div>
    </div>
  );
}
