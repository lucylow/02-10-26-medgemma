/**
 * ImageUploader — drag-and-drop + file picker for uploading photos from gallery.
 * Validates file type/size and shows a thumbnail preview on selection.
 */
import React, { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudUpload, ImageIcon, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export interface ImageUploaderProps {
  onImageSelected: (dataUrl: string, file: File) => void;
  onCancel: () => void;
  className?: string;
}

export default function ImageUploader({
  onImageSelected,
  onCancel,
  className,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const processFile = useCallback((f: File) => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Please select a JPEG, PNG, or WebP image.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("Image must be smaller than 10 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setFile(f);
    };
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) processFile(f);
    },
    [processFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) processFile(f);
    },
    [processFile],
  );

  const handleUse = () => {
    if (preview && file) {
      onImageSelected(preview, file);
    }
  };

  const handleClearPreview = () => {
    setPreview(null);
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-4", className)}>
      {!preview ? (
        <div
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-colors cursor-pointer",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:border-primary/50",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          aria-label="Upload an image"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <CloudUpload className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground font-medium">
            Drop an image here or tap to browse
          </p>
          <p className="text-xs text-muted-foreground/70">
            JPEG, PNG, or WebP · Max 10 MB
          </p>
        </div>
      ) : (
        <div className="relative flex justify-center">
          <img
            src={preview}
            alt="Selected image preview"
            className="max-h-[320px] rounded-xl object-contain border border-border shadow-md"
          />
          <button
            onClick={handleClearPreview}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onCancel} className="min-w-[120px]">
          Cancel
        </Button>
        {preview && (
          <Button onClick={handleUse} className="min-w-[120px] gap-2">
            <ImageIcon className="h-4 w-4" />
            Use this image
          </Button>
        )}
      </div>
    </div>
  );
}
