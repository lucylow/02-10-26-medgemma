/**
 * useCamera — manages a getUserMedia video stream with front/back toggle,
 * snapshot capture, and automatic cleanup.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type CameraFacing = "user" | "environment";

export interface UseCameraOptions {
  /** Initial facing mode */
  facing?: CameraFacing;
  /** Preferred resolution width */
  width?: number;
  /** Preferred resolution height */
  height?: number;
}

export interface UseCameraReturn {
  /** Ref to attach to a <video> element */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Whether the stream is active */
  isStreaming: boolean;
  /** Whether the camera is loading */
  isLoading: boolean;
  /** Error message if camera access fails */
  error: string | null;
  /** Current facing mode */
  facing: CameraFacing;
  /** Start the camera stream */
  start: () => Promise<void>;
  /** Stop the camera stream */
  stop: () => void;
  /** Toggle between front and back cameras */
  toggleFacing: () => void;
  /** Capture a snapshot and return a data URL (JPEG) */
  capture: (quality?: number) => string | null;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const {
    facing: initialFacing = "environment",
    width = 1280,
    height = 960,
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraFacing>(initialFacing);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    async (facingMode: CameraFacing = facing) => {
      setError(null);
      setIsLoading(true);
      stopStream();

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: width },
            height: { ideal: height },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setIsStreaming(true);
      } catch (err: unknown) {
        const msg =
          err instanceof DOMException
            ? err.name === "NotAllowedError"
              ? "Camera permission denied. Please allow camera access in your browser settings."
              : err.name === "NotFoundError"
                ? "No camera found on this device."
                : `Camera error: ${err.message}`
            : "Failed to access camera.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [facing, width, height, stopStream],
  );

  const toggleFacing = useCallback(() => {
    const next: CameraFacing = facing === "user" ? "environment" : "user";
    setFacing(next);
    if (isStreaming) {
      startStream(next);
    }
  }, [facing, isStreaming, startStream]);

  const capture = useCallback(
    (quality = 0.92): string | null => {
      const video = videoRef.current;
      if (!video || !isStreaming) return null;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL("image/jpeg", quality);
    },
    [isStreaming],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    videoRef,
    isStreaming,
    isLoading,
    error,
    facing,
    start: () => startStream(facing),
    stop: stopStream,
    toggleFacing,
    capture,
  };
}
