/**
 * CameraCapture — live camera viewfinder with shutter, flip, and flash-style animation.
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCamera } from "@/hooks/useCamera";
import {
  Camera,
  SwitchCamera,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
  className?: string;
}

export default function CameraCapture({
  onCapture,
  onCancel,
  className,
}: CameraCaptureProps) {
  const { videoRef, isStreaming, isLoading, error, start, stop, toggleFacing, capture } =
    useCamera({ facing: "environment" });
  const [flash, setFlash] = useState(false);

  // Auto-start camera on mount
  React.useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShutter = () => {
    const dataUrl = capture();
    if (!dataUrl) return;
    setFlash(true);
    setTimeout(() => {
      setFlash(false);
      stop();
      onCapture(dataUrl);
    }, 200);
  };

  const handleCancel = () => {
    stop();
    onCancel();
  };

  return (
    <div className={cn("relative flex flex-col items-center gap-4", className)}>
      {/* Viewfinder */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-black aspect-[3/4]">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Flash overlay */}
        <AnimatePresence>
          {flash && (
            <motion.div
              className="absolute inset-0 bg-white z-20"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 z-10 px-6 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-white">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => start()}>
              Retry
            </Button>
          </div>
        )}

        {/* Corner guide marks */}
        {isStreaming && (
          <>
            <span className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/60 rounded-tl-md" />
            <span className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/60 rounded-tr-md" />
            <span className="absolute bottom-20 left-4 w-6 h-6 border-b-2 border-l-2 border-white/60 rounded-bl-md" />
            <span className="absolute bottom-20 right-4 w-6 h-6 border-b-2 border-r-2 border-white/60 rounded-br-md" />
          </>
        )}

        {/* Bottom control bar */}
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-6 py-4 bg-gradient-to-t from-black/70 to-transparent z-10">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 rounded-full h-10 w-10"
            onClick={handleCancel}
            aria-label="Cancel"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Shutter button */}
          <button
            onClick={handleShutter}
            disabled={!isStreaming}
            className="h-16 w-16 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 transition-transform active:scale-90 hover:bg-white/10"
            aria-label="Take photo"
          >
            <div className="h-12 w-12 rounded-full bg-white" />
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 rounded-full h-10 w-10"
            onClick={toggleFacing}
            disabled={!isStreaming}
            aria-label="Switch camera"
          >
            <SwitchCamera className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Position the child clearly in frame. Good lighting helps accuracy.
      </p>
    </div>
  );
}
